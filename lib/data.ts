import { formatEther, parseAbiItem, type Address } from "viem";
import { DEMO, FACTORIES, FACTORY, POINTS, TOTAL_SUPPLY, CURVE_SUPPLY, isGenesisFactory, publicClient, type FactoryInfo } from "./config";
import { factoryAbi } from "./abi";

export type Meta = { description?: string; image?: string; website?: string; x?: string; telegram?: string };

export type Coin = {
  address: Address;
  factory: Address; // the Genesis contract this coin trades on
  version: 1 | 2; // 1 = first testnet contract (no holder rewards)
  name: string;
  symbol: string;
  meta: Meta;
  creator: Address;
  feeRecipient: Address;
  totalFeeBps: number;
  burnBps: number;
  holderBps: number;
  createdAt: number; // unix seconds
  graduated: boolean;
  vEth: number;
  vTokens: number;
  realEth: number;
  tokensSold: number;
  price: number; // ETH per token
  startPrice: number; // launch price
  marketCap: number; // ETH
  progress: number; // 0..1
  volume: number; // ETH
  trades: number;
  lastTradeAt: number;
};

export type Trade = {
  token: Address;
  trader: Address;
  isBuy: boolean;
  eth: number;
  tokens: number;
  fee: number;
  price: number;
  time: number;
  tx: string;
};

export type Snapshot = { coins: Coin[]; trades: Trade[]; latestBlock: number; source?: "indexer" | "chain" | "demo" };

const createdEvent = parseAbiItem(
  "event TokenCreated(address indexed token, address indexed creator, string name, string symbol, string metadata, uint16 totalFeeBps, address feeRecipient, uint16 burnBps, uint16 holderBps)"
);
const createdEventV1 = parseAbiItem(
  "event TokenCreated(address indexed token, address indexed creator, string name, string symbol, string metadata, uint16 totalFeeBps, address feeRecipient, uint16 burnBps)"
);
const tradeEvent = parseAbiItem(
  "event Trade(address indexed token, address indexed trader, bool isBuy, uint256 ethAmount, uint256 tokenAmount, uint256 fee, uint256 vEth, uint256 vTokens, uint256 realEth)"
);
const gradEvent = parseAbiItem("event Graduated(address indexed token, uint256 ethLiquidity, uint256 tokenLiquidity)");

const n = (v: bigint) => Number(formatEther(v));

export function parseMeta(s: string): Meta {
  try {
    const m = JSON.parse(s);
    return typeof m === "object" && m ? m : {};
  } catch {
    return {};
  }
}

async function getLogsChunked<T>(fetcher: (from: bigint, to: bigint) => Promise<T[]>, from: bigint, to: bigint) {
  const out: T[] = [];
  const step = 45_000n;
  for (let start = from; start <= to; start += step) {
    const end = start + step - 1n > to ? to : start + step - 1n;
    out.push(...(await fetcher(start, end)));
  }
  return out;
}

// ----------------------------------------------------------- raw events
// Raw, JSON-safe event records (wei amounts as decimal strings). The server indexer stores these
// and merges new blocks in; the browser can also build them directly from the chain as a fallback.

export type RawCreated = {
  factory: Address; version: 1 | 2; block: number; token: Address; creator: Address; name: string; symbol: string;
  metadata: string; totalFeeBps: number; feeRecipient: Address; burnBps: number; holderBps: number;
};
export type RawTrade = {
  factory: Address; block: number; logIndex: number; tx: string; token: Address; trader: Address; isBuy: boolean;
  eth: string; tokens: string; fee: string; vEth: string; vTokens: string; realEth: string;
};
export type RawState = {
  created: RawCreated[];
  trades: RawTrade[];
  graduated: string[]; // token addresses (lowercase)
  initV: Record<string, { vEth: string; vTokens: string }>; // per factory (lowercase)
  scanned: Record<string, number>; // last scanned block per factory (lowercase)
  latestBlock: number;
  latestTimestamp: number;
};

export const emptyRaw = (): RawState => ({ created: [], trades: [], graduated: [], initV: {}, scanned: {}, latestBlock: 0, latestTimestamp: 0 });

