"use client";

import Link from "next/link";
import type { Coin } from "@/lib/data";
import { ago, coinGradient, eth, short } from "@/lib/format";

export function CoinImage({ coin, size = "" }: { coin: Pick<Coin, "address" | "symbol" | "meta">; size?: "" | "lg" }) {
  if (coin.meta.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={`coin-img ${size}`} src={coin.meta.image} alt={coin.symbol} />;
  }
  return (
    <div className={`coin-img ${size}`} style={{ background: coinGradient(coin.address) }}>
      {coin.symbol.slice(0, 2)}
    </div>
  );
}

export function CoinCard({ coin }: { coin: Coin }) {
  return (
    <Link href={`/coin/?a=${coin.address}`} className="coin-card">
      <CoinImage coin={coin} />
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="row between gap">
          <div className="name">{coin.name}</div>
          {coin.graduated ? <span className="tag grad">graduated</span> : <span className="tag">{coin.totalFeeBps / 100}% fee</span>}
        </div>
        <div className="sym">
          ${coin.symbol} · by {short(coin.creator)} · {ago(coin.createdAt)}
        </div>
        <div className="desc">{coin.meta.description || "No description."}</div>
        <div className="row between">
          <span className="mc">MC {eth(coin.marketCap, 3)} ETH</span>
          <span className="mc muted">{Math.round(coin.progress * 100)}%</span>
        </div>
        <div className="progress">
          <span style={{ width: `${Math.max(2, coin.progress * 100)}%` }} />
        </div>
      </div>
    </Link>
  );
}
