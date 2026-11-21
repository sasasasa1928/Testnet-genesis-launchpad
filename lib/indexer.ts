import "server-only";
import { head, put } from "@vercel/blob";
import { FACTORIES } from "./config";
import { buildSnapshot, emptyRaw, refreshRaw, type RawState, type Snapshot } from "./data";

/**
 * Genesis indexer.
 *
 * Keeps every Genesis event (launches, trades, graduations) in one state object and only fetches
 * NEW blocks on each refresh, instead of every visitor re-reading the whole chain history.
 * The state is kept in memory and, when a Vercel Blob store is connected (BLOB_READ_WRITE_TOKEN),
 * saved to Blob so it survives cold starts. Without Blob it still works, re-scanning on cold start.
 */

const STATE_PATH = "indexer/genesis-sepolia-state.json";
const REFRESH_EVERY_MS = 4_000; // at most one chain refresh per 4s per server instance
const PERSIST_EVERY_MS = 20_000; // at most one Blob write per 20s

let state: RawState | null = null;
let lastRefresh = 0;
let lastPersist = 0;
let inflight: Promise<Snapshot> | null = null;

const hasBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;
const factoriesKey = () => FACTORIES.map((f) => `${f.address.toLowerCase()}:${f.startBlock}`).join(",");

async function loadState(): Promise<RawState> {
  if (hasBlob()) {
    try {
      const meta = await head(STATE_PATH);
      const r = await fetch(`${meta.url}?t=${Date.now()}`, { cache: "no-store" });
      if (r.ok) {
        const saved = (await r.json()) as RawState & { factories?: string };
        // Start over if the configured contracts changed in a way that invalidates the saved scan.
        if (saved && Array.isArray(saved.trades)) return saved;
      }
    } catch {
      /* first run or no state yet */
    }
  }
  return emptyRaw();
}

async function persist(s: RawState) {
  if (!hasBlob()) return;
  try {
    await put(STATE_PATH, JSON.stringify({ ...s, factories: factoriesKey(), savedAt: Date.now() }), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 60,
    });
    lastPersist = Date.now();
  } catch (e) {
    console.error("indexer: persist failed", e);
  }
}

export async function getSnapshot(): Promise<Snapshot> {
  if (state && Date.now() - lastRefresh < REFRESH_EVERY_MS) return buildSnapshot(state);
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      if (!state) state = await loadState();
      const changed = await refreshRaw(state);
      lastRefresh = Date.now();
      if (changed || Date.now() - lastPersist > PERSIST_EVERY_MS) {
        if (Date.now() - lastPersist > PERSIST_EVERY_MS || changed) void persist(state);
      }
      return buildSnapshot(state);
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}
