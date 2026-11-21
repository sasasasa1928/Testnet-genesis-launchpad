"use client";

import { useState } from "react";
import { isAddress, parseEther, zeroAddress, type Address } from "viem";
import { useAccount, useBalance, useDeployContract, useSwitchChain } from "wagmi";
import { useWallet } from "@/app/providers";
import { factoryAbi } from "@/lib/abi";
import { factoryBytecode } from "@/lib/bytecode";
import { CHAIN, EXPLORER, FACTORIES, FACTORY, START_BLOCK, publicClient } from "@/lib/config";
import { eth } from "@/lib/format";

/** One-time admin page: deploy GenesisFactory to Sepolia straight from the connected wallet. */
export default function Deploy() {
  const { address, login } = useWallet();
  const { chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { deployContractAsync } = useDeployContract();
  const { data: bal } = useBalance({ address, chainId: CHAIN.id, query: { enabled: !!address } });

  const [router, setRouter] = useState("");
  const [virtualEth, setVirtualEth] = useState("0.1");
  const [state, setState] = useState<{ kind: "idle" | "pending" | "ok" | "error"; msg?: string; hash?: string }>({ kind: "idle" });
  const [result, setResult] = useState<{ address: Address; block: bigint } | null>(null);
  const [copied, setCopied] = useState("");

  const valid = (router === "" || isAddress(router)) && Number(virtualEth) > 0;

  async function deploy() {
    if (!address) return login();
    try {
      setState({ kind: "pending", msg: "Confirm the deployment in your wallet…" });
      if (chainId !== CHAIN.id) await switchChainAsync({ chainId: CHAIN.id });
      const hash = await deployContractAsync({
        abi: factoryAbi,
        bytecode: factoryBytecode,
        args: [(router || zeroAddress) as Address, parseEther(virtualEth), parseEther("1073000000")],
        chainId: CHAIN.id,
      });
      setState({ kind: "pending", msg: "Deploying… this takes about 15–30 seconds.", hash });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success" || !receipt.contractAddress) throw new Error("Deployment failed");
      setResult({ address: receipt.contractAddress, block: receipt.blockNumber });
      setState({ kind: "ok", msg: "Deployed!", hash });
    } catch (e: unknown) {
      const err = e as { shortMessage?: string; message?: string };
      setState({ kind: "error", msg: err.shortMessage || err.message?.split("\n")[0] || "Failed" });
    }
  }

  function copy(label: string, v: string) {
    navigator.clipboard.writeText(v);
    setCopied(label);
    setTimeout(() => setCopied(""), 1500);
  }

  return (
    <div style={{ maxWidth: 640, margin: "30px auto 60px", display: "grid", gap: 16 }}>
      <div className="card">
        <h1 style={{ margin: "0 0 6px", fontSize: 24 }}>Deploy Genesis contract</h1>
        <p className="muted small" style={{ marginTop: 0 }}>
          One-time setup. Deploys the GenesisFactory contract to {CHAIN.name} from your connected wallet. You pay gas in Sepolia ETH
          (about 0.01–0.05 ETH). No private key is shared.
        </p>
        {FACTORY && (
          <div className="notice" style={{ marginBottom: 12 }}>
            A contract is already configured: <span className="mono">{FACTORY}</span>. Deploying again creates a new contract; its coins stay listed if you add it to <span className="mono">NEXT_PUBLIC_LEGACY_FACTORIES</span> (shown after deploy).
          </div>
        )}

        {!address ? (
          <button className="btn btn-silver btn-block" onClick={login}>Connect wallet</button>
        ) : (
          <div className="form">
            <div className="kv"><span>Deployer</span><span className="mono">{address.slice(0, 8)}…{address.slice(-6)}</span></div>
            <div className="kv"><span>Sepolia balance</span><span className="mono">{bal ? eth(Number(bal.formatted), 4) : "…"} ETH</span></div>
            <div className="field">
              <label>DEX router (optional)</label>
              <input className="input mono" placeholder="0x… Uniswap V2-style router" value={router} onChange={(e) => setRouter(e.target.value.trim())} />
              <div className="hint">Optional. Can be set later.</div>
            </div>
            <div className="field">
              <label>Virtual ETH reserve</label>
              <input className="input mono" value={virtualEth} onChange={(e) => setVirtualEth(e.target.value.replace(/[^0-9.]/g, ""))} />
              <div className="hint">0.1 means a coin graduates at about {(Number(virtualEth || 0) * 2.93).toFixed(2)} ETH raised.</div>
            </div>
            <button className="btn btn-silver btn-block" disabled={!valid || state.kind === "pending"} onClick={deploy}>
              {state.kind === "pending" ? "Deploying…" : "Deploy to Sepolia"}
            </button>
          </div>
        )}

        {state.kind !== "idle" && (
          <div className={`notice ${state.kind === "error" ? "err" : state.kind === "ok" ? "ok" : ""}`} style={{ marginTop: 12 }}>
            {state.msg}
            {state.hash && (
              <> · <a href={`${EXPLORER}/tx/${state.hash}`} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>view transaction</a></>
            )}
          </div>
        )}
      </div>

      {result && (
        <div className="card">
          <h3>Last step: add these to Vercel</h3>
          <p className="small muted" style={{ marginTop: 0 }}>
            Vercel → your testnet project → Settings → Environment Variables. Add or replace these, then redeploy.
            {FACTORY ? " The last one keeps coins from your previous contracts listed and tradable." : ""}
          </p>
          {([
            ["NEXT_PUBLIC_FACTORY_ADDRESS", result.address],
            ["NEXT_PUBLIC_FACTORY_START_BLOCK", result.block.toString()],
            ...(FACTORY
              ? ([[
                  "NEXT_PUBLIC_LEGACY_FACTORIES",
                  [`${FACTORY}:${START_BLOCK}:2`, ...FACTORIES.filter((f) => !f.current).map((f) => `${f.address}:${f.startBlock}:${f.version}`)].join(","),
                ]] as const)
              : []),
          ] as const).map(([k, v]) => (
            <div key={k} style={{ marginBottom: 12 }}>
              <div className="small" style={{ fontWeight: 600 }}>{k}</div>
              <div className="row gap">
                <input className="input mono" readOnly value={v} />
                <button className="btn" onClick={() => copy(k, v)}>{copied === k ? "Copied ✓" : "Copy"}</button>
              </div>
            </div>
          ))}
          <a className="small silver-text" href={`${EXPLORER}/address/${result.address}`} target="_blank" rel="noreferrer">
            View contract on Etherscan ↗
          </a>
        </div>
      )}
    </div>
  );
}
