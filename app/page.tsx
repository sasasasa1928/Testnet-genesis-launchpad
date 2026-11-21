"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CoinCard, CoinImage } from "@/components/CoinCard";
import { PriceChart } from "@/components/PriceChart";
import { useSnapshot } from "@/lib/hooks";
import { ago, eth, short } from "@/lib/format";

const TABS = ["New", "Trending", "About to graduate", "Graduated"] as const;

export default function Home() {
  const { data, isLoading, error } = useSnapshot();
  const [tab, setTab] = useState<(typeof TABS)[number]>("New");
  const [q, setQ] = useState("");

  const coins = useMemo(() => {
    let list = [...(data?.coins ?? [])];
    const s = q.trim().toLowerCase();
    if (s) list = list.filter((c) => c.name.toLowerCase().includes(s) || c.symbol.toLowerCase().includes(s) || c.address.toLowerCase() === s);
    if (tab === "Trending") list.sort((a, b) => b.volume - a.volume);
    if (tab === "About to graduate") list = list.filter((c) => !c.graduated).sort((a, b) => b.progress - a.progress);
    if (tab === "Graduated") list = list.filter((c) => c.graduated);
    return list;
  }, [data, tab, q]);

  const bySym = useMemo(() => new Map((data?.coins ?? []).map((c) => [c.address.toLowerCase(), c])), [data]);
  const recent = useMemo(() => [...(data?.trades ?? [])].reverse().slice(0, 24), [data]);
  const king = useMemo(
    () => (data?.coins ?? []).filter((c) => !c.graduated).sort((a, b) => b.progress - a.progress || b.volume - a.volume)[0],
    [data]
  );

  const totals = useMemo(() => {
    const c = data?.coins ?? [];
    const t = data?.trades ?? [];
    return {
      coins: c.length,
      graduated: c.filter((x) => x.graduated).length,
      volume: t.reduce((s, x) => s + x.eth, 0),
      traders: new Set(t.map((x) => x.trader.toLowerCase())).size,
    };
  }, [data]);

  return (
    <>
      <section className="hero">
        <span className="pill">
          <span className="dot" /> Genesis · testnet is live
        </span>
        <h1>
          {"Every Great Thing Starts at Zero.".split(" ").map((w, i) => (
            <span key={i} className="word silver-text" style={{ ["--d" as string]: `${0.15 + i * 0.09}s` }}>
              {w}&nbsp;
            </span>
          ))}
        </h1>
        <p>Launch a coin. Trade it. Graduate it. Practice the full Genesis flow on Ethereum Sepolia with free test ETH.</p>
        <div className="row gap" style={{ justifyContent: "center" }}>
          <Link href="/launch/" className="btn btn-silver">
            Launch a coin
          </Link>
          <Link href="/faucet/" className="btn">
            Get test ETH
          </Link>
        </div>
        <div className="stats">
          <div className="stat"><span className="muted small">Coins launched</span><b>{totals.coins}</b></div>
          <div className="stat"><span className="muted small">Graduated</span><b>{totals.graduated}</b></div>
          <div className="stat"><span className="muted small">Volume</span><b>{eth(totals.volume, 3)} ETH</b></div>
          <div className="stat"><span className="muted small">Traders</span><b>{totals.traders}</b></div>
        </div>
      </section>

      {recent.length > 0 && (
        <div className="ticker" aria-label="Latest trades">
          <div className="ticker-track">
            {[...recent, ...recent].map((t, i) => {
              const c = bySym.get(t.token.toLowerCase());
              return (
                <Link key={i} href={`/coin/?a=${t.token}`} className={`tick ${t.isBuy ? "up" : "down"}`}>
                  {t.isBuy ? "▲ BUY" : "▼ SELL"} <b>${c?.symbol ?? "?"}</b> {eth(t.eth, 4)} ETH
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {(king || recent.length > 0) && (
        <div className="feature-row">
          {king && (
            <Link href={`/coin/?a=${king.address}`} className="card king">
              <div className="tiny muted" style={{ textTransform: "uppercase", letterSpacing: ".14em" }}>👑 King of the curve</div>
              <div className="row gap" style={{ marginTop: 12, alignItems: "flex-start" }}>
                <CoinImage coin={king} size="lg" />
                <div className="grow" style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 22 }}>{king.name}</div>
                  <div className="mono muted">${king.symbol} · by {short(king.creator)}</div>
                  <p className="small muted" style={{ margin: "8px 0 0" }}>{king.meta.description || "No description."}</p>
                </div>
              </div>
              <div style={{ marginTop: 14, pointerEvents: "none" }}>
                <PriceChart
                  height={150}
                  points={[
                    { t: king.createdAt, p: king.startPrice },
                    ...(data?.trades ?? []).filter((t) => t.token.toLowerCase() === king.address.toLowerCase()).map((t) => ({ t: t.time, p: t.price })),
                    { t: Math.max(Math.floor(Date.now() / 1000), king.lastTradeAt), p: king.price },
                  ]}
                />
              </div>
              <div className="row between" style={{ marginTop: 12 }}>
                <span className="mono small">MC {eth(king.marketCap, 3)} ETH</span>
                <span className="mono small">{(king.progress * 100).toFixed(1)}% to graduation</span>
              </div>
              <div className="progress lg"><span style={{ width: `${Math.max(2, king.progress * 100)}%` }} /></div>
              <div className="row gap wrap" style={{ marginTop: 14 }}>
                <span className="tag">{king.totalFeeBps / 100}% fee</span>
                {king.holderBps > 0 && <span className="tag" style={{ color: "var(--up)", borderColor: "#234a31" }}>{king.holderBps / 100}% to holders</span>}
                <span className="tag">{king.trades} trades</span>
                <span className="tag">vol {eth(king.volume, 3)} ETH</span>
              </div>
            </Link>
          )}
          <div className="card live">
            <div className="row between">
              <h3 style={{ margin: 0 }}>Live trades</h3>
              <span className="row gap small muted"><span className="dot" /> live</span>
            </div>
            <div className="live-list">
              {recent.slice(0, 10).map((t, i) => {
                const c = bySym.get(t.token.toLowerCase());
                return (
                  <Link key={i} href={`/coin/?a=${t.token}`} className="live-row">
                    <span className={t.isBuy ? "up" : "down"}>{t.isBuy ? "Buy" : "Sell"}</span>
                    <b>${c?.symbol ?? "?"}</b>
                    <span className="mono muted">{short(t.trader)}</span>
                    <span className="mono">{eth(t.eth, 4)} ETH</span>
                    <span className="muted">{ago(t.time)}</span>
                  </Link>
                );
              })}
              {recent.length === 0 && <div className="small muted">No trades yet.</div>}
            </div>
          </div>
        </div>
      )}

      <div className="row between wrap gap" style={{ margin: "26px 0 16px" }}>
        <div className="tabs">
          {TABS.map((t) => (
            <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>
        <input className="search" placeholder="Search name, ticker or address" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {isLoading && <div className="empty">Loading coins from Sepolia…</div>}
      {error && <div className="notice err">Couldn&apos;t load coins: {(error as Error).message}</div>}
      {!isLoading && !error && coins.length === 0 && (
        <div className="empty">
          No coins here yet. <Link href="/launch/" className="silver-text">Launch the first one →</Link>
        </div>
      )}
      <div className="grid">
        {coins.map((c) => (
          <CoinCard key={c.address} coin={c} />
        ))}
      </div>

      <div className="section-title" style={{ marginTop: 48 }}>How Genesis works</div>
      <div className="steps">
        {[
          ["01", "Get test ETH", "Claim free Sepolia ETH from a faucet. Nothing here costs real money.", "/faucet/"],
          ["02", "Launch a coin", "Name, ticker, image. Pick a 1-10% fee and send the creator share to you, holders or buyback & burn.", "/launch/"],
          ["03", "Trade the curve", "Every buy moves the price up the bonding curve. Holders can earn a share of every trade.", "/"],
          ["04", "Graduate", "When 800M tokens sell (~0.29 ETH), the coin graduates and liquidity moves to a DEX.", "/docs/"],
        ].map(([n, t, d, href]) => (
          <Link key={n} href={href} className="card step">
            <div className="step-n silver-text">{n}</div>
            <div style={{ fontWeight: 700, marginTop: 6 }}>{t}</div>
            <p className="small muted" style={{ margin: "6px 0 0" }}>{d}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
