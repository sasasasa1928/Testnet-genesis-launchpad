"use client";

import { upload } from "@vercel/blob/client";
import { useEffect, useRef, useState } from "react";

/** Coin image picker: uploads to Vercel Blob when available, otherwise accepts a pasted link. */
export function ImageUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [showUrl, setShowUrl] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/upload/")
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .then((j) => setEnabled(!!j.enabled))
      .catch(() => setEnabled(false));
  }, []);

  async function pick(file: File) {
    setErr("");
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) return setErr("Use a PNG, JPG, WEBP or GIF image.");
    if (file.size > 4 * 1024 * 1024) return setErr("Image must be 4 MB or smaller.");
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
      const blob = await upload(`coins/coin.${ext}`, file, { access: "public", handleUploadUrl: "/api/upload/" });
      onChange(blob.url);
    } catch (e) {
      setErr((e as Error).message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  const urlField = (
    <input className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://…/coin.png" />
  );

  if (enabled === false) {
    return (
      <>
        {urlField}
        <div className="hint">Paste a link to a square image. Leave empty for a generated silver badge.</div>
      </>
    );
  }

  return (
    <>
      <div
        className={`dropzone ${busy ? "busy" : ""}`}
        onClick={() => !busy && input.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) pick(f);
        }}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Coin" className="dropzone-img" />
        ) : (
          <div className="dropzone-icon">⬆</div>
        )}
        <div>
          <div style={{ fontWeight: 600 }}>{busy ? "Uploading…" : value ? "Change image" : "Upload image"}</div>
          <div className="hint" style={{ marginTop: 2 }}>PNG, JPG, WEBP or GIF · max 4 MB · square works best</div>
        </div>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) pick(f);
            e.target.value = "";
          }}
        />
      </div>
      {err && <div className="notice err" style={{ marginTop: 8 }}>{err}</div>}
      <button type="button" className="hint" style={{ background: "none", border: 0, padding: 0, marginTop: 8, textDecoration: "underline", color: "var(--muted)" }} onClick={() => setShowUrl(!showUrl)}>
        {showUrl ? "Hide link field" : "Or paste an image link"}
      </button>
      {showUrl && <div style={{ marginTop: 8 }}>{urlField}</div>}
    </>
  );
}
