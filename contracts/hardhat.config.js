require("@nomicfoundation/hardhat-toolbox");
const path = require("path");
const { subtask } = require("hardhat/config");
const { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } = require("hardhat/builtin-tasks/task-names");

// Use the bundled solc-js compiler (no compiler download needed).
subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD, async (args, hre, runSuper) => {
  if (args.solcVersion === "0.8.24") {
    const compilerPath = path.join(__dirname, "node_modules", "solc", "soljson.js");
    return { compilerPath, isSolcJs: true, version: args.solcVersion, longVersion: "0.8.24+commit.e11b9ed9" };
  }
  return runSuper();
});

const PK = process.env.DEPLOYER_PRIVATE_KEY;
module.exports = {
  solidity: { version: "0.8.24", settings: { optimizer: { enabled: true, runs: 200 }, viaIR: true } },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
      accounts: PK ? [PK] : [],
    },
  },
  etherscan: { apiKey: process.env.ETHERSCAN_API_KEY || "" },
};
