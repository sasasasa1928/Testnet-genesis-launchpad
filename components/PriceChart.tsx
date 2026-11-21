"use client";

import { useState } from "react";
import { price as fmtPrice } from "@/lib/format";

/** Lightweight SVG price line (silver), no chart library needed. */
export function PriceChart({ points }: { points: { t: number; p: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, H = 240, P = 8;
  if (points.length < 2) {
    return <div className="empty" style={{ padding: 60 }}>No price data yet.</div>;
  }
  const ps = points.map((x) => x.p);
  let min = Math.min(...ps), max = Math.max(...ps);
  if (max === min) { min *= 0.9; max *= 1.1; } // flat line sits in the middle
  const span = max - min || 1;
  const xs = (i: number) => P + (i / (points.length - 1)) * (W - 2 * P);
  const ys = (p: number) => H - P - ((p - min) / span) * (H - 2 * P);
  const d = points.map((pt, i) => `${i ? "L" : "M"}${xs(i).toFixed(1)},${ys(pt.p).toFixed(1)}`).join(" ");
  const area = `${d} L${xs(points.length - 1)},${H} L${xs(0)},${H} Z`;
  const h = hover !== null ? points[hover] : points[points.length - 1];

  return (
    <div style={{ position: "relative" }}>
      <div className="small mono muted" style={{ position: "absolute", top: 4, left: 8 }}>
        {fmtPrice(h.p)} ETH · {new Date(h.t * 1000).toLocaleString("en-US", { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" })}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const i = Math.round(((e.clientX - r.left) / r.width) * (points.length - 1));
          setHover(Math.max(0, Math.min(points.length - 1, i)));
        }}>
        <defs>
          <linearGradient id="line" x1="0" x2="1">
            <stop offset="0" stopColor="#8e939b" /><stop offset=".5" stopColor="#f7f8fa" /><stop offset="1" stopColor="#c9cdd2" />
          </linearGradient>
          <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c9cdd2" stopOpacity=".22" /><stop offset="1" stopColor="#c9cdd2" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={0} x2={W} y1={H * f} y2={H * f} stroke="#1e1f23" strokeDasharray="3 5" />
        ))}
        <path d={area} fill="url(#fill)" />
        <path d={d} fill="none" stroke="url(#line)" strokeWidth={2.2} strokeLinejoin="round" />
        {hover !== null && (
          <>
            <line x1={xs(hover)} x2={xs(hover)} y1={0} y2={H} stroke="#2a2c31" />
            <circle cx={xs(hover)} cy={ys(points[hover].p)} r={4} fill="#f7f8fa" />
          </>
        )}
      </svg>
    </div>
  );
}