/** Fetch one contract's events between two blocks. */
export async function fetchRaw(f: FactoryInfo, from: bigint, to: bigint) {
  const factory = f.address;
  if (from > to) return { created: [] as RawCreated[], trades: [] as RawTrade[], graduated: [] as string[] };
  const createdP =
    f.version === 2
      ? getLogsChunked((a, b) => publicClient.getLogs({ address: factory, event: createdEvent, fromBlock: a, toBlock: b }), from, to)
      : getLogsChunked((a, b) => publicClient.getLogs({ address: factory, event: createdEventV1, fromBlock: a, toBlock: b }), from, to);
  const [created, trades, grads] = await Promise.all([
    createdP,
    getLogsChunked((a, b) => publicClient.getLogs({ address: factory, event: tradeEvent, fromBlock: a, toBlock: b }), from, to),
    getLogsChunked((a, b) => publicClient.getLogs({ address: factory, event: gradEvent, fromBlock: a, toBlock: b }), from, to),
  ]);
  return {
    created: created.map((l): RawCreated => {
      const a = l.args as Record<string, unknown>;
      return {
        factory, version: f.version, block: Number(l.blockNumber), token: a.token as Address, creator: a.creator as Address,
        name: a.name as string, symbol: a.symbol as string, metadata: a.metadata as string, totalFeeBps: Number(a.totalFeeBps),
        feeRecipient: a.feeRecipient as Address, burnBps: Number(a.burnBps), holderBps: f.version === 2 ? Number(a.holderBps ?? 0) : 0,
      };
    }),
    trades: trades.map((l): RawTrade => ({
      factory, block: Number(l.blockNumber), logIndex: l.logIndex, tx: l.transactionHash, token: l.args.token!, trader: l.args.trader!,
      isBuy: l.args.isBuy!, eth: l.args.ethAmount!.toString(), tokens: l.args.tokenAmount!.toString(), fee: l.args.fee!.toString(),
      vEth: l.args.vEth!.toString(), vTokens: l.args.vTokens!.toString(), realEth: l.args.realEth!.toString(),
    })),
    graduated: grads.map((g) => g.args.token!.toLowerCase()),
  };
}

/** Bring a raw state up to the latest block (incremental). Returns true if anything changed. */
export async function refreshRaw(state: RawState): Promise<boolean> {
  const latest = await publicClient.getBlock();
  const to = latest.number;
  let changed = false;
  for (const f of FACTORIES) {
    const key = f.address.toLowerCase();
    if (!state.initV[key]) {
      const [ve, vt] = await Promise.all([
        publicClient.readContract({ address: f.address, abi: factoryAbi, functionName: "virtualEth" }),
        publicClient.readContract({ address: f.address, abi: factoryAbi, functionName: "virtualTokens" }),
      ]);
      state.initV[key] = { vEth: ve.toString(), vTokens: vt.toString() };
      changed = true;
    }
    const from = state.scanned[key] !== undefined ? BigInt(state.scanned[key] + 1) : f.startBlock;
    const part = await fetchRaw(f, from, to);
    if (part.created.length || part.trades.length || part.graduated.length) changed = true;
    const seenC = new Set(state.created.map((c) => c.token.toLowerCase()));
    for (const c of part.created) if (!seenC.has(c.token.toLowerCase())) state.created.push(c);
    const seenT = new Set(state.trades.map((t) => `${t.tx}:${t.logIndex}`));
    for (const t of part.trades) if (!seenT.has(`${t.tx}:${t.logIndex}`)) state.trades.push(t);
    for (const g of part.graduated) if (!state.graduated.includes(g)) state.graduated.push(g);
    state.scanned[key] = Number(to);
  }
  state.trades.sort((a, b) => a.block - b.block || a.logIndex - b.logIndex);
  state.latestBlock = Number(to);
  state.latestTimestamp = Number(latest.timestamp);
  return changed;
}

const w = (v: string) => Number(formatEther(BigInt(v)));

