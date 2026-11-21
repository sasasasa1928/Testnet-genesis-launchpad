"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useBalance } from "wagmi";
import { useWallet } from "@/app/providers";
import { CHAIN, DEMO, MAINNET_URL } from "@/lib/config";
import { eth, short } from "@/lib/format";

const LINKS = [
  { href: "/", label: "Coins" },
  { href: "/launch/", label: "Launch" },
  { href: "/my-coins/", label: "My coins" },
  { href: "/points/", label: "Points" },
  { href: "/faucet/", label: "Faucet" },
  { href: "/docs/", label: "Docs" },
];

export function TestnetBanner() {
  return (
    <div className="testnet-banner">
      <div className="container">
        <span className="row gap">
          <span className={`dot ${DEMO ? "amber" : ""}`} />
          {DEMO ? "Preview: contract not deployed yet, showing demo coins" : `Live on ${CHAIN.name}`}
        </span>
        <span>Test ETH only. Nothing here is worth real money.</span>
        <Link href="/faucet/">Get free Sepolia ETH →</Link>
      </div>
    </div>
  );
}

export function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const { address, ready, login, logout } = useWallet();
  const { data: bal } = useBalance({ address, chainId: CHAIN.id, query: { enabled: !!address } });

  return (
    <nav className="nav">
      <div className="container">
        <Link href="/" className="brand" onClick={() => setOpen(false)}>
          <img src="/logo.svg" alt="Genesis" />
          <span className="silver-text">GENESIS</span>
          <span className="badge">testnet</span>
        </Link>
        <div className={`nav-links ${open ? "open" : ""}`}>
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={(l.href === "/" ? path === "/" : path?.startsWith(l.href.replace(/\/$/, ""))) ? "active" : ""}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="row gap">
          {address ? (
            <button className="btn" onClick={logout} title="Disconnect">
              <span className="mono small">{bal ? `${eth(Number(bal.formatted), 3)} ETH` : "…"}</span>
              <span className="muted">·</span>
              <span className="mono small">{short(address)}</span>
            </button>
          ) : (
            <button className="btn btn-silver" disabled={!ready} onClick={login}>
              Connect
            </button>
          )}
          <button className="menu-btn" onClick={() => setOpen(!open)} aria-label="Menu">
            ☰
          </button>
        </div>
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div>
          <div className="row gap" style={{ marginBottom: 6 }}>
            <img src="/logo.svg" alt="" width={20} height={20} />
            <b className="silver-text">GENESIS</b> <span>testnet</span>
          </div>
          <div>Ethereum Sepolia · test ETH only · not affiliated with LayerZero Labs</div>
        </div>
        <div className="row gap wrap">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
          <a href={MAINNET_URL} target="_blank" rel="noreferrer">
            genesislaunch.family ↗
          </a>
        </div>
      </div>
    </footer>
  );
}
