"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { decodeEventLog, isAddress, parseEther, zeroAddress, type Address } from "viem";
import { useWallet } from "@/app/providers";
import { CoinImage } from "@/components/CoinCard";
import { factoryAbi } from "@/lib/abi";
import { DEMO, FACTORY, PROTOCOL_FEE_PCT } from "@/lib/config";
import { useTx } from "@/lib/hooks";
import { TxStatus } from "@/components/TxStatus";
import { ImageUpload } from "@/components/ImageUpload";

type Dest = "me" | "wallet" | "holders" | "burn" | "split";

export default function Launch() {
  const router = useRouter();
  const { address, login } = useWallet();
  const { send, status } = useTx();

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [website, setWebsite] = useState("");
  const [x, setX] = useState("");
  const [telegram, setTelegram] = useState("");
  const [totalFee, setTotalFee] = useState(1); // %
  const [dest, setDest] = useState<Dest>("me");
  const [otherWallet, setOtherWallet] = useState("");
  const [burnPct, setBurnPct] = useState(20); // for split
  const [holderPct, setHolderPct] = useState(50); // for split
  const [initialBuy, setInitialBuy] = useState("");

  const creatorFee = +(totalFee - PROTOCOL_FEE_PCT).toFixed(2);
  const burnShare = dest === "burn" ? 100 : dest === "split" ? burnPct : 0;
  const holderShare = dest === "holders" ? 100 : dest === "split" ? holderPct : 0;
  const recipientShare = 100 - burnShare - holderShare;
  const recipient: Address | "" =
    dest === "wallet" || dest === "split" ? (isAddress(otherWallet) ? (otherWallet as Address) : "") : address ?? "";

  const valid =
    name.trim().length > 0 && name.length <= 32 && symbol.trim().length > 0 && symbol.length <= 10 &&
    (dest === "me" || dest === "burn" || dest === "holders" || (dest === "split" && (otherWallet === "" || isAddress(otherWallet))) || (dest === "wallet" && isAddress(otherWallet)));

  async function submit() {
    if (!address) return login();
    if (!FACTORY && !DEMO) return;
    const metadata = JSON.stringify({ description, image, website, x, telegram });
    let value = 0n;
    try {
      value = initialBuy ? parseEther(initialBuy) : 0n;
    } catch {
      return;
    }
    const receipt = await send({
      address: FACTORY!,
      abi: factoryAbi,
      functionName: "createToken",
      args: [name.trim(), symbol.trim().toUpperCase(), metadata, Math.round(totalFee * 100), recipient || zeroAddress, burnShare * 100, holderShare * 100, 0n],
      value,
    });
    if (!receipt) return;
    for (const log of receipt.logs) {
      try {
        const ev = decodeEventLog({ abi: factoryAbi, data: log.data, topics: log.topics });
        if (ev.eventName === "TokenCreated") {
          router.push(`/coin/?a=${(ev.args as { token: Address }).token}`);
          return;
        }
      } catch {
        /* not ours */
      }
    }
  }

  const preview = { address: ("0x" + (symbol || "GEN").padEnd(40, "0")) as Address, symbol: (symbol || "GEN").toUpperCase(), meta: { image } };

  return (
    <div className="launch-layout">
      <div className="card">
        <h1 style={{ margin: "0 0 4px", fontSize: 26 }}>Launch a coin</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          Fixed 1B supply. 800M sold on the bonding curve; when it sells out, the coin graduates.
        </p>
        <div className="form">
          <div className="two">
            <div className="field">
              <label>Name</label>
              <input className="input" maxLength={32} value={name} onChange={(e) => setName(e.target.value)} placeholder="Genesis Origin" />
            </div>
            <div className="field">
              <label>Ticker</label>
              <input className="input mono" maxLength={10} value={symbol} onChange={(e) => setSymbol(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())} placeholder="ORIGIN" />
            </div>
          </div>
          <div className="field">
            <label>Description</label>
            <textarea className="input" maxLength={280} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's the story?" />
          </div>
          <div className="field">
            <label>Image</label>
            <ImageUpload value={image} onChange={setImage} />
          </div>
          <div className="two">
            <div className="field">
              <label>Website (optional)</label>
              <input className="input" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
            </div>
            <div className="field">
              <label>X (optional)</label>
              <input className="input" value={x} onChange={(e) => setX(e.target.value)} placeholder="https://x.com/…" />
            </div>
          </div>
          <div className="field">
            <label>Telegram (optional)</label>
            <input className="input" value={telegram} onChange={(e) => setTelegram(e.target.value)} placeholder="https://t.me/…" />
          </div>

          <div className="card" style={{ background: "var(--panel-2)" }}>
            <div className="row between">
              <h3 style={{ margin: 0 }}>Trade fee</h3>
              <b className="mono silver-text" style={{ fontSize: 20 }}>{totalFee.toFixed(1)}%</b>
            </div>
            <input type="range" min={1} max={10} step={0.1} value={totalFee} onChange={(e) => setTotalFee(Number(e.target.value))} />
            <div className="fee-bar">
              <span className="p" style={{ width: `${(PROTOCOL_FEE_PCT / totalFee) * 100}%` }} />
              <span className="c" style={{ width: `${(creatorFee / totalFee) * (recipientShare / 100) * 100}%` }} />
              <span className="h" style={{ width: `${(creatorFee / totalFee) * (holderShare / 100) * 100}%` }} />
              <span className="b" style={{ width: `${(creatorFee / totalFee) * (burnShare / 100) * 100}%` }} />
            </div>
            <div className="kv"><span>Protocol</span><span className="mono">{PROTOCOL_FEE_PCT}%</span></div>
            <div className="kv"><span>Creator side</span><span className="mono">{creatorFee.toFixed(2)}%</span></div>
            {recipientShare > 0 && <div className="kv"><span>→ Payout wallet</span><span className="mono">{((creatorFee * recipientShare) / 100).toFixed(2)}%</span></div>}
            {holderShare > 0 && <div className="kv"><span>→ Holders</span><span className="mono">{((creatorFee * holderShare) / 100).toFixed(2)}%</span></div>}
            {burnShare > 0 && <div className="kv"><span>→ Buyback & burn</span><span className="mono">{((creatorFee * burnShare) / 100).toFixed(2)}%</span></div>}

            <div className="field" style={{ marginTop: 14 }}>
              <label>Where does the creator fee go?</label>
              <div className="seg">
                {([["me", "My wallet"], ["wallet", "Another wallet"], ["holders", "Holders"], ["burn", "Buyback & burn"], ["split", "Split"]] as const).map(([k, l]) => (
                  <button key={k} className={dest === k ? "on" : ""} onClick={() => setDest(k)} type="button">
                    {l}
                  </button>
                ))}
              </div>
            </div>
            {(dest === "wallet" || dest === "split") && (
              <div className="field" style={{ marginTop: 10 }}>
                <label>{dest === "split" ? "Payout wallet (empty = mine)" : "Payout wallet"}</label>
                <input className="input mono" value={otherWallet} onChange={(e) => setOtherWallet(e.target.value.trim())} placeholder="0x…" />
              </div>
            )}
            {dest === "split" && (
              <>
                <div className="field" style={{ marginTop: 10 }}>
                  <label>Holders: {holderPct}%</label>
                  <input type="range" min={0} max={100} step={5} value={holderPct}
                    onChange={(e) => { const v = Number(e.target.value); setHolderPct(v); if (v + burnPct > 100) setBurnPct(100 - v); }} />
                </div>
                <div className="field" style={{ marginTop: 6 }}>
                  <label>Buyback & burn: {burnPct}%</label>
                  <input type="range" min={0} max={100} step={5} value={burnPct}
                    onChange={(e) => { const v = Number(e.target.value); setBurnPct(v); if (v + holderPct > 100) setHolderPct(100 - v); }} />
                </div>
                <div className="hint">Payout wallet gets the rest: {100 - holderPct - burnPct}%</div>
              </>
            )}
            {(dest === "holders" || (dest === "split" && holderPct > 0)) && (
              <div className="hint">Holder rewards are shared by balance on every trade. Holders claim them anytime on the coin page.</div>
            )}
            <div className="hint">You can change the payout wallet and the holders/burn shares later. The total fee is locked at launch.</div>
          </div>

          <div className="field">
            <label>Initial buy (optional, Sepolia ETH)</label>
            <input className="input mono" inputMode="decimal" value={initialBuy} onChange={(e) => setInitialBuy(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.0" />
            <div className="hint">Be the first buyer in the same transaction.</div>
          </div>

          <button className="btn btn-silver btn-block" disabled={!valid || status.kind === "pending"} onClick={submit}>
            {!address ? "Connect wallet to launch" : status.kind === "pending" ? "Launching…" : "Launch coin"}
          </button>
          <TxStatus status={status} />
          {DEMO && <div className="notice">Preview mode: launching unlocks once the Genesis contract is deployed on Sepolia.</div>}
        </div>
      </div>

      <div className="sticky">
        <div className="card">
          <div className="tiny muted" style={{ textTransform: "uppercase", marginBottom: 10 }}>Preview</div>
          <div className="row gap">
            <CoinImage coin={preview} size="lg" />
            <div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{name || "Coin name"}</div>
              <div className="mono muted">${preview.symbol}</div>
              <div className="row gap" style={{ marginTop: 6 }}>
                <span className="tag">{totalFee.toFixed(1)}% fee</span>
                {holderShare > 0 && <span className="tag">{holderShare}% to holders</span>}
                {burnShare > 0 && <span className="tag">{burnShare}% burn</span>}
              </div>
            </div>
          </div>
          <p className="muted small" style={{ marginBottom: 0 }}>{description || "Your description shows here."}</p>
        </div>
        <div className="card" style={{ marginTop: 14 }}>
          <h3>How it works</h3>
          <div className="kv"><span>1. Launch</span><span>free (gas only)</span></div>
          <div className="kv"><span>2. Trade</span><span>bonding curve</span></div>
          <div className="kv"><span>3. Graduate</span><span>≈0.29 ETH raised</span></div>
          <p className="small muted" style={{ marginBottom: 0 }}>
            Need test ETH? <Link href="/faucet/" className="silver-text">Use a faucet →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
