// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
contract MockRouter {
    function factory() external view returns (address) { return address(this); }
    function WETH() external pure returns (address) { return address(1); }
    function getPair(address, address) external view returns (address) { return address(this); }
    uint256 public lastEth; uint256 public lastTokens; address public lastTo;
    function addLiquidityETH(address token, uint256 amt, uint256, uint256, address to, uint256)
        external payable returns (uint256, uint256, uint256)
    {
        IERC20(token).transferFrom(msg.sender, address(this), amt);
        lastEth = msg.value; lastTokens = amt; lastTo = to;
        return (amt, msg.value, 0);
    }
}
