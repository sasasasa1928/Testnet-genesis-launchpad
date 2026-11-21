import { sepolia } from "viem/chains";
import { createPublicClient, getAddress, http, isAddress, type Address } from "viem";

export const CHAIN = sepolia;
export const RPC_URL = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
export const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";

// Tolerate stray spaces/quotes and non-checksummed casing when values are pasted into Vercel.
const clean = (v?: string) => (v || "").trim().replace(/^["']|["']$/g, "").trim();
const rawFactory = clean(process.env.NEXT_PUBLIC_FACTORY_ADDRESS);
export const FACTORY: Address | null = isAddress(rawFactory, { strict: false }) ? getAddress(rawFactory.toLowerCase()) : null;
const rawBlock = clean(process.env.NEXT_PUBLIC_FACTORY_START_BLOCK).replace(/[^0-9]/g, "");
export const START_BLOCK = BigInt(rawBlock || "0");

export type FactoryInfo = { address: Address; startBlock: bigint; version: 1 | 2; current: boolean };

/**
 * Previous Genesis contracts, so their coins stay listed and tradable after an upgrade.
 * Format: NEXT_PUBLIC_LEGACY_FACTORIES="0xOldAddress:startBlock[:version],0xOther:block"
 * (version defaults to 1 = the first testnet contract, without holder rewards).
 */
const legacy: FactoryInfo[] = clean(process.env.NEXT_PUBLIC_LEGACY_FACTORIES)
  .split(/[,\s]+/)
  .map((entry) => entry.trim())
  .filter(Boolean)
  .flatMap((entry): FactoryInfo[] => {
    const [addr, block, ver] = entry.split(":").map((x) => clean(x));
    if (!isAddress(addr, { strict: false })) return [];
    const address = getAddress(addr.toLowerCase());
    if (FACTORY && address === FACTORY) return [];
    return [{ address, startBlock: BigInt((block || "0").replace(/[^0-9]/g, "") || "0"), version: ver === "2" ? 2 : 1, current: false }];
  });

/** All Genesis contracts the site reads: the current one first, then previous ones. */
export const FACTORIES: FactoryInfo[] = [
  ...(FACTORY ? [{ address: FACTORY, startBlock: START_BLOCK, version: 2 as const, current: true }] : []),
  ...legacy,
];

export const isGenesisFactory = (a: string) => FACTORIES.some((f) => f.address.toLowerCase() === a.toLowerCase());

/** Demo mode = no contract configured yet; the UI shows sample coins. */
export const DEMO = FACTORY === null;

export const EXPLORER = "https://sepolia.etherscan.io";
export const MAINNET_URL = "https://genesislaunch.family";

export const TOTAL_SUPPLY = 1_000_000_000;
export const CURVE_SUPPLY = 800_000_000;
export const PROTOCOL_FEE_PCT = 0.7;

export const publicClient = createPublicClient({ chain: CHAIN, transport: http(RPC_URL) });

export const FAUCETS = [
  { name: "Google Cloud Web3 faucet", url: "https://cloud.google.com/application/web3/faucet/ethereum/sepolia", note: "Google account, daily drip" },
  { name: "Alchemy Sepolia faucet", url: "https://www.alchemy.com/faucets/ethereum-sepolia", note: "Free Alchemy account" },
  { name: "QuickNode faucet", url: "https://faucet.quicknode.com/ethereum/sepolia", note: "Drip every 12 hours" },
  { name: "Sepolia PoW faucet", url: "https://sepolia-faucet.pk910.de/", note: "Mine test ETH in your browser" },
];

/** Points rules (computed from on-chain events). */
export const POINTS = {
  launch: 100,
  perEthVolume: 1000, // 1 point per 0.001 ETH traded
  graduation: 1000, // your coin graduates
};
