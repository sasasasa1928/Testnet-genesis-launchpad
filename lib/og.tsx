import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

let logoCache: string | null = null;
export async function logoDataUrl() {
  if (!logoCache) logoCache = `data:image/png;base64,${(await readFile(join(process.cwd(), "public", "logo.png"))).toString("base64")}`;
  return logoCache;
}

/** Fetch a remote image as a data URL that the OG renderer can use (PNG/JPEG/GIF only). */
export async function remoteImage(url?: string): Promise<string | null> {
  if (!url || !/^https?:\/\//.test(url)) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    const type = r.headers.get("content-type") || "";
    if (!r.ok || !/image\/(png|jpe?g|gif)/.test(type)) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 4 * 1024 * 1024) return null;
    return `data:${type.split(";")[0]};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export const SILVER = "linear-gradient(135deg, #fbfcfd 0%, #c3c7cd 38%, #7f848c 62%, #e9ebee 100%)";