/** Turn raw events into the coins + trades the UI shows. */
export function buildSnapshot(state: RawState): Snapshot {
  const timeOf = (block: number) => state.latestTimestamp - (state.latestBlock - block) * 12;
  const active = new Set(FACTORIES.map((f) => f.address.toLowerCase()));
  const graduated = new Set(state.graduated);
  const trades: Trade[] = state.trades
    .filter((t) => active.has(t.factory.toLowerCase()))
    .map((t) => ({
      token: t.token, trader: t.trader, isBuy: t.isBuy, eth: w(t.eth), tokens: w(t.tokens), fee: w(t.fee),
      price: w(t.vEth) / w(t.vTokens), time: timeOf(t.block), tx: t.tx,
    }));
  const lastTrade = new Map<string, RawTrade>();
  for (const t of state.trades) lastTrade.set(t.token.toLowerCase(), t);
  const byToken = new Map<string, Trade[]>();
  for (const t of trades) {
    const k = t.token.toLowerCase();
    if (!byToken.has(k)) byToken.set(k, []);
    byToken.get(k)!.push(t);
  }

  const coins: Coin[] = state.created
    .filter((c) => active.has(c.factory.toLowerCase()))
    .map((c) => {
      const key = c.token.toLowerCase();
      const init = state.initV[c.factory.toLowerCase()] ?? { vEth: "0", vTokens: "1" };
      const iE = w(init.vEth), iT = w(init.vTokens);
      const lt = lastTrade.get(key);
      const vEth = lt ? w(lt.vEth) : iE;
      const vTokens = lt ? w(lt.vTokens) : iT;
      const mine = byToken.get(key) ?? [];
      const grad = graduated.has(key);
      const tokensSold = Math.max(0, iT - vTokens);
      return {
        address: c.token, factory: c.factory, version: c.version, name: c.name, symbol: c.symbol, meta: parseMeta(c.metadata),
        creator: c.creator, feeRecipient: c.feeRecipient, totalFeeBps: c.totalFeeBps, burnBps: c.burnBps, holderBps: c.holderBps,
        createdAt: timeOf(c.block), graduated: grad, vEth, vTokens, realEth: lt ? w(lt.realEth) : 0, tokensSold,
        price: vEth / vTokens, startPrice: iE / iT, marketCap: (vEth / vTokens) * TOTAL_SUPPLY,
        progress: grad ? 1 : Math.min(1, tokensSold / CURVE_SUPPLY),
        volume: mine.reduce((s, t) => s + t.eth, 0), trades: mine.length,
        lastTradeAt: mine.length ? mine[mine.length - 1].time : timeOf(c.block),
      };
    })
    .sort((x, y) => y.createdAt - x.createdAt);

  return { coins, trades, latestBlock: state.latestBlock };
}

/**
 * Browser entry point: ask the Genesis indexer (/api/snapshot) first; if it's unavailable,
 * read the chain directly (slower, but always works).
 */
export async function loadSnapshot(): Promise<Snapshot> {
  if (DEMO || !FACTORY) return { ...demoSnapshot(), source: "demo" };
  try {
    const r = await fetch("/api/snapshot/", { cache: "no-store" });
    if (r.ok) {
      const snap = (await r.json()) as Snapshot;
      if (Array.isArray(snap.coins)) return { ...snap, source: "indexer" };
    }
  } catch {
    /* fall back to chain */
  }
  const state = emptyRaw();
  await refreshRaw(state);
  return { ...buildSnapshot(state), source: "chain" };
}

// ------------------------------------------------------------------ points

export type PointsRow = { address: Address; points: number; launched: number; volume: number; graduated: number };

export function computePoints(s: Snapshot): PointsRow[] {
  const rows = new Map<string, PointsRow>();
  const get = (a: Address) => {
    const k = a.toLowerCase();
    if (!rows.has(k)) rows.set(k, { address: a, points: 0, launched: 0, volume: 0, graduated: 0 });
    return rows.get(k)!;
  };
  for (const c of s.coins) {
    const r = get(c.creator);
    r.launched += 1;
    r.points += POINTS.launch;
    if (c.graduated) {
      r.graduated += 1;
      r.points += POINTS.graduation;
    }
  }
  for (const t of s.trades) {
    if (isGenesisFactory(t.trader)) continue; // buyback & burn
    const r = get(t.trader);
    r.volume += t.eth;
    r.points += t.eth * POINTS.perEthVolume;
  }
  return [...rows.values()].map((r) => ({ ...r, points: Math.floor(r.points) })).sort((a, b) => b.points - a.points);
}

