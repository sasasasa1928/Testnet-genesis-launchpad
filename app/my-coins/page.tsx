"use client";

import Link from "next/link";
import { useMemo } from "react";
import { formatEther } from "viem";
import { useReadContract } from "wagmi";
import { useWallet } from "@/app/providers";
import { CoinCard } from "@/components/CoinCard";
import { TxStatus } from "@/components/TxStatus";
import { factoryAbi } from "@/lib/abi";
import { CHAIN, DEMO, FACTORY } from "@/lib/config";
import { eth } from "@/lib/format";
import { useSnapshot, useTx } from "@/lib/hooks";

export default function MyCoins() {
  const { address, login } = useWallet();
  const { data } = useSnapshot();
  const { send, status } = useTx();
  const { data: claimable } = useReadContract({
    address: FACTORY ?? undefined, abi: factoryAbi, functionName: "claimable", args: address ? [address] : undefined, chainId: CHAIN.id,
    query: { enabled: !!address && !DEMO, refetchInterval: 12_000 },
  });

  const me = address?.toLowerCase();
  const created = useMemo(() => (data?.coins ?? []).filter((c) => c.creator.toLowerCase() === me), [data, me]);
  const held = useMemo(() => {
    if (!me || !data) return [];
    const net = new Map<string, number>();
    for (const t of data.trades) {
      if (t.trader.toLowerCase() !== me) continue;
      const k = t.token.toLowerCase();
      net.set(k, (net.get(k) ?? 0) + (t.isBuy ? t.tokens : -t.tokens));
    }
    return data.coins.filter((c) => (net.get(c.address.toLowerCase()) ?? 0) > 1);
  }, [data, me]);

  if (!address) {
    return (
      <div className="empty" style={{ marginTop: 40 }}>
        <p>Connect your wallet to see coins you launched, coins you hold, and fees you can claim.</p>
        <button className="btn btn-silver" onClick={login}>Connect</button>
      </div>
    );
  }

  const claim = claimable ? Number(formatEther(claimable)) : 0;

  return (
    <>
      <div className="card" style={{ marginTop: 28 }}>
        <div className="row between wrap gap">
          <div>
            <div className="muted small">Claimable fees</div>
            <div className="mono silver-text" style={{ fontSize: 28, fontWeight: 800 }}>{eth(claim, 6)} ETH</div>
          </div>
          <button className="btn btn-silver" disabled={!claim || status.kind === "pending"}
            onClick={() => send({ address: FACTORY!, abi: factoryAbi, functionName: "claim" })}>
            Claim fees
          </button>
        </div>
        <div style={{ marginTop: 10 }}><TxStatus status={status} /></div>
      </div>

      <div className="section-title">Launched by you ({created.length})</div>
      {created.length === 0 ? (
        <div className="empty">You haven&apos;t launched a coin yet. <Link href="/launch/" className="silver-text">Launch one →</Link></div>
      ) : (
        <div className="grid">{created.map((c) => <CoinCard key={c.address} coin={c} />)}</div>
      )}

      <div className="section-title">Holding ({held.length})</div>
      {held.length === 0 ? (
        <div className="empty">No holdings yet. Buy a coin from the <Link href="/" className="silver-text">coins list</Link>.</div>
      ) : (
        <div className="grid">{held.map((c) => <CoinCard key={c.address} coin={c} />)}</div>
      )}
    </>
  );
}
