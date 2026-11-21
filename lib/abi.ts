// Generated from contracts/artifacts
export const factoryAbi = [
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "router_",
    "type": "address"
   },
   {
    "internalType": "uint256",
    "name": "virtualEth_",
    "type": "uint256"
   },
   {
    "internalType": "uint256",
    "name": "virtualTokens_",
    "type": "uint256"
   }
  ],
  "stateMutability": "nonpayable",
  "type": "constructor"
 },
 {
  "inputs": [],
  "name": "BadFee",
  "type": "error"
 },
 {
  "inputs": [],
  "name": "BadParams",
  "type": "error"
 },
 {
  "inputs": [],
  "name": "IsGraduated",
  "type": "error"
 },
 {
  "inputs": [],
  "name": "NotCreator",
  "type": "error"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "owner",
    "type": "address"
   }
  ],
  "name": "OwnableInvalidOwner",
  "type": "error"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "account",
    "type": "address"
   }
  ],
  "name": "OwnableUnauthorizedAccount",
  "type": "error"
 },
 {
  "inputs": [],
  "name": "ReentrancyGuardReentrantCall",
  "type": "error"
 },
 {
  "inputs": [],
  "name": "Slippage",
  "type": "error"
 },
 {
  "inputs": [],
  "name": "TransferFailed",
  "type": "error"
 },
 {
  "inputs": [],
  "name": "UnknownToken",
  "type": "error"
 },
 {
  "anonymous": false,
  "inputs": [
   {
    "indexed": true,
    "internalType": "address",
    "name": "token",
    "type": "address"
   },
   {
    "indexed": false,
    "internalType": "uint256",
    "name": "ethSpent",
    "type": "uint256"
   },
   {
    "indexed": false,
    "internalType": "uint256",
    "name": "tokensBurned",
    "type": "uint256"
   }
  ],
  "name": "BuybackBurn",
  "type": "event"
 },
 {
  "anonymous": false,
  "inputs": [
   {
    "indexed": true,
    "internalType": "address",
    "name": "account",
    "type": "address"
   },
   {
    "indexed": false,
    "internalType": "uint256",
    "name": "amount",
    "type": "uint256"
   }
  ],
  "name": "Claimed",
  "type": "event"
 },
 {
  "anonymous": false,
  "inputs": [
   {
    "indexed": true,
    "internalType": "address",
    "name": "token",
    "type": "address"
   },
   {
    "indexed": false,
    "internalType": "address",
    "name": "feeRecipient",
    "type": "address"
   },
   {
    "indexed": false,
    "internalType": "uint16",
    "name": "burnBps",
    "type": "uint16"
   }
  ],
  "name": "CreatorFeeUpdated",
  "type": "event"
 },
 {
  "anonymous": false,
  "inputs": [
   {
    "indexed": true,
    "internalType": "address",
    "name": "token",
    "type": "address"
   },
   {
    "indexed": false,
    "internalType": "uint256",
    "name": "ethLiquidity",
    "type": "uint256"
   },
   {
    "indexed": false,
    "internalType": "uint256",
    "name": "tokenLiquidity",
    "type": "uint256"
   }
  ],
  "name": "Graduated",
  "type": "event"
 },
 {
  "anonymous": false,
  "inputs": [
   {
    "indexed": true,
    "internalType": "address",
    "name": "previousOwner",
    "type": "address"
   },
   {
    "indexed": true,
    "internalType": "address",
    "name": "newOwner",
    "type": "address"
   }
  ],
  "name": "OwnershipTransferred",
  "type": "event"
 },
 {
  "anonymous": false,
  "inputs": [
   {
    "indexed": true,
    "internalType": "address",
    "name": "token",
    "type": "address"
   },
   {
    "indexed": true,
    "internalType": "address",
    "name": "creator",
    "type": "address"
   },
   {
    "indexed": false,
    "internalType": "string",
    "name": "name",
    "type": "string"
   },
   {
    "indexed": false,
    "internalType": "string",
    "name": "symbol",
    "type": "string"
   },
   {
    "indexed": false,
    "internalType": "string",
    "name": "metadata",
    "type": "string"
   },
   {
    "indexed": false,
    "internalType": "uint16",
    "name": "totalFeeBps",
    "type": "uint16"
   },
   {
    "indexed": false,
    "internalType": "address",
    "name": "feeRecipient",
    "type": "address"
   },
   {
    "indexed": false,
    "internalType": "uint16",
    "name": "burnBps",
    "type": "uint16"
   }
  ],
  "name": "TokenCreated",
  "type": "event"
 },
 {
  "anonymous": false,
  "inputs": [
   {
    "indexed": true,
    "internalType": "address",
    "name": "token",
    "type": "address"
   },
   {
    "indexed": true,
    "internalType": "address",
    "name": "trader",
    "type": "address"
   },
   {
    "indexed": false,
    "internalType": "bool",
    "name": "isBuy",
    "type": "bool"
   },
   {
    "indexed": false,
    "internalType": "uint256",
    "name": "ethAmount",
    "type": "uint256"
   },
   {
    "indexed": false,
    "internalType": "uint256",
    "name": "tokenAmount",
    "type": "uint256"
   },
   {
    "indexed": false,
    "internalType": "uint256",
    "name": "fee",
    "type": "uint256"
   },
   {
    "indexed": false,
    "internalType": "uint256",
    "name": "vEth",
    "type": "uint256"
   },
   {
    "indexed": false,
    "internalType": "uint256",
    "name": "vTokens",
    "type": "uint256"
   },
   {
    "indexed": false,
    "internalType": "uint256",
    "name": "realEth",
    "type": "uint256"
   }
  ],
  "name": "Trade",
  "type": "event"
 },
 {
  "inputs": [],
  "name": "BPS",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "CURVE_SUPPLY",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "DEAD",
  "outputs": [
   {
    "internalType": "address",
    "name": "",
    "type": "address"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "MAX_TOTAL_FEE_BPS",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "MIN_TOTAL_FEE_BPS",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "PROTOCOL_FEE_BPS",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "TOTAL_SUPPLY",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "name": "allTokens",
  "outputs": [
   {
    "internalType": "address",
    "name": "",
    "type": "address"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "token",
    "type": "address"
   },
   {
    "internalType": "uint256",
    "name": "minTokensOut",
    "type": "uint256"
   }
  ],
  "name": "buy",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "payable",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "token",
    "type": "address"
   }
  ],
  "name": "buybackAndBurn",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "",
    "type": "address"
   }
  ],
  "name": "buybackPool",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "claim",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "",
    "type": "address"
   }
  ],
  "name": "claimable",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "string",
    "name": "name",
    "type": "string"
   },
   {
    "internalType": "string",
    "name": "symbol",
    "type": "string"
   },
   {
    "internalType": "string",
    "name": "metadata",
    "type": "string"
   },
   {
    "internalType": "uint16",
    "name": "totalFeeBps",
    "type": "uint16"
   },
   {
    "internalType": "address",
    "name": "feeRecipient",
    "type": "address"
   },
   {
    "internalType": "uint16",
    "name": "burnBps",
    "type": "uint16"
   },
   {
    "internalType": "uint256",
    "name": "minTokensOut",
    "type": "uint256"
   }
  ],
  "name": "createToken",
  "outputs": [
   {
    "internalType": "address",
    "name": "token",
    "type": "address"
   }
  ],
  "stateMutability": "payable",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "",
    "type": "address"
   }
  ],
  "name": "curves",
  "outputs": [
   {
    "internalType": "address",
    "name": "creator",
    "type": "address"
   },
   {
    "internalType": "address",
    "name": "feeRecipient",
    "type": "address"
   },
   {
    "internalType": "uint16",
    "name": "totalFeeBps",
    "type": "uint16"
   },
   {
    "internalType": "uint16",
    "name": "burnBps",
    "type": "uint16"
   },
   {
    "internalType": "bool",
    "name": "graduated",
    "type": "bool"
   },
   {
    "internalType": "uint64",
    "name": "createdAt",
    "type": "uint64"
   },
   {
    "internalType": "uint256",
    "name": "vEth",
    "type": "uint256"
   },
   {
    "internalType": "uint256",
    "name": "vTokens",
    "type": "uint256"
   },
   {
    "internalType": "uint256",
    "name": "realEth",
    "type": "uint256"
   },
   {
    "internalType": "uint256",
    "name": "tokensSold",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "token",
    "type": "address"
   }
  ],
  "name": "ethToGraduate",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "uint256",
    "name": "offset",
    "type": "uint256"
   },
   {
    "internalType": "uint256",
    "name": "limit",
    "type": "uint256"
   }
  ],
  "name": "getTokens",
  "outputs": [
   {
    "internalType": "address[]",
    "name": "out",
    "type": "address[]"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "launchFee",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "owner",
  "outputs": [
   {
    "internalType": "address",
    "name": "",
    "type": "address"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "token",
    "type": "address"
   },
   {
    "internalType": "uint256",
    "name": "ethIn",
    "type": "uint256"
   }
  ],
  "name": "quoteBuy",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "tokensOut",
    "type": "uint256"
   },
   {
    "internalType": "uint256",
    "name": "fee",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "token",
    "type": "address"
   },
   {
    "internalType": "uint256",
    "name": "tokenAmount",
    "type": "uint256"
   }
  ],
  "name": "quoteSell",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "ethOut",
    "type": "uint256"
   },
   {
    "internalType": "uint256",
    "name": "fee",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "renounceOwnership",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "router",
  "outputs": [
   {
    "internalType": "address",
    "name": "",
    "type": "address"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "token",
    "type": "address"
   },
   {
    "internalType": "uint256",
    "name": "tokenAmount",
    "type": "uint256"
   },
   {
    "internalType": "uint256",
    "name": "minEthOut",
    "type": "uint256"
   }
  ],
  "name": "sell",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "ethOut",
    "type": "uint256"
   }
  ],
  "stateMutability": "nonpayable",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "token",
    "type": "address"
   },
   {
    "internalType": "address",
    "name": "feeRecipient",
    "type": "address"
   },
   {
    "internalType": "uint16",
    "name": "burnBps",
    "type": "uint16"
   }
  ],
  "name": "setCreatorFee",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "uint256",
    "name": "f",
    "type": "uint256"
   }
  ],
  "name": "setLaunchFee",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "r",
    "type": "address"
   }
  ],
  "name": "setRouter",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "tokenCount",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "newOwner",
    "type": "address"
   }
  ],
  "name": "transferOwnership",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "virtualEth",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "virtualTokens",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "stateMutability": "payable",
  "type": "receive"
 }
] as const;

