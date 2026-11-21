"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAccount, useSwitchChain, useWriteContract } from "wagmi";
import type { Abi, Address } from "viem";
import { CHAIN, DEMO, publicClient } from "./config";
import { loadSnapshot } from "./data";

export function useSnapshot() {
  return useQuery({ queryKey: ["snapshot"], queryFn: loadSnapshot, refetchInterval: DEMO ? false : 12_000 });
}

/** Sends a contract write on Sepolia, switching chains first if needed, and waits for the receipt. */
export function useTx() {
  const { chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const qc = useQueryClient();
  const [status, setStatus] = useState<{ kind: "idle" | "pending" | "ok" | "error"; msg?: string; hash?: string }>({ kind: "idle" });

  async function send(args: { address: Address; abi: Abi; functionName: string; args?: readonly unknown[]; value?: bigint }) {
    if (DEMO) {
      setStatus({ kind: "error", msg: "Demo mode: the Genesis contract isn't deployed on Sepolia yet." });
      return null;
    }
    try {
      setStatus({ kind: "pending", msg: "Confirm in your wallet…" });
      if (chainId !== CHAIN.id) await switchChainAsync({ chainId: CHAIN.id });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hash = await writeContractAsync({ ...(args as any), chainId: CHAIN.id });
      setStatus({ kind: "pending", msg: "Waiting for confirmation…", hash });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("Transaction reverted");
      setStatus({ kind: "ok", msg: "Confirmed", hash });
      qc.invalidateQueries();
      return receipt;
    } catch (e: unknown) {
      const err = e as { shortMessage?: string; message?: string };
      setStatus({ kind: "error", msg: err.shortMessage || err.message?.split("\n")[0] || "Transaction failed" });
      return null;
    }
  }
  return { send, status, reset: () => setStatus({ kind: "idle" }) };
}
