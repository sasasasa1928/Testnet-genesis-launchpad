"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { formatEther, isAddress, parseEther, type Address } from "viem";
import { useReadContract } from "wagmi";
import { useWallet } from "@/app/providers";
import { CoinImage } from "@/components/CoinCard";
import { PriceChart } from "@/components/PriceChart";
import { TxStatus } from "@/components/TxStatus";
import { factoryAbi, tokenAbi } from "@/lib/abi";
import { parseAbi } from "viem";

// First testnet contract (v1) had no holder share in setCreatorFee.
const factoryV1Abi = parseAbi(["function setCreatorFee(address token, address feeRecipient, uint16 burnBps)"]);
import { CHAIN, CURVE_SUPPLY, DEMO, EXPLORER, PROTOCOL_FEE_PCT } from "@/lib/config";
import type { Coin } from "@/lib/data";
import { ago, compact, eth, price, short } from "@/lib/format";
import { useSnapshot, useTx } from "@/lib/hooks";

export default function CoinView() {
  return (
    <Suspense fallback={<div className="empty" style={{ marginTop: 30 }}>Loading…</div>}>
      <CoinInner />
    </Suspense>
  );
}

function CoinInner() {
  const params = useSearchParams();
  const a = params.get("a") || "";
  const { data, isLoading } = useSnapshot();
  const coin = data?.coins.find((c) => c.address.toLowerCase() === a.toLowerCase());
  const trades = useMemo(() => (data?.trades ?? []).filter((t) => t.token.toLowerCase() === a.toLowerCase()), [data, a]);

  if (!isAddress(a)) return <div className="empty" style={{ marginTop: 30 }}>Invalid coin address.</div>;
  if (isLoading) return <div className="empty" style={{ marginTop: 30 }}>Loading coin…</div>;
  if (!coin) return <div className="empty" style={{ marginTop: 30 }}>Coin not found. <Link href="/" className="silver-text">Back to coins</Link></div>;

  const change = (coin.price / coin.startPrice - 1) * 100;
  const topTraders = Object.values(
    trades.reduce<Record<string, { trader: Address; net: number }>>((acc, t) => {
      const k = t.trader.toLowerCase();
      acc[k] ??= { trader: t.trader, net: 0 };
      acc[k].net += t.isBuy ? t.tokens : -t.tokens;
      return acc;
    }, {})
  ).filter((r) => r.net > 0).sort((x, y) => y.net - x.net).slice(0, 10);

  return (
    <div className="coin-layout">
      <div style={{ display: "grid", gap: 16 }}>
        <div className="card">
          <div className="row gap" style={{ alignItems: "flex-start" }}>
            <CoinImage coin={coin} size="lg" />
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="row gap wrap">
                <h1 style={{ margin: 0, fontSize: 24 }}>{coin.name}</h1>
                <span className="mono muted">${coin.symbol}</span>
                {coin.graduated && <span className="tag grad">graduated</span>}
              </div>
              <div className="small muted" style={{ marginTop: 4 }}>
                by <a className="mono" href={`${EXPLORER}/address/${coin.creator}`} target="_blank" rel="noreferrer">{short(coin.creator)}</a> · {ago(coin.createdAt)} ·{" "}
                <a className="mono" href={`${EXPLORER}/token/${coin.address}`} target="_blank" rel="noreferrer">{short(coin.address)} ↗</a>
              </div>
              <p className="small" style={{ color: "#c5c7cc" }}>{coin.meta.description}</p>
              <div className="row gap wrap small">
                {coin.meta.website && <a className="tag" href={coin.meta.website} target="_blank" rel="noreferrer">website</a>}
                {coin.meta.x && <a className="tag" href={coin.meta.x} target="_blank" rel="noreferrer">x</a>}
                {coin.meta.telegram && <a className="tag" href={coin.meta.telegram} target="_blank" rel="noreferrer">telegram</a>}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="row between wrap gap" style={{ marginBottom: 10 }}>
            <div>
              <div className="muted small">Price</div>
              <div className="mono" style={{ fontSize: 22, fontWeight: 700 }}>
                {price(coin.price)} ETH <span className={`small ${change >= 0 ? "up" : "down"}`}>{change >= 0 ? "+" : ""}{change.toFixed(1)}%</span>
              </div>
            </div>
            <div className="row gap" style={{ gap: 22 }}>
              <div><div className="muted small">Market cap</div><div className="mono">{eth(coin.marketCap, 3)} ETH</div></div>
              <div><div className="muted small">Volume</div><div className="mono">{eth(coin.volume, 3)} ETH</div></div>
              <div><div className="muted small">Trades</div><div className="mono">{coin.trades}</div></div>
            </div>
          </div>
          <PriceChart
            points={[
              { t: coin.createdAt, p: coin.startPrice },
              ...trades.map((t) => ({ t: t.time, p: t.price })),
              { t: Math.max(Math.floor(Date.now() / 1000), coin.lastTradeAt), p: coin.price },
            ]}
          />
        </div>

        <div className="card">
          <div className="row between">
            <h3 style={{ margin: 0 }}>Bonding curve</h3>
            <span className="mono">{(coin.progress * 100).toFixed(1)}%</span>
          </div>
          <div className="progress lg"><span style={{ width: `${Math.max(1, coin.progress * 100)}%` }} /></div>
          <p className="small muted" style={{ marginBottom: 0 }}>
            {coin.graduated
              ? "This coin sold out its curve and graduated. Curve trading is closed."
              : `${compact(Math.max(0, CURVE_SUPPLY - coin.tokensSold))} tokens left on the curve · ${eth(coin.realEth, 4)} ETH in the curve. When all 800M sell, the coin graduates and liquidity moves to a DEX.`}
          </p>
        </div>

        <div className="card">
          <h3>Trades</h3>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Account</th><th>Type</th><th>ETH</th><th>{coin.symbol}</th><th>When</th></tr></thead>
              <tbody>
                {[...trades].reverse().slice(0, 50).map((t, i) => (
                  <tr key={i}>
                    <td className="mono">{short(t.trader)}</td>
                    <td className={t.isBuy ? "up" : "down"}>{t.isBuy ? "Buy" : "Sell"}</td>
                    <td className="mono">{eth(t.eth, 5)}</td>
                    <td className="mono">{compact(t.tokens)}</td>
                    <td className="muted">{t.tx !== "0x" ? <a href={`${EXPLORER}/tx/${t.tx}`} target="_blank" rel="noreferrer">{ago(t.time)} ↗</a> : ago(t.time)}</td>
                  </tr>
                ))}
                {trades.length === 0 && <tr><td colSpan={5} className="muted">No trades yet. Be the first.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="sticky" style={{ display: "grid", gap: 16 }}>
        <TradePanel coin={coin} />
        <HolderRewardsCard coin={coin} />
        <FeeCard coin={coin} />
        <div className="card">
          <h3>Top holders (curve buyers)</h3>
          {topTraders.length === 0 && <div className="small muted">No holders yet.</div>}
          {topTraders.map((r, i) => (
            <div className="kv" key={r.trader}>
              <span className="mono">{i + 1}. {short(r.trader)}{r.trader.toLowerCase() === coin.creator.toLowerCase() ? " (dev)" : ""}</span>
              <span className="mono">{((r.net / 1e9) * 100).toFixed(2)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TradePanel({ coin }: { coin: Coin }) {
  const { address, login } = useWallet();
  const { send, status } = useTx();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState(5);

  const { data: tokenBal } = useReadContract({
    address: coin.address, abi: tokenAbi, functionName: "balanceOf", args: address ? [address] : undefined, chainId: CHAIN.id,
    query: { enabled: !!address && !DEMO, refetchInterval: 12_000 },
  });
  const balance = tokenBal ? Number(formatEther(tokenBal)) : 0;

  const num = Number(amount) || 0;
  const fee = coin.totalFeeBps / 10_000;
  const remaining = Math.max(0, CURVE_SUPPLY - coin.tokensSold);
  let out = 0;
  if (side === "buy") {
    const net = num * (1 - fee);
    out = Math.min(remaining, (coin.vTokens * net) / (coin.vEth + net));
  } else {
    const gross = Math.min(coin.realEth, (coin.vEth * num) / (coin.vTokens + num));
    out = gross * (1 - fee);
  }

  async function submit() {
    if (!address) return login();
    if (!num) return;
    const minOut = parseEther(((out * (100 - slippage)) / 100).toFixed(18).replace(/\.?0+$/, "") || "0");
    if (side === "buy") {
      await send({ address: coin.factory, abi: factoryAbi, functionName: "buy", args: [coin.address, minOut], value: parseEther(amount) });
    } else {
      const amt = num >= balance && tokenBal ? tokenBal : parseEther(amount);
      await send({ address: coin.factory, abi: factoryAbi, functionName: "sell", args: [coin.address, amt, minOut] });
    }
    setAmount("");
  }

  if (coin.graduated) {
    return (
      <div className="card">
        <h3>Graduated 🎓</h3>
        <p className="small muted" style={{ margin: 0 }}>Curve trading is closed. On mainnet this coin trades on the DEX it graduated to.</p>
      </div>
    );
  }

  const presets = side === "buy" ? ["0.001", "0.005", "0.01", "0.05"] : ["25", "50", "75", "100"];

  return (
    <div className="card">
      <div className="tabs" style={{ marginBottom: 14 }}>
        <button className={`grow ${side === "buy" ? "on" : ""}`} onClick={() => { setSide("buy"); setAmount(""); }}>Buy</button>
        <button className={`grow ${side === "sell" ? "on" : ""}`} onClick={() => { setSide("sell"); setAmount(""); }}>Sell</button>
      </div>
      <div className="field">
        <label className="row between">
          <span>{side === "buy" ? "Amount (ETH)" : `Amount (${coin.symbol})`}</span>
          {side === "sell" && <span className="muted mono">bal {compact(balance)}</span>}
        </label>
        <input className="input mono" inputMode="decimal" placeholder="0.0" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} />
      </div>
      <div className="row gap" style={{ margin: "10px 0" }}>
        {presets.map((p) => (
          <button key={p} className="btn grow" style={{ padding: "7px 6px", fontSize: 12.5 }}
            onClick={() => setAmount(side === "buy" ? p : String((balance * Number(p)) / 100))}>
            {side === "buy" ? `${p}` : `${p}%`}
          </button>
        ))}
      </div>
      <div className="kv"><span>You receive (est.)</span><span className="mono">{side === "buy" ? `${compact(out)} ${coin.symbol}` : `${eth(out, 6)} ETH`}</span></div>
      <div className="kv"><span>Fee</span><span className="mono">{coin.totalFeeBps / 100}%</span></div>
      <div className="kv">
        <span>Max slippage</span>
        <span className="row gap">
          {[1, 5, 10].map((s) => (
            <button key={s} className={`tag ${slippage === s ? "grad" : ""}`} style={{ cursor: "pointer", background: slippage === s ? undefined : "none" }} onClick={() => setSlippage(s)}>{s}%</button>
          ))}
        </span>
      </div>
      <button className={`btn btn-block ${side === "buy" ? "btn-buy" : "btn-sell"}`} style={{ marginTop: 12 }}
        disabled={!!address && (!num || status.kind === "pending" || (side === "sell" && num > balance + 1e-9))} onClick={submit}>
        {!address ? "Connect wallet" : status.kind === "pending" ? "Pending…" : side === "buy" ? `Buy ${coin.symbol}` : `Sell ${coin.symbol}`}
      </button>
      <div style={{ marginTop: 10 }}><TxStatus status={status} /></div>
    </div>
  );
}

function FeeCard({ coin }: { coin: Coin }) {
  const { address } = useWallet();
  const { send, status } = useTx();
  const [newWallet, setNewWallet] = useState("");
  const [newBurn, setNewBurn] = useState(coin.burnBps / 100);
  const [newHolders, setNewHolders] = useState(coin.holderBps / 100);
  const { data: pool } = useReadContract({
    address: coin.factory, abi: factoryAbi, functionName: "buybackPool", args: [coin.address], chainId: CHAIN.id,
    query: { enabled: !DEMO, refetchInterval: 12_000 },
  });
  const { data: curve } = useReadContract({
    address: coin.factory, abi: factoryAbi, functionName: "curves", args: [coin.address], chainId: CHAIN.id,
    query: { enabled: !DEMO && coin.version === 2 },
  });
  const feeRecipient = (curve?.[1] as Address | undefined) ?? coin.feeRecipient;
  const burnBps = curve ? Number(curve[3]) : coin.burnBps;
  const holderBps = curve ? Number(curve[4]) : coin.holderBps;
  const isCreator = address && address.toLowerCase() === coin.creator.toLowerCase();
  const creatorPct = coin.totalFeeBps / 100 - PROTOCOL_FEE_PCT;

  return (
    <div className="card">
      <h3>Fees</h3>
      <div className="kv"><span>Total trade fee</span><span className="mono">{coin.totalFeeBps / 100}%</span></div>
      <div className="kv"><span>Protocol</span><span className="mono">{PROTOCOL_FEE_PCT}%</span></div>
      <div className="kv"><span>Creator side</span><span className="mono">{creatorPct.toFixed(2)}%</span></div>
      <div className="kv"><span>Payout wallet</span><span className="mono">{(10000 - burnBps - holderBps) / 100}% · {short(feeRecipient)}</span></div>
      <div className="kv"><span>Holders</span><span className="mono">{holderBps / 100}% of creator fee</span></div>
      <div className="kv"><span>Buyback & burn</span><span className="mono">{burnBps / 100}% of creator fee</span></div>
      {burnBps > 0 && (
        <>
          <div className="kv"><span>Buyback pool</span><span className="mono">{pool ? eth(Number(formatEther(pool)), 6) : "0"} ETH</span></div>
          <button className="btn btn-block" style={{ marginTop: 10 }} disabled={!pool || pool === 0n || status.kind === "pending"}
            onClick={() => send({ address: coin.factory, abi: factoryAbi, functionName: "buybackAndBurn", args: [coin.address] })}>
            🔥 Trigger buyback & burn
          </button>
        </>
      )}
      {isCreator && !coin.graduated && (
        <div style={{ marginTop: 14, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
          <div className="small" style={{ fontWeight: 600, marginBottom: 8 }}>Creator settings</div>
          <input className="input mono" placeholder={`Payout wallet (current ${short(feeRecipient)})`} value={newWallet} onChange={(e) => setNewWallet(e.target.value.trim())} />
          {coin.version === 2 && (
            <>
              <label className="small muted" style={{ display: "block", margin: "10px 0 4px" }}>Holders share: {newHolders}%</label>
              <input type="range" min={0} max={100} step={5} value={newHolders}
                onChange={(e) => { const v = Number(e.target.value); setNewHolders(v); if (v + newBurn > 100) setNewBurn(100 - v); }} />
            </>
          )}
          <label className="small muted" style={{ display: "block", margin: "10px 0 4px" }}>Burn share: {newBurn}%</label>
          <input type="range" min={0} max={100} step={5} value={newBurn}
            onChange={(e) => { const v = Number(e.target.value); setNewBurn(v); if (v + newHolders > 100) setNewHolders(100 - v); }} />
          <div className="hint">Payout wallet gets the rest: {100 - newHolders - newBurn}%</div>
          <button className="btn btn-block" style={{ marginTop: 8 }} disabled={(newWallet !== "" && !isAddress(newWallet)) || status.kind === "pending"}
            onClick={() =>
              coin.version === 2
                ? send({ address: coin.factory, abi: factoryAbi, functionName: "setCreatorFee", args: [coin.address, (newWallet || feeRecipient) as Address, newBurn * 100, newHolders * 100] })
                : send({ address: coin.factory, abi: factoryV1Abi, functionName: "setCreatorFee", args: [coin.address, (newWallet || feeRecipient) as Address, newBurn * 100] })
            }>
            Save fee settings
          </button>
        </div>
      )}
      <div style={{ marginTop: 10 }}><TxStatus status={status} /></div>
    </div>
  );
}

function HolderRewardsCard({ coin }: { coin: Coin }) {
  const { address, login } = useWallet();
  const { send, status } = useTx();
  const enabled = !DEMO && coin.version === 2;
  const { data: mine } = useReadContract({
    address: coin.address, abi: tokenAbi, functionName: "claimableRewardsOf", args: address ? [address] : undefined, chainId: CHAIN.id,
    query: { enabled: enabled && !!address, refetchInterval: 12_000 },
  });
  const { data: total } = useReadContract({
    address: coin.address, abi: tokenAbi, functionName: "totalRewardsDistributed", chainId: CHAIN.id,
    query: { enabled, refetchInterval: 12_000 },
  });
  const { data: pending } = useReadContract({
    address: coin.address, abi: tokenAbi, functionName: "pendingRewards", chainId: CHAIN.id,
    query: { enabled, refetchInterval: 12_000 },
  });
  const { data: curve } = useReadContract({
    address: coin.factory, abi: factoryAbi, functionName: "curves", args: [coin.address], chainId: CHAIN.id,
    query: { enabled: enabled && coin.version === 2 },
  });
  const holderBps = curve ? Number(curve[4]) : coin.holderBps;
  if (coin.version !== 2) return null; // first contract had no holder rewards
  if (holderBps === 0 && (!total || total === 0n)) return null;

  const creatorPct = coin.totalFeeBps / 100 - PROTOCOL_FEE_PCT;
  const holderPctOfTrade = (creatorPct * holderBps) / 10_000;
  const claim = mine ? Number(formatEther(mine)) : 0;

  return (
    <div className="card">
      <div className="row between">
        <h3 style={{ margin: 0 }}>Holder rewards</h3>
        <span className="tag" style={{ borderColor: "#234a31", color: "var(--up)" }}>{holderPctOfTrade.toFixed(2)}% of every trade</span>
      </div>
      <p className="small muted" style={{ margin: "8px 0 10px" }}>
        Hold ${coin.symbol} to earn a share of trading fees, split by your balance. Claim anytime.
      </p>
      <div className="kv"><span>Paid to holders so far</span><span className="mono">{total ? eth(Number(formatEther(total)), 6) : "0"} ETH</span></div>
      {pending && pending > 0n ? (
        <div className="kv"><span>Waiting for first holders</span><span className="mono">{eth(Number(formatEther(pending)), 6)} ETH</span></div>
      ) : null}
      <div className="kv"><span>Your rewards</span><span className="mono up">{address ? `${eth(claim, 8)} ETH` : "-"}</span></div>
      {address ? (
        <button className="btn btn-silver btn-block" style={{ marginTop: 10 }} disabled={!claim || status.kind === "pending"}
          onClick={() => send({ address: coin.address, abi: tokenAbi, functionName: "claimRewards" })}>
          Claim rewards
        </button>
      ) : (
        <button className="btn btn-block" style={{ marginTop: 10 }} onClick={login}>Connect to see your rewards</button>
      )}
      <div style={{ marginTop: 10 }}><TxStatus status={status} /></div>
    </div>
  );
}
