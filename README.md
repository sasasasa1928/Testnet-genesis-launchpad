# Genesis · testnet

Testnet version of [Genesis](https://genesislaunch.family), served at **testnet.genesislaunch.family**.
You can launch a coin, trade it on a bonding curve and graduate it on **Ethereum Sepolia**, using test ETH only.

```
/            Next.js app on Vercel (pages + API routes: /api/snapshot indexer, /api/upload, /api/og share images)
/contracts   Solidity contracts (Hardhat): GenesisFactory + GenesisToken
```

## How it works

- **Supply:** every coin has a fixed supply of 1B tokens. 800M are sold on a constant-product bonding curve with 0.1 ETH / 1.073B virtual reserves.
- **Graduation:** a coin graduates when the curve sells out, after about 0.29 ETH is raised. The raised ETH and the remaining 200M tokens become DEX liquidity. If a Uniswap V2-style router is set, LP tokens are burned. If not, the liquidity goes to the treasury.
- **Fees:** the creator sets a total fee from 1% to 10%. The protocol always takes 0.7% and the creator side gets the rest. The creator side can be paid to the creator, to another wallet, to holders, to buyback & burn, or split between wallet / holders / burn. Fees on testnet are in Sepolia ETH.
- **Holder rewards:** each token tracks rewards per share. The holders' part of every trade fee is split by balance, and holders claim anytime (`claimRewards`). The curve, the burn address and the DEX pool (or treasury) are excluded.
- **Points:** computed in the browser from on-chain events: +100 for each launch, +1 per 0.001 ETH traded, +1000 when your coin graduates.
- **Wallets:** Privy is used when `NEXT_PUBLIC_PRIVY_APP_ID` is set. Otherwise the app falls back to an injected wallet such as MetaMask or Rabby. When a user switches wallets, a pop-up asks them to sign again.
- **Demo mode:** with no `NEXT_PUBLIC_FACTORY_ADDRESS` set, the site shows demo coins and a "not deployed yet" banner.

## 1. Deploy the contract to Sepolia

**Easiest:** open `https://testnet.genesislaunch.family/deploy/`, connect your wallet, and tap **Deploy to Sepolia**. The page shows the two environment variables to paste into Vercel.

Or from a terminal:

```bash
cd contracts
npm install
npx hardhat test                      # 18 tests

DEPLOYER_PRIVATE_KEY=0x... \
npx hardhat run scripts/deploy.js --network sepolia
```

The script prints `NEXT_PUBLIC_FACTORY_ADDRESS` and `NEXT_PUBLIC_FACTORY_START_BLOCK`.
The deployer needs about 0.05 Sepolia ETH. Use a fresh wallet for this and never commit the key.

Optional settings:
- `UNISWAP_V2_ROUTER=0x...` turns on automatic DEX migration at graduation. You can also set it later with `setRouter`.
- `VIRTUAL_ETH=0.1` changes the curve size. The default makes graduation take about 0.29 ETH.

## 2. Deploy the site on Vercel

1. Import this repo in Vercel. Use Root Directory `./` and the Next.js preset.
2. Add these environment variables:
   - `NEXT_PUBLIC_PRIVY_APP_ID`: your Privy app ID
   - `NEXT_PUBLIC_FACTORY_ADDRESS`: from step 1
   - `NEXT_PUBLIC_FACTORY_START_BLOCK`: from step 1
   - `NEXT_PUBLIC_SEPOLIA_RPC_URL` (optional): an Alchemy or Infura Sepolia URL, for faster loading
   - `NEXT_PUBLIC_LEGACY_FACTORIES` (optional): previous Genesis contracts, so their coins stay listed and tradable after you deploy a new one. Format: `0xOldAddress:startBlock[:version]`, comma-separated. Version `1` is the first testnet contract (no holder rewards) and is the default. The `/deploy/` page prints the right value after a redeploy.
3. In Settings → Domains, add `testnet.genesislaunch.family`. Then add the CNAME record Vercel shows you at Hostinger, with host `testnet`.
4. In the Privy dashboard, add `https://testnet.genesislaunch.family` to the allowed domains.

## Indexer, image upload and share cards

- **`/api/snapshot`** is the indexer. It keeps all Genesis events and fetches only new blocks on each refresh, so visitors don't each scan the chain. Responses are cached at the CDN for a few seconds. If it's unavailable, the browser falls back to reading the chain directly.
- **`/api/upload`** lets creators upload coin images (PNG/JPG/WEBP/GIF, max 4 MB) straight to Vercel Blob.
- **`/api/og/?a=0xToken`** renders the share image for a coin. Coin pages set it as their X/Telegram preview. The homepage has its own share image.

**Vercel Blob setup:** in the Vercel project, go to Storage → Create → Blob, then connect it to this project. That adds `BLOB_READ_WRITE_TOKEN` automatically. Redeploy. Without Blob, uploads fall back to pasting an image link, and the indexer still works but restarts its scan after cold starts.

## Local dev

```bash
npm install
cp .env.example .env.local   # fill in values
npm run dev
```

## Logo

`public/logo.png` (silver mark, transparent) and `app/icon.png` / `app/apple-icon.png` (app icons) are generated from the official Genesis logo.
