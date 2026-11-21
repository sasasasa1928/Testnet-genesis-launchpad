import { ImageResponse } from "next/og";
import { serverCoin } from "@/lib/server-data";
import { logoDataUrl, remoteImage, SILVER } from "@/lib/og";
import { coinGradient, eth, short } from "@/lib/format";

export const runtime = "nodejs";

/** 1200x630 share card for a coin: /api/og/?a=0xToken */
export async function GET(req: Request) {
  const a = new URL(req.url).searchParams.get("a") || "";
  const [coin, logo] = await Promise.all([serverCoin(a), logoDataUrl()]);
  const img = coin ? await remoteImage(coin.meta.image) : null;
  const pct = coin ? Math.round(coin.progress * 100) : 0;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#050506", color: "#ececee", padding: 64, fontFamily: "sans-serif",
        backgroundImage: "radial-gradient(900px 400px at 15% 0%, rgba(201,205,210,0.16), transparent 70%)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <img src={logo} width={56} height={56} />
          <div style={{ display: "flex", fontSize: 30, fontWeight: 800, letterSpacing: 8, backgroundImage: SILVER, backgroundClip: "text", color: "transparent" }}>GENESIS</div>
          <div style={{ display: "flex", fontSize: 18, letterSpacing: 3, border: "1px solid #2a2c31", borderRadius: 999, padding: "4px 14px", color: "#c9cdd2" }}>TESTNET</div>
        </div>

        {coin ? (
          <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 48, marginTop: 24 }}>
            {img ? (
              <img src={img} width={260} height={260} style={{ borderRadius: 28, objectFit: "cover", border: "2px solid #2a2c31" }} />
            ) : (
              <div style={{ width: 260, height: 260, borderRadius: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 96, fontWeight: 800, color: "#0b0b0c", background: coinGradient(coin.address) }}>
                {coin.symbol.slice(0, 2)}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={{ display: "flex", fontSize: 72, fontWeight: 800, lineHeight: 1.05 }}>{coin.name.slice(0, 24)}</div>
              <div style={{ display: "flex", fontSize: 34, color: "#8b8f97", marginTop: 8 }}>${coin.symbol} · by {short(coin.creator)}</div>
              <div style={{ display: "flex", gap: 40, marginTop: 34, fontSize: 30 }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 20, color: "#8b8f97" }}>MARKET CAP</span>
                  <span style={{ fontWeight: 700 }}>{eth(coin.marketCap, 3)} ETH</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 20, color: "#8b8f97" }}>FEE</span>
                  <span style={{ fontWeight: 700 }}>{coin.totalFeeBps / 100}%</span>
                </div>
                {coin.holderBps > 0 && (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 20, color: "#8b8f97" }}>TO HOLDERS</span>
                    <span style={{ fontWeight: 700, color: "#9be7b4" }}>{coin.holderBps / 100}% of creator fee</span>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 34, fontSize: 22, color: "#c9cdd2" }}>
                <span>{coin.graduated ? "Graduated" : "Bonding curve"}</span>
                <span>{pct}%</span>
              </div>
              <div style={{ display: "flex", height: 16, borderRadius: 99, background: "#1a1b1f", marginTop: 10, overflow: "hidden" }}>
                <div style={{ display: "flex", width: `${Math.max(2, pct)}%`, height: "100%", borderRadius: 99, backgroundImage: SILVER }} />
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flex: 1, alignItems: "center", fontSize: 72, fontWeight: 800, backgroundImage: SILVER, backgroundClip: "text", color: "transparent" }}>
            Every Great Thing Starts at Zero.
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: "#8b8f97" }}>
          <span>testnet.genesislaunch.family</span>
          <span>Launch · Trade · Graduate</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600" } }
  );
}
