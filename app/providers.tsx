"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, createConfig as createWagmiConfig, WagmiProvider as PlainWagmiProvider, useAccount, useConnect, useDisconnect, useSignMessage } from "wagmi";
import { injected } from "@wagmi/core";
import { PrivyProvider, usePrivy } from "@privy-io/react-auth";
import { WagmiProvider as PrivyWagmiProvider, createConfig as createPrivyWagmiConfig } from "@privy-io/wagmi";
import type { Address } from "viem";
import { CHAIN, PRIVY_APP_ID, RPC_URL } from "@/lib/config";

type Wallet = { address?: Address; ready: boolean; login: () => void; logout: () => void };
const WalletCtx = createContext<Wallet>({ ready: false, login: () => {}, logout: () => {} });
export const useWallet = () => useContext(WalletCtx);

const queryClient = new QueryClient();
const transports = { [CHAIN.id]: http(RPC_URL) } as const;

// ---------------------------------------------------------------- Privy mode
const privyWagmi = createPrivyWagmiConfig({ chains: [CHAIN], transports });

function PrivyBridge({ children }: { children: ReactNode }) {
  const { ready, authenticated, login, logout } = usePrivy();
  const { address } = useAccount();
  return (
    <WalletCtx.Provider value={{ address: authenticated ? address : undefined, ready, login, logout }}>
      {children}
    </WalletCtx.Provider>
  );
}

// ------------------------------------------------------------ Injected mode
const plainWagmi = createWagmiConfig({ chains: [CHAIN], connectors: [injected()], transports, ssr: true });

function InjectedBridge({ children }: { children: ReactNode }) {
  const { address } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  return (
    <WalletCtx.Provider
      value={{
        address,
        ready: true,
        login: () => {
          const c = connectors[0];
          if (c) connect({ connector: c, chainId: CHAIN.id });
          else alert("No browser wallet found. Install MetaMask or Rabby.");
        },
        logout: () => disconnect(),
      }}
    >
      {children}
    </WalletCtx.Provider>
  );
}

// ------------------------------------------- re-sign when the wallet changes
function WalletSwitchGuard() {
  const { address } = useWallet();
  const prev = useRef<Address | undefined>(undefined);
  const [pending, setPending] = useState<Address | null>(null);
  const { signMessageAsync, isPending } = useSignMessage();

  useEffect(() => {
    if (address && prev.current && prev.current.toLowerCase() !== address.toLowerCase()) setPending(address);
    if (address) prev.current = address;
  }, [address]);

  if (!pending) return null;
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>Wallet switched</h3>
        <p className="muted">
          You switched to <span className="mono">{pending.slice(0, 6)}…{pending.slice(-4)}</span>. Sign a message to confirm
          this wallet on Genesis testnet. Signing is free and sends no transaction.
        </p>
        <div className="row gap">
          <button
            className="btn btn-silver"
            disabled={isPending}
            onClick={async () => {
              try {
                await signMessageAsync({
                  message: `Genesis testnet\nConfirm wallet ${pending}\n${new Date().toISOString()}`,
                });
                setPending(null);
              } catch {
                /* user rejected; keep the modal open */
              }
            }}
          >
            {isPending ? "Waiting for signature…" : "Sign to continue"}
          </button>
          <button className="btn btn-ghost" onClick={() => setPending(null)}>
            Later
          </button>
        </div>
      </div>
    </div>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (PRIVY_APP_ID && mounted) {
    return (
      <PrivyProvider
        appId={PRIVY_APP_ID}
        config={{
          appearance: { theme: "dark", accentColor: "#C9CDD2", logo: "/logo.png", walletChainType: "ethereum-only" },
          defaultChain: CHAIN,
          supportedChains: [CHAIN],
          embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" } },
        }}
      >
        <QueryClientProvider client={queryClient}>
          <PrivyWagmiProvider config={privyWagmi}>
            <PrivyBridge>
              {children}
              <WalletSwitchGuard />
            </PrivyBridge>
          </PrivyWagmiProvider>
        </QueryClientProvider>
      </PrivyProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <PlainWagmiProvider config={plainWagmi}>
        <InjectedBridge>
          {children}
          {mounted && <WalletSwitchGuard />}
        </InjectedBridge>
      </PlainWagmiProvider>
    </QueryClientProvider>
  );
}
