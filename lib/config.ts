import { sepolia } from "viem/chains";
import { createPublicClient, http, isAddress, type Address } from "viem";

export const CHAIN = sepolia;
export const RPC_URL = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
export const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";

const rawFactory = process.env.NEXT_PUBLIC_FACTORY_ADDRESS || "";
export const FACTORY: Address | null = isAddress(rawFactory) ? (rawFactory as Address) : null;
export const START_BLOCK = BigInt(process.env.NEXT_PUBLIC_FACTORY_START_BLOCK || "0");

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
