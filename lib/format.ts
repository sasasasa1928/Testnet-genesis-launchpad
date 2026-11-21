export const short = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");

export function eth(v: number, digits = 4) {
  if (!isFinite(v)) return "0";
  if (v === 0) return "0";
  if (Math.abs(v) < 0.0001) return v.toFixed(8).replace(/0+$/, "");
  return v.toLocaleString("en-US", { maximumFractionDigits: digits });
}

export function compact(v: number) {
  return v.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 2 });
}

export function price(v: number) {
  if (v === 0) return "0";
  if (v < 1e-6) {
    // 0.0₈1234 style
    const s = v.toFixed(20);
    const m = s.match(/^0\.(0+)(\d{4})/);
    if (m) return `0.0₍${m[1].length}₎${m[2]}`;
  }
  return v.toPrecision(4);
}

export function ago(ts: number) {
  const s = Math.max(0, Math.floor(Date.now() / 1000 - ts));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/** Deterministic silver/graphite gradient for coins without an image. */
export function coinGradient(addr: string) {
  let h = 0;
  for (const ch of addr) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const a = 200 + (h % 40);
  const l1 = 70 + (h % 20);
  const l2 = 18 + ((h >> 5) % 15);
  return `linear-gradient(${(h >> 3) % 360}deg, hsl(${a} 6% ${l1}%), hsl(${a} 8% ${l2}%))`;
}
