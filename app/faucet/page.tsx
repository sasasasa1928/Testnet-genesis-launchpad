"use client";

import { useState } from "react";
import { useBalance } from "wagmi";
import { useWallet } from "@/app/providers";
import { CHAIN, FAUCETS } from "@/lib/config";
import { eth } from "@/lib/format";

export default function Faucet() {
  const { address, login } = useWallet();
  const { data: bal } = useBalance({ address, chainId: CHAIN.id, query: { enabled: !!address, refetchInterval: 15_000 } });
  const [copied, setCopied] = useState(false);

  return (
    <>
      <section className="hero" style={{ paddingBottom: 10 }}>
        <span className="pill">Ethereum Sepolia · chain ID {CHAIN.id}</span>
        <h1><span className="silver-text">Get free test ETH.</span></h1>
        <p>Genesis testnet runs on Sepolia. Claim free Sepolia ETH from any faucet below, then come back to launch and trade.</p>
      </section>

      <div className="card" style={{ maxWidth: 720, margin: "0 auto 18px" }}>
        {address ? (
          <div className="row between wrap gap">
            <div>
              <div className="muted small">Your wallet</div>
              <div className="mono small" style={{ wordBreak: "break-all" }}>{address}</div>
              <div className="muted small" style={{ marginTop: 6 }}>Balance: <b className="mono">{bal ? eth(Number(bal.formatted), 5) : "…"} ETH</b></div>
            </div>
            <button className="btn" onClick={() => { navigator.clipboard.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
              {copied ? "Copied ✓" : "Copy address"}
            </button>
          </div>
        ) : (
          <div className="row between wrap gap">
            <span className="muted">Connect to copy your address and see your Sepolia balance.</span>
            <button className="btn btn-silver" onClick={login}>Connect</button>
          </div>
        )}
      </div>

      <div className="grid" style={{ maxWidth: 720, margin: "0 auto", gridTemplateColumns: "1fr 1fr" }}>
        {FAUCETS.map((f) => (
          <a key={f.url} href={f.url} target="_blank" rel="noreferrer" className="card" style={{ display: "block" }}>
            <div style={{ fontWeight: 700 }}>{f.name} ↗</div>
            <div className="small muted" style={{ marginTop: 4 }}>{f.note}</div>
          </a>
        ))}
      </div>
      <p className="small muted" style={{ textAlign: "center", marginTop: 18 }}>
        About 0.3 ETH is enough to take a coin all the way to graduation. Faucet limits change often; try another one if a faucet is dry.
      </p>
    </>
  );
}
