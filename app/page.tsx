"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CoinCard } from "@/components/CoinCard";
import { useSnapshot } from "@/lib/hooks";
import { eth } from "@/lib/format";

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
          <span className="silver-text">Something from nothing.</span>
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
    </>
  );
}
