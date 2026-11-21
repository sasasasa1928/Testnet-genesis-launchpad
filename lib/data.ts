import { formatEther, parseAbiItem, type Address } from "viem";
import { DEMO, FACTORY, START_BLOCK, POINTS, TOTAL_SUPPLY, CURVE_SUPPLY, publicClient } from "./config";
import { factoryAbi } from "./abi";

export type Meta = { description?: string; image?: string; website?: string; x?: string; telegram?: string };

export type Coin = {
  address: Address;
  name: string;
  symbol: string;
  meta: Meta;
  creator: Address;
  feeRecipient: Address;
  totalFeeBps: number;
  burnBps: number;
  createdAt: number; // unix seconds
  graduated: boolean;
  vEth: number;
  vTokens: number;
  realEth: number;
  tokensSold: number;
  price: number; // ETH per token
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

export type Snapshot = { coins: Coin[]; trades: Trade[]; latestBlock: bigint };

const createdEvent = parseAbiItem(
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

export async function loadSnapshot(): Promise<Snapshot> {
  if (DEMO || !FACTORY) return demoSnapshot();
  const factory = FACTORY;
  const latest = await publicClient.getBlock();
  const latestBlock = latest.number;
  const from = START_BLOCK;
  const timeOf = (bn: bigint) => Number(latest.timestamp) - Number(latestBlock - bn) * 12;

  const [created, trades, grads] = await Promise.all([
    getLogsChunked((a, b) => publicClient.getLogs({ address: factory, event: createdEvent, fromBlock: a, toBlock: b }), from, latestBlock),
    getLogsChunked((a, b) => publicClient.getLogs({ address: factory, event: tradeEvent, fromBlock: a, toBlock: b }), from, latestBlock),
    getLogsChunked((a, b) => publicClient.getLogs({ address: factory, event: gradEvent, fromBlock: a, toBlock: b }), from, latestBlock),
  ]);

  const graduated = new Set(grads.map((g) => g.args.token!.toLowerCase()));
  const tradeList: Trade[] = trades.map((l) => {
    const a = l.args;
    return {
      token: a.token!,
      trader: a.trader!,
      isBuy: a.isBuy!,
      eth: n(a.ethAmount!),
      tokens: n(a.tokenAmount!),
      fee: n(a.fee!),
      price: n(a.vEth!) / n(a.vTokens!),
      time: timeOf(l.blockNumber),
      tx: l.transactionHash,
    };
  });

  // Latest curve state per token comes from its last Trade event (or the initial reserves).
  const lastTrade = new Map<string, (typeof trades)[number]>();
  for (const t of trades) lastTrade.set(t.args.token!.toLowerCase(), t);

  let initV: { vEth: number; vTokens: number } | null = null;
  if (created.length) {
    const [ve, vt] = await Promise.all([
      publicClient.readContract({ address: factory, abi: factoryAbi, functionName: "virtualEth" }),
      publicClient.readContract({ address: factory, abi: factoryAbi, functionName: "virtualTokens" }),
    ]);
    initV = { vEth: n(ve), vTokens: n(vt) };
  }

  const coins: Coin[] = created.map((l) => {
    const a = l.args;
    const key = a.token!.toLowerCase();
    const lt = lastTrade.get(key);
    const vEth = lt ? n(lt.args.vEth!) : initV!.vEth;
    const vTokens = lt ? n(lt.args.vTokens!) : initV!.vTokens;
    const realEth = lt ? n(lt.args.realEth!) : 0;
    const myTrades = tradeList.filter((t) => t.token.toLowerCase() === key);
    const grad = graduated.has(key);
    const tokensSold = Math.max(0, initV!.vTokens - vTokens);
    return {
      address: a.token!,
      name: a.name!,
      symbol: a.symbol!,
      meta: parseMeta(a.metadata!),
      creator: a.creator!,
      feeRecipient: a.feeRecipient!,
      totalFeeBps: Number(a.totalFeeBps),
      burnBps: Number(a.burnBps),
      createdAt: timeOf(l.blockNumber),
      graduated: grad,
      vEth,
      vTokens,
      realEth,
      tokensSold,
      price: vEth / vTokens,
      marketCap: (vEth / vTokens) * TOTAL_SUPPLY,
      progress: grad ? 1 : Math.min(1, tokensSold / CURVE_SUPPLY),
      volume: myTrades.reduce((s, t) => s + t.eth, 0),
      trades: myTrades.length,
      lastTradeAt: myTrades.length ? myTrades[myTrades.length - 1].time : timeOf(l.blockNumber),
    };
  });

  coins.sort((x, y) => y.createdAt - x.createdAt);
  return { coins, trades: tradeList, latestBlock };
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
    if (FACTORY && t.trader.toLowerCase() === FACTORY.toLowerCase()) continue; // buyback & burn
    const r = get(t.trader);
    r.volume += t.eth;
    r.points += t.eth * POINTS.perEthVolume;
  }
  return [...rows.values()].map((r) => ({ ...r, points: Math.floor(r.points) })).sort((a, b) => b.points - a.points);
}

// -------------------------------------------------------------------- demo

function demoSnapshot(): Snapshot {
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
      address, name, symbol, meta: { description }, creator, feeRecipient: creator,
      totalFeeBps: feePct * 100, burnBps: i % 3 === 0 ? 5000 : 0, createdAt: now - ago * 60,
      graduated: grad, vEth, vTokens, realEth: raised, tokensSold: sold,
      price: vEth / vTokens, marketCap: (vEth / vTokens) * TOTAL_SUPPLY,
      progress: grad ? 1 : Math.min(1, sold / CURVE_SUPPLY),
      volume: mine.reduce((s, t) => s + t.eth, 0), trades: mine.length,
      lastTradeAt: mine.length ? mine[mine.length - 1].time : now - ago * 60,
    });
  });
  return { coins, trades, latestBlock: 0n };
}
