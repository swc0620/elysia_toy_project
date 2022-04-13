// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockDAIToken is ERC20 {
    constructor(
        string memory name_, 
        string memory symbol_
    ) ERC20(name_, symbol_) {
        _mint(address(this), 1e22);
    }

    function faucet() external {
        _transfer(address(this), msg.sender, 1e18);
    }
}