// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {GenesisToken} from "./GenesisToken.sol";

interface IUniswapV2Factory {
    function getPair(address a, address b) external view returns (address);
}

interface IUniswapV2Router02 {
    function factory() external view returns (address);
    function WETH() external view returns (address);

    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external payable returns (uint256, uint256, uint256);
}

/// @title GenesisFactory
/// @notice Launch a coin, trade it on a constant-product bonding curve, graduate it to a DEX.
///
/// Fees (charged in the chain's native token, ETH on Sepolia):
///  - Total trade fee is chosen by the creator between 1% and 10%.
///  - Protocol always takes 0.7%; the creator side gets the rest (0.3% - 9.3%).
///  - The creator side is split three ways, chosen by the creator:
///      payout wallet / holders (pro-rata by balance, claimable) / buyback & burn.
contract GenesisFactory is Ownable, ReentrancyGuard {
    // ---------------------------------------------------------------- constants
    uint256 public constant BPS = 10_000;
    uint256 public constant PROTOCOL_FEE_BPS = 70; // 0.7%
    uint256 public constant MIN_TOTAL_FEE_BPS = 100; // 1%
    uint256 public constant MAX_TOTAL_FEE_BPS = 1_000; // 10%
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 ether;
    uint256 public constant CURVE_SUPPLY = 800_000_000 ether; // sold on the curve
    address public constant DEAD = 0x000000000000000000000000000000000000dEaD;

    // ------------------------------------------------------------------- config
    uint256 public immutable virtualEth; // initial virtual ETH reserve
    uint256 public immutable virtualTokens; // initial virtual token reserve
    /// @notice Genesis treasury. Hard-coded and immutable: receives the 0.7% protocol fee
    /// (and graduation liquidity when no router is set). Cannot be changed by anyone.
    address private constant treasury = 0xc6D30E0B0F64Ca07942Efd3646A6e224F54ecfb9;
    address public router; // Uniswap V2-style router; zero = send migration liquidity to treasury
    uint256 public launchFee; // flat fee to create a coin (0 on testnet)

    struct Curve {
        address creator;
        address feeRecipient;
        uint16 totalFeeBps;
        uint16 burnBps; // share of the creator fee used for buyback & burn
        uint16 holderBps; // share of the creator fee shared with holders
        bool graduated;
        uint64 createdAt;
        uint256 vEth;
        uint256 vTokens;
        uint256 realEth;
        uint256 tokensSold;
    }

    mapping(address => Curve) public curves;
    address[] public allTokens;
    mapping(address => uint256) public claimable; // ETH owed (creator fees, protocol fees)
    mapping(address => uint256) public buybackPool; // ETH waiting to buy & burn per token

    // ------------------------------------------------------------------- events
    event TokenCreated(
        address indexed token,
        address indexed creator,
        string name,
        string symbol,
        string metadata,
        uint16 totalFeeBps,
        address feeRecipient,
        uint16 burnBps,
        uint16 holderBps
    );
    event Trade(
        address indexed token,
        address indexed trader,
        bool isBuy,
        uint256 ethAmount,
        uint256 tokenAmount,
        uint256 fee,
        uint256 vEth,
        uint256 vTokens,
        uint256 realEth
    );
    event Graduated(address indexed token, uint256 ethLiquidity, uint256 tokenLiquidity);
    event BuybackBurn(address indexed token, uint256 ethSpent, uint256 tokensBurned);
    event Claimed(address indexed account, uint256 amount);
    event CreatorFeeUpdated(address indexed token, address feeRecipient, uint16 burnBps, uint16 holderBps);
    event HolderRewards(address indexed token, uint256 amount);

    error BadFee();
    error BadParams();
    error UnknownToken();
    error IsGraduated();
    error Slippage();
    error NotCreator();
    error TransferFailed();

    constructor(address router_, uint256 virtualEth_, uint256 virtualTokens_) Ownable(msg.sender) {
        if (virtualTokens_ <= CURVE_SUPPLY || virtualEth_ == 0) revert BadParams();
        router = router_;
        virtualEth = virtualEth_;
        virtualTokens = virtualTokens_;
    }

    // ------------------------------------------------------------------- launch
    function createToken(
        string calldata name,
        string calldata symbol,
        string calldata metadata,
        uint16 totalFeeBps,
        address feeRecipient,
        uint16 burnBps,
        uint16 holderBps,
        uint256 minTokensOut
    ) external payable nonReentrant returns (address token) {
        if (totalFeeBps < MIN_TOTAL_FEE_BPS || totalFeeBps > MAX_TOTAL_FEE_BPS) revert BadFee();
        if (uint256(burnBps) + holderBps > BPS) revert BadFee();
        if (bytes(name).length == 0 || bytes(name).length > 32) revert BadParams();
        if (bytes(symbol).length == 0 || bytes(symbol).length > 10) revert BadParams();
        if (msg.value < launchFee) revert BadParams();
        if (feeRecipient == address(0)) feeRecipient = msg.sender;

        token = address(new GenesisToken(name, symbol, metadata, msg.sender, TOTAL_SUPPLY));
        curves[token] = Curve({
            creator: msg.sender,
            feeRecipient: feeRecipient,
            totalFeeBps: totalFeeBps,
            burnBps: burnBps,
            holderBps: holderBps,
            graduated: false,
            createdAt: uint64(block.timestamp),
            vEth: virtualEth,
            vTokens: virtualTokens,
            realEth: 0,
            tokensSold: 0
        });
        allTokens.push(token);
        if (launchFee > 0) claimable[treasury] += launchFee;

        emit TokenCreated(token, msg.sender, name, symbol, metadata, totalFeeBps, feeRecipient, burnBps, holderBps);

        uint256 initialBuy = msg.value - launchFee;
        if (initialBuy > 0) _buy(token, msg.sender, initialBuy, minTokensOut);
    }

    // -------------------------------------------------------------------- trade
    function buy(address token, uint256 minTokensOut) external payable nonReentrant returns (uint256) {
        return _buy(token, msg.sender, msg.value, minTokensOut);
    }

    function sell(address token, uint256 tokenAmount, uint256 minEthOut) external nonReentrant returns (uint256 ethOut) {
        Curve storage c = curves[token];
        if (c.creator == address(0)) revert UnknownToken();
        if (c.graduated) revert IsGraduated();
        if (tokenAmount == 0) revert BadParams();

        uint256 gross = (c.vEth * tokenAmount) / (c.vTokens + tokenAmount);
        if (gross > c.realEth) gross = c.realEth;
        uint256 fee = (gross * c.totalFeeBps) / BPS;
        ethOut = gross - fee;
        if (ethOut < minEthOut) revert Slippage();

        GenesisToken(token).transferFrom(msg.sender, address(this), tokenAmount);
        c.vEth -= gross;
        c.vTokens += tokenAmount;
        c.realEth -= gross;
        c.tokensSold -= tokenAmount;
        _distributeFee(token, c, fee);

        emit Trade(token, msg.sender, false, gross, tokenAmount, fee, c.vEth, c.vTokens, c.realEth);
        _send(msg.sender, ethOut);
    }

    function _buy(address token, address buyer, uint256 ethIn, uint256 minTokensOut) internal returns (uint256 tokensOut) {
        Curve storage c = curves[token];
        if (c.creator == address(0)) revert UnknownToken();
        if (c.graduated) revert IsGraduated();
        if (ethIn == 0) revert BadParams();

        uint256 fee = (ethIn * c.totalFeeBps) / BPS;
        uint256 net = ethIn - fee;
        tokensOut = (c.vTokens * net) / (c.vEth + net);
        uint256 remaining = CURVE_SUPPLY - c.tokensSold;
        uint256 refund;

        if (tokensOut >= remaining) {
            // Cap the buy at what's left on the curve and refund the rest.
            tokensOut = remaining;
            net = _divUp(c.vEth * remaining, c.vTokens - remaining);
            uint256 gross = _divUp(net * BPS, BPS - c.totalFeeBps);
            if (gross > ethIn) gross = ethIn; // rounding guard
            fee = gross - net;
            refund = ethIn - gross;
        }
        if (tokensOut < minTokensOut) revert Slippage();

        c.vEth += net;
        c.vTokens -= tokensOut;
        c.realEth += net;
        c.tokensSold += tokensOut;
        _distributeFee(token, c, fee);

        GenesisToken(token).transfer(buyer, tokensOut);
        emit Trade(token, buyer, true, net, tokensOut, fee, c.vEth, c.vTokens, c.realEth);

        if (c.tokensSold >= CURVE_SUPPLY) _graduate(token, c);
        if (refund > 0) _send(buyer, refund);
    }

    // --------------------------------------------------------------------- fees
    function _distributeFee(address token, Curve storage c, uint256 fee) internal {
        if (fee == 0) return;
        uint256 protocolPart = (fee * PROTOCOL_FEE_BPS) / c.totalFeeBps;
        uint256 creatorPart = fee - protocolPart;
        uint256 burnPart = (creatorPart * c.burnBps) / BPS;
        uint256 holderPart = (creatorPart * c.holderBps) / BPS;
        claimable[treasury] += protocolPart;
        claimable[c.feeRecipient] += creatorPart - burnPart - holderPart;
        if (holderPart > 0) {
            GenesisToken(token).distribute{value: holderPart}();
            emit HolderRewards(token, holderPart);
        }
        if (burnPart > 0) {
            if (c.graduated) claimable[c.feeRecipient] += burnPart;
            else buybackPool[token] += burnPart;
        }
    }

    /// @notice Anyone can trigger: spends the token's buyback pool on the curve (no fee) and burns the tokens.
    function buybackAndBurn(address token) external nonReentrant {
        Curve storage c = curves[token];
        if (c.creator == address(0)) revert UnknownToken();
        uint256 amount = buybackPool[token];
        if (amount == 0) return;
        buybackPool[token] = 0;
        if (c.graduated) {
            claimable[c.feeRecipient] += amount;
            return;
        }
        uint256 out = (c.vTokens * amount) / (c.vEth + amount);
        uint256 remaining = CURVE_SUPPLY - c.tokensSold;
        if (out >= remaining) {
            // Too close to graduation; hand the ETH to the fee recipient instead.
            claimable[c.feeRecipient] += amount;
            return;
        }
        c.vEth += amount;
        c.vTokens -= out;
        c.realEth += amount;
        c.tokensSold += out;
        GenesisToken(token).burn(out);
        emit Trade(token, address(this), true, amount, out, 0, c.vEth, c.vTokens, c.realEth);
        emit BuybackBurn(token, amount, out);
    }

    function setCreatorFee(address token, address feeRecipient, uint16 burnBps, uint16 holderBps) external {
        Curve storage c = curves[token];
        if (msg.sender != c.creator) revert NotCreator();
        if (feeRecipient == address(0) || uint256(burnBps) + holderBps > BPS) revert BadParams();
        c.feeRecipient = feeRecipient;
        c.burnBps = burnBps;
        c.holderBps = holderBps;
        emit CreatorFeeUpdated(token, feeRecipient, burnBps, holderBps);
    }

    function claim() external nonReentrant {
        uint256 amount = claimable[msg.sender];
        if (amount == 0) return;
        claimable[msg.sender] = 0;
        emit Claimed(msg.sender, amount);
        _send(msg.sender, amount);
    }

    // --------------------------------------------------------------- graduation
    function _graduate(address token, Curve storage c) internal {
        c.graduated = true;
        uint256 ethLiq = c.realEth;
        uint256 tokenLiq = GenesisToken(token).balanceOf(address(this));
        c.realEth = 0;
        // Leftover buyback ETH goes to the creator side.
        if (buybackPool[token] > 0) {
            claimable[c.feeRecipient] += buybackPool[token];
            buybackPool[token] = 0;
        }
        if (router != address(0)) {
            GenesisToken(token).approve(router, tokenLiq);
            IUniswapV2Router02(router).addLiquidityETH{value: ethLiq}(
                token, tokenLiq, 0, 0, DEAD, block.timestamp
            );
            // The DEX pool must not earn holder rewards.
            address pair = IUniswapV2Factory(IUniswapV2Router02(router).factory()).getPair(
                token, IUniswapV2Router02(router).WETH()
            );
            if (pair != address(0)) GenesisToken(token).excludeFromRewards(pair);
        } else {
            GenesisToken(token).excludeFromRewards(treasury);
            GenesisToken(token).transfer(treasury, tokenLiq);
            claimable[treasury] += ethLiq;
        }
        emit Graduated(token, ethLiq, tokenLiq);
    }

    // ------------------------------------------------------------------ views
    function tokenCount() external view returns (uint256) {
        return allTokens.length;
    }

    function getTokens(uint256 offset, uint256 limit) external view returns (address[] memory out) {
        uint256 n = allTokens.length;
        if (offset >= n) return new address[](0);
        uint256 end = offset + limit > n ? n : offset + limit;
        out = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) out[i - offset] = allTokens[n - 1 - i]; // newest first
    }

    function quoteBuy(address token, uint256 ethIn) external view returns (uint256 tokensOut, uint256 fee) {
        Curve storage c = curves[token];
        fee = (ethIn * c.totalFeeBps) / BPS;
        uint256 net = ethIn - fee;
        tokensOut = (c.vTokens * net) / (c.vEth + net);
        uint256 remaining = CURVE_SUPPLY - c.tokensSold;
        if (tokensOut > remaining) tokensOut = remaining;
    }

    function quoteSell(address token, uint256 tokenAmount) external view returns (uint256 ethOut, uint256 fee) {
        Curve storage c = curves[token];
        uint256 gross = (c.vEth * tokenAmount) / (c.vTokens + tokenAmount);
        if (gross > c.realEth) gross = c.realEth;
        fee = (gross * c.totalFeeBps) / BPS;
        ethOut = gross - fee;
    }

    /// @notice ETH (net of fees) needed to finish the curve.
    function ethToGraduate(address token) external view returns (uint256) {
        Curve storage c = curves[token];
        if (c.graduated) return 0;
        uint256 remaining = CURVE_SUPPLY - c.tokensSold;
        return _divUp(c.vEth * remaining, c.vTokens - remaining);
    }

    // ------------------------------------------------------------------ admin
    function setRouter(address r) external onlyOwner {
        router = r;
    }

    function setLaunchFee(uint256 f) external onlyOwner {
        launchFee = f;
    }

    // ---------------------------------------------------------------- helpers
    function _send(address to, uint256 amount) internal {
        (bool ok,) = payable(to).call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    function _divUp(uint256 a, uint256 b) internal pure returns (uint256) {
        return (a + b - 1) / b;
    }

    receive() external payable {}
}
