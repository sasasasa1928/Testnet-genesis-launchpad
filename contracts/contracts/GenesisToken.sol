// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

/// @title GenesisToken
/// @notice Fixed-supply ERC20 minted once to the Genesis factory, which runs its bonding curve.
/// The factory can pull tokens for sells without a separate approve transaction.
contract GenesisToken is ERC20, ERC20Burnable {
    address public immutable factory;
    address public immutable creator;
    string public metadata; // JSON: {"description","image","website","x","telegram"}

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
        _mint(msg.sender, supply_);
    }

    /// @dev The factory is trusted to move tokens for curve sells (saves users an approve tx).
    function _spendAllowance(address owner, address spender, uint256 value) internal override {
        if (spender == factory) return;
        super._spendAllowance(owner, spender, value);
    }
}
