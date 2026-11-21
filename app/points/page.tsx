"use client";

import { useMemo } from "react";
import { useWallet } from "@/app/providers";
import { POINTS } from "@/lib/config";
import { computePoints } from "@/lib/data";
import { eth, short } from "@/lib/format";
import { useSnapshot } from "@/lib/hooks";

export default function Points() {
  const { data, isLoading } = useSnapshot();
  const { address } = useWallet();
  const rows = useMemo(() => (data ? computePoints(data) : []), [data]);
  const myIndex = address ? rows.findIndex((r) => r.address.toLowerCase() === address.toLowerCase()) : -1;
  const mine = myIndex >= 0 ? rows[myIndex] : null;

  return (
    <>
      <section className="hero" style={{ paddingBottom: 10 }}>
        <span className="pill">Testnet points</span>
        <h1><span className="silver-text">Earn points by testing.</span></h1>
        <p>Points are computed from on-chain activity on the Genesis testnet contract.</p>
      </section>

      <div className="stats" style={{ marginTop: 0 }}>
        <div className="stat"><span className="muted small">Launch a coin</span><b>+{POINTS.launch}</b></div>
        <div className="stat"><span className="muted small">Per 0.001 ETH traded</span><b>+1</b></div>
        <div className="stat"><span className="muted small">Your coin graduates</span><b>+{POINTS.graduation}</b></div>
        <div className="stat">
          <span className="muted small">Your points</span>
          <b className="silver-text">{mine ? mine.points.toLocaleString("en-US") : address ? 0 : "-"}</b>
          {mine && <span className="small muted">Rank #{myIndex + 1}</span>}
        </div>
      </div>

      <div className="section-title">Leaderboard</div>
      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>#</th><th>Wallet</th><th>Points</th><th>Launched</th><th>Graduated</th><th>Volume</th></tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={6} className="muted">Loading…</td></tr>}
              {rows.slice(0, 100).map((r, i) => {
                const isMe = address && r.address.toLowerCase() === address.toLowerCase();
                return (
                  <tr key={r.address} style={isMe ? { background: "var(--panel-2)" } : undefined}>
                    <td className="mono">{i + 1}</td>
                    <td className="mono">{short(r.address)}{isMe ? " (you)" : ""}</td>
                    <td className="mono silver-text" style={{ fontWeight: 700 }}>{r.points.toLocaleString("en-US")}</td>
                    <td className="mono">{r.launched}</td>
                    <td className="mono">{r.graduated}</td>
                    <td className="mono">{eth(r.volume, 4)} ETH</td>
                  </tr>
                );
              })}
              {!isLoading && rows.length === 0 && <tr><td colSpan={6} className="muted">No activity yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <p className="small muted">Testnet points are for tracking testing activity. They have no monetary value and nothing is promised for them.</p>
    </>
  );
}