export const tokenAbi = [
 {
  "inputs": [
   {
    "internalType": "string",
    "name": "name_",
    "type": "string"
   },
   {
    "internalType": "string",
    "name": "symbol_",
    "type": "string"
   },
   {
    "internalType": "string",
    "name": "metadata_",
    "type": "string"
   },
   {
    "internalType": "address",
    "name": "creator_",
    "type": "address"
   },
   {
    "internalType": "uint256",
    "name": "supply_",
    "type": "uint256"
   }
  ],
  "stateMutability": "nonpayable",
  "type": "constructor"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "spender",
    "type": "address"
   },
   {
    "internalType": "uint256",
    "name": "allowance",
    "type": "uint256"
   },
   {
    "internalType": "uint256",
    "name": "needed",
    "type": "uint256"
   }
  ],
  "name": "ERC20InsufficientAllowance",
  "type": "error"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "sender",
    "type": "address"
   },
   {
    "internalType": "uint256",
    "name": "balance",
    "type": "uint256"
   },
   {
    "internalType": "uint256",
    "name": "needed",
    "type": "uint256"
   }
  ],
  "name": "ERC20InsufficientBalance",
  "type": "error"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "approver",
    "type": "address"
   }
  ],
  "name": "ERC20InvalidApprover",
  "type": "error"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "receiver",
    "type": "address"
   }
  ],
  "name": "ERC20InvalidReceiver",
  "type": "error"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "sender",
    "type": "address"
   }
  ],
  "name": "ERC20InvalidSender",
  "type": "error"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "spender",
    "type": "address"
   }
  ],
  "name": "ERC20InvalidSpender",
  "type": "error"
 },
 {
  "anonymous": false,
  "inputs": [
   {
    "indexed": true,
    "internalType": "address",
    "name": "owner",
    "type": "address"
   },
   {
    "indexed": true,
    "internalType": "address",
    "name": "spender",
    "type": "address"
   },
   {
    "indexed": false,
    "internalType": "uint256",
    "name": "value",
    "type": "uint256"
   }
  ],
  "name": "Approval",
  "type": "event"
 },
 {
  "anonymous": false,
  "inputs": [
   {
    "indexed": true,
    "internalType": "address",
    "name": "from",
    "type": "address"
   },
   {
    "indexed": true,
    "internalType": "address",
    "name": "to",
    "type": "address"
   },
   {
    "indexed": false,
    "internalType": "uint256",
    "name": "value",
    "type": "uint256"
   }
  ],
  "name": "Transfer",
  "type": "event"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "owner",
    "type": "address"
   },
   {
    "internalType": "address",
    "name": "spender",
    "type": "address"
   }
  ],
  "name": "allowance",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "spender",
    "type": "address"
   },
   {
    "internalType": "uint256",
    "name": "value",
    "type": "uint256"
   }
  ],
  "name": "approve",
  "outputs": [
   {
    "internalType": "bool",
    "name": "",
    "type": "bool"
   }
  ],
  "stateMutability": "nonpayable",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "account",
    "type": "address"
   }
  ],
  "name": "balanceOf",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "uint256",
    "name": "value",
    "type": "uint256"
   }
  ],
  "name": "burn",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "account",
    "type": "address"
   },
   {
    "internalType": "uint256",
    "name": "value",
    "type": "uint256"
   }
  ],
  "name": "burnFrom",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "creator",
  "outputs": [
   {
    "internalType": "address",
    "name": "",
    "type": "address"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "decimals",
  "outputs": [
   {
    "internalType": "uint8",
    "name": "",
    "type": "uint8"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "factory",
  "outputs": [
   {
    "internalType": "address",
    "name": "",
    "type": "address"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "metadata",
  "outputs": [
   {
    "internalType": "string",
    "name": "",
    "type": "string"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "name",
  "outputs": [
   {
    "internalType": "string",
    "name": "",
    "type": "string"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "symbol",
  "outputs": [
   {
    "internalType": "string",
    "name": "",
    "type": "string"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "totalSupply",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "to",
    "type": "address"
   },
   {
    "internalType": "uint256",
    "name": "value",
    "type": "uint256"
   }
  ],
  "name": "transfer",
  "outputs": [
   {
    "internalType": "bool",
    "name": "",
    "type": "bool"
   }
  ],
  "stateMutability": "nonpayable",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "from",
    "type": "address"
   },
   {
    "internalType": "address",
    "name": "to",
    "type": "address"
   },
   {
    "internalType": "uint256",
    "name": "value",
    "type": "uint256"
   }
  ],
  "name": "transferFrom",
  "outputs": [
   {
    "internalType": "bool",
    "name": "",
    "type": "bool"
   }
  ],
  "stateMutability": "nonpayable",
  "type": "function"
 }
] as const;
