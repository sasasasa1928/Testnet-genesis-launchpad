// Deploy GenesisFactory to Ethereum Sepolia.
//   DEPLOYER_PRIVATE_KEY=0x... [UNISWAP_V2_ROUTER=0x...] npx hardhat run scripts/deploy.js --network sepolia
const { ethers, network } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const router = process.env.UNISWAP_V2_ROUTER || ethers.ZeroAddress;
  const virtualEth = ethers.parseEther(process.env.VIRTUAL_ETH || "0.1"); // ~0.293 ETH to graduate
  const virtualTokens = ethers.parseEther("1073000000");

  console.log(`Network:  ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
  console.log(`Router:   ${router === ethers.ZeroAddress ? "none (graduation liquidity -> treasury)" : router}`);

  const F = await ethers.getContractFactory("GenesisFactory");
  const f = await F.deploy(router, virtualEth, virtualTokens);
  await f.waitForDeployment();
  const addr = await f.getAddress();
  const block = await ethers.provider.getBlockNumber();
  console.log(`\nGenesisFactory deployed: ${addr}`);
  console.log(`\nAdd these to Vercel (testnet project) environment variables:`);
  console.log(`NEXT_PUBLIC_FACTORY_ADDRESS=${addr}`);
  console.log(`NEXT_PUBLIC_FACTORY_START_BLOCK=${block}`);
  console.log(`\nVerify (optional): npx hardhat verify --network sepolia ${addr} ${router} ${virtualEth} ${virtualTokens}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
