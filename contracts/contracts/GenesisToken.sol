// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

/// @title GenesisToken
/// @notice Fixed-supply ERC20 minted once to the Genesis factory, which runs its bonding curve.
///
/// Holder rewards: the factory can send ETH to `distribute()`, which is shared pro-rata across all
/// holders by balance (reward-per-share accounting). Holders claim with `claimRewards()` at any time.
/// Accounts that should never earn (the curve/factory, the burn address, the DEX pool) are excluded.
contract GenesisToken is ERC20, ERC20Burnable {
    address public immutable factory;
    address public immutable creator;
    string public metadata; // JSON: {"description","image","website","x","telegram"}

    // ------------------------------------------------------------ holder rewards
    uint256 private constant MAGNITUDE = 2 ** 128;
    uint256 public magnifiedRewardPerShare;
    mapping(address => int256) private magnifiedCorrections;
    mapping(address => uint256) public withdrawnRewards;
    mapping(address => bool) public isExcludedFromRewards;
    uint256 public excludedSupply;
    uint256 public pendingRewards; // ETH received while nobody was eligible
    uint256 public totalRewardsDistributed;

    event RewardsDistributed(uint256 amount);
    event RewardsClaimed(address indexed account, uint256 amount);
    event ExcludedFromRewards(address indexed account);

    error OnlyFactory();
    error TransferFailed();

    constructor(
        string memory name_,
        string memory symbol_,
        string memory metadata_,
        address creator_,
        uint256 supply_
    ) ERC20(name_, symbol_) {
        factory = msg.sender;
        creator = creator_;
        metadata = metadata_;
        isExcludedFromRewards[msg.sender] = true; // curve inventory never earns
        isExcludedFromRewards[0x000000000000000000000000000000000000dEaD] = true;
        _mint(msg.sender, supply_);
    }

    /// @dev The factory is trusted to move tokens for curve sells (saves users an approve tx).
    function _spendAllowance(address owner, address spender, uint256 value) internal override {
        if (spender == factory) return;
        super._spendAllowance(owner, spender, value);
    }

    /// @dev Keeps reward accounting correct on every mint, burn and transfer.
    function _update(address from, address to, uint256 value) internal override {
        super._update(from, to, value);
        int256 mag = int256(magnifiedRewardPerShare * value);
        if (from != address(0)) {
            if (isExcludedFromRewards[from]) excludedSupply -= value;
            else magnifiedCorrections[from] += mag;
        }
        if (to != address(0)) {
            if (isExcludedFromRewards[to]) excludedSupply += value;
            else magnifiedCorrections[to] -= mag;
        }
    }

    /// @notice Supply that currently earns rewards.
    function rewardSupply() public view returns (uint256) {
        return totalSupply() - excludedSupply;
    }

    /// @notice Called by the factory with the holders' share of trade fees.
    function distribute() external payable {
        if (msg.sender != factory) revert OnlyFactory();
        uint256 amount = msg.value + pendingRewards;
        uint256 supply = rewardSupply();
        // Wait until at least 1 whole token is held by eligible holders (avoids dust-holder overflow/skew).
        if (supply < 1 ether) {
            pendingRewards = amount;
            return;
        }
        pendingRewards = 0;
        magnifiedRewardPerShare += (amount * MAGNITUDE) / supply;
        totalRewardsDistributed += amount;
        emit RewardsDistributed(amount);
    }

    /// @notice Exclude an account (e.g. the DEX pool) from earning. Only the factory can call this.
    function excludeFromRewards(address account) external {
        if (msg.sender != factory) revert OnlyFactory();
        if (isExcludedFromRewards[account]) return;
        isExcludedFromRewards[account] = true;
        excludedSupply += balanceOf(account);
        emit ExcludedFromRewards(account);
    }

    function accumulativeRewardsOf(address account) public view returns (uint256) {
        if (isExcludedFromRewards[account]) return withdrawnRewards[account];
        int256 total = int256(magnifiedRewardPerShare * balanceOf(account)) + magnifiedCorrections[account];
        return total <= 0 ? 0 : uint256(total) / MAGNITUDE;
    }

    /// @notice ETH the account can claim right now.
    function claimableRewardsOf(address account) public view returns (uint256) {
        uint256 acc = accumulativeRewardsOf(account);
        uint256 w = withdrawnRewards[account];
        return acc > w ? acc - w : 0;
    }

    function claimRewards() external returns (uint256 amount) {
        amount = claimableRewardsOf(msg.sender);
        if (amount == 0) return 0;
        withdrawnRewards[msg.sender] += amount;
        emit RewardsClaimed(msg.sender, amount);
        (bool ok,) = payable(msg.sender).call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
