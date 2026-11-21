import "server-only";
import { DEMO } from "./config";
import { demoSnapshot, type Coin, type Snapshot } from "./data";
import { getSnapshot } from "./indexer";

/** Server-side snapshot (indexer, or demo data before the contract is configured). */
export async function serverSnapshot(timeoutMs = 4000): Promise<Snapshot | null> {
  if (DEMO) return demoSnapshot();
  try {
    return await Promise.race([getSnapshot(), new Promise<null>((r) => setTimeout(() => r(null), timeoutMs))]);
  } catch {
    return null;
  }
}

export async function serverCoin(address: string): Promise<Coin | null> {
  const snap = await serverSnapshot();
  return snap?.coins.find((c) => c.address.toLowerCase() === address.toLowerCase()) ?? null;
}
