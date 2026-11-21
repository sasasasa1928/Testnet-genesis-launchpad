import { ImageResponse } from "next/og";
import { logoDataUrl, SILVER } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Genesis testnet: Every Great Thing Starts at Zero.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const logo = await logoDataUrl();
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#000", color: "#ececee", fontFamily: "sans-serif",
        backgroundImage: "radial-gradient(800px 380px at 50% 0%, rgba(201,205,210,0.18), transparent 70%)" }}>
        <img src={logo} width={190} height={190} />
        <div style={{ display: "flex", marginTop: 20, fontSize: 30, letterSpacing: 14, fontWeight: 800, backgroundImage: SILVER, backgroundClip: "text", color: "transparent" }}>GENESIS</div>
        <div style={{ display: "flex", marginTop: 34, fontSize: 66, fontWeight: 800, backgroundImage: SILVER, backgroundClip: "text", color: "transparent" }}>
          Every Great Thing Starts at Zero.
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 34 }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} style={{ width: 16, height: 16, background: i < 14 ? "#e9ebee" : "#1c1d21" }} />
          ))}
        </div>
        <div style={{ display: "flex", marginTop: 30, fontSize: 24, color: "#8b8f97", letterSpacing: 4 }}>TESTNET · LAUNCH · TRADE · GRADUATE</div>
      </div>
    ),
    size
  );
}
