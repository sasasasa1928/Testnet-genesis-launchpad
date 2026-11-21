"use client";

import { useEffect, useRef, useState } from "react";

const TAGLINE = "Every Great Thing Starts at Zero";
const SEGMENTS = 14;
const GRID = 30; // pixel grid for the logo build-up
const BUILD_MS = 1400;
const HOLD_MS = 450;
const EXIT_MS = 600;

/**
 * Opening animation: the Genesis mark assembles pixel by pixel on black,
 * a segmented bar fills, the tagline shows, then everything dissolves into the page.
 * Plays once per browser session.
 */
export function Intro() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"build" | "sharp" | "exit" | "done">("build");

  useEffect(() => {
    // Already played this session (the inline script in <head> also hides it before paint).
    try {
      if (sessionStorage.getItem("genesis-intro")) {
        setPhase("done");
        return;
      }
      sessionStorage.setItem("genesis-intro", "1");
    } catch {
      /* storage blocked: just play */
    }
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const build = reduced ? 200 : BUILD_MS;
    document.documentElement.style.overflow = "hidden";

    const img = new Image();
    img.src = "/logo.png";
    let raf = 0;
    let cancelled = false;
    const timers: number[] = [];

    img.onload = () => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const size = canvas.width;
      const ctx = canvas.getContext("2d")!;

      // Sample the logo onto a coarse grid to get "pixels".
      const off = document.createElement("canvas");
      off.width = off.height = GRID;
      const octx = off.getContext("2d")!;
      octx.drawImage(img, 0, 0, GRID, GRID);
      const data = octx.getImageData(0, 0, GRID, GRID).data;
      const cells: { x: number; y: number; a: number; order: number }[] = [];
      for (let y = 0; y < GRID; y++)
        for (let x = 0; x < GRID; x++) {
          const a = data[(y * GRID + x) * 4 + 3];
          // Reveal roughly left-to-right with randomness, like a scan.
          if (a > 40) cells.push({ x, y, a: a / 255, order: x / GRID * 0.6 + Math.random() * 0.4 });
        }
      const cell = size / GRID;
      const start = performance.now();

      const draw = (now: number) => {
        const t = Math.min(1, (now - start) / build);
        ctx.clearRect(0, 0, size, size);
        for (const c of cells) {
          if (c.order > t) continue;
          const shade = 170 + Math.round(70 * (1 - c.y / GRID));
          ctx.fillStyle = `rgba(${shade},${shade + 3},${shade + 7},${c.a})`;
          ctx.fillRect(c.x * cell + 0.5, c.y * cell + 0.5, cell - 1, cell - 1);
        }
        setProgress(t);
        if (t < 1) raf = requestAnimationFrame(draw);
        else {
          setPhase("sharp");
          timers.push(window.setTimeout(() => setPhase("exit"), HOLD_MS));
          timers.push(
            window.setTimeout(() => {
              setPhase("done");
              document.documentElement.style.overflow = "";
            }, HOLD_MS + EXIT_MS)
          );
        }
      };
      raf = requestAnimationFrame(draw);
    };
    img.onerror = () => {
      setPhase("done");
      document.documentElement.style.overflow = "";
    };
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      document.documentElement.style.overflow = "";
    };
  }, []);

  if (phase === "done") return null;
  const filled = Math.round(progress * SEGMENTS);

  return (
    <div className={`intro ${phase === "exit" ? "intro-exit" : ""}`} aria-hidden="true">
      <div className="intro-mark">
        <canvas ref={canvasRef} width={300} height={300} className={phase !== "build" ? "intro-fadeout" : ""} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" className={phase !== "build" ? "intro-sharp" : ""} />
      </div>
      <div className="intro-bar">
        {Array.from({ length: SEGMENTS }).map((_, i) => (
          <span key={i} className={i < filled ? "on" : ""} />
        ))}
      </div>
      <div className="intro-tag">{TAGLINE}</div>
    </div>
  );
}
