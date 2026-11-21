# Genesis · testnet

Testnet version of [Genesis](https://genesislaunch.family), served at **testnet.genesislaunch.family**.
You can launch a coin, trade it on a bonding curve and graduate it on **Ethereum Sepolia**, using test ETH only.

```
/            Next.js app (static export), deployed on Vercel
/contracts   Solidity contracts (Hardhat): GenesisFactory + GenesisToken
```

## How it works

- **Supply:** every coin has a fixed supply of 1B tokens. 800M are sold on a constant-product bonding curve with 0.1 ETH / 1.073B virtual reserves.
- **Graduation:** a coin graduates when the curve sells out, after about 0.29 ETH is raised. The raised ETH and the remaining 200M tokens become DEX liquidity. If a Uniswap V2-style router is set, LP tokens are burned. If not, the liquidity goes to the treasury.
- **Fees:** the creator sets a total fee from 1% to 10%. The protocol always takes 0.7% and the creator side gets the rest. The creator side can be paid to the creator, to another wallet, to buyback & burn, or split between a wallet and buyback & burn. Fees on testnet are in Sepolia ETH.
- **Points:** computed in the browser from on-chain events: +100 for each launch, +1 per 0.001 ETH traded, +1000 when your coin graduates.
- **Wallets:** Privy is used when `NEXT_PUBLIC_PRIVY_APP_ID` is set. Otherwise the app falls back to an injected wallet such as MetaMask or Rabby. When a user switches wallets, a pop-up asks them to sign again.
- **Demo mode:** with no `NEXT_PUBLIC_FACTORY_ADDRESS` set, the site shows demo coins and a "not deployed yet" banner.

## 1. Deploy the contract to Sepolia

```bash
cd contracts
npm install
npx hardhat test                      # 10 tests

DEPLOYER_PRIVATE_KEY=0x... \
TREASURY=0xYourTreasury \
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
3. In Settings → Domains, add `testnet.genesislaunch.family`. Then add the CNAME record Vercel shows you at Hostinger, with host `testnet`.
4. In the Privy dashboard, add `https://testnet.genesislaunch.family` to the allowed domains.

## Local dev

```bash
npm install
cp .env.example .env.local   # fill in values
npm run dev
```

## Logo

`public/logo.svg` and `app/icon.svg` are placeholder silver "G" marks. Replace them with the official Genesis logo files and keep the same file names.