// -------------------------------------------------------------------- demo

export function demoSnapshot(): Snapshot {
  const now = Math.floor(Date.now() / 1000);
  const V0 = 0.1, T0 = 1_073_000_000;
  const seeds: Array<[string, string, string, number, number, number]> = [
    // name, symbol, description, ethRaised, feePct, minutesAgo
    ["Genesis Origin", "ORIGIN", "The first coin on Genesis testnet.", 0.293, 1, 340],
    ["Silver Hand", "SILVR", "Diamond hands are out. Silver hands are in.", 0.21, 2, 95],
    ["Zero Cat", "ZCAT", "A cat that lives on a multi-core world computer.", 0.12, 1, 64],
    ["Monolith", "MONO", "Black slab. Silver edge. Pure signal.", 0.071, 5, 41],
    ["Proof Pepe", "PROOF", "Verified by zero knowledge, felt by the heart.", 0.038, 3, 22],
    ["Block Producer", "BLOCK", "Executes vibes, ships proofs.", 0.015, 1, 9],
    ["Omni Dog", "OMNI", "Goes cross-chain for treats.", 0.004, 10, 3],
    ["Chrome", "CHRM", "Polished to a mirror finish.", 0, 1, 1],
  ];
  const coins: Coin[] = [];
  const trades: Trade[] = [];
  seeds.forEach(([name, symbol, description, raised, feePct, ago], i) => {
    const address = `0x${(i + 1).toString(16).padStart(4, "0")}${"0".repeat(36)}` as Address;
    const creator = `0x${"c".repeat(4)}${(i + 1).toString(16).padStart(36, "0")}` as Address;
    const vEth = V0 + raised;
    const vTokens = (V0 * T0) / vEth;
    const sold = T0 - vTokens;
    const grad = sold >= CURVE_SUPPLY * 0.999;
    // fake a price path
    const steps = 18;
    let prevE = V0;
    for (let k = 1; k <= steps && raised > 0; k++) {
      const wiggle = 1 + Math.sin(k * 1.7 + i) * 0.08;
      const e = V0 + raised * Math.min(1, (k / steps) * wiggle);
      const tk = (V0 * T0) / e;
      const trader = `0x${(1000 + i * 31 + k).toString(16).padStart(40, "a")}` as Address;
      trades.push({
        token: address, trader, isBuy: e >= prevE, eth: Math.abs(e - prevE) || 0.0005,
        tokens: Math.abs((V0 * T0) / prevE - tk), fee: Math.abs(e - prevE) * feePct / 100,
        price: e / tk, time: now - Math.floor((ago * 60 * (steps - k)) / steps), tx: "0x",
      });
      prevE = e;
    }
    const mine = trades.filter((t) => t.token === address);
    coins.push({
      address, factory: "0x0000000000000000000000000000000000000000" as Address, version: 2, name, symbol, meta: { description }, creator, feeRecipient: creator,
      totalFeeBps: feePct * 100, burnBps: i % 3 === 0 ? 5000 : 0, holderBps: i % 3 === 1 ? 10000 : i % 3 === 0 ? 3000 : 0, createdAt: now - ago * 60,
      graduated: grad, vEth, vTokens, realEth: raised, tokensSold: sold,
      price: vEth / vTokens, startPrice: V0 / T0, marketCap: (vEth / vTokens) * TOTAL_SUPPLY,
      progress: grad ? 1 : Math.min(1, sold / CURVE_SUPPLY),
      volume: mine.reduce((s, t) => s + t.eth, 0), trades: mine.length,
      lastTradeAt: mine.length ? mine[mine.length - 1].time : now - ago * 60,
    });
  });
  return { coins, trades, latestBlock: 0 };
}
