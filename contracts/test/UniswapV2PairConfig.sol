// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "./MockDAIToken.sol";
import "./MockWETHToken.sol";
import "hardhat/console.sol";

contract UniswapV2PairConfig {
    address public projectContract;
    address public proposer;

    constructor(address proposer_, address projectContract_) {
        proposer = proposer_;
        projectContract = projectContract_;
    }

    function addLiquidity(address backingToken_, address auxiliaryToken_, address router_, uint amountBT_, uint amountAT_) external {
        require(msg.sender == proposer);

        MockDAIToken mockDAIToken = MockDAIToken(backingToken_);
        MockWETHToken mockWETHToken = MockWETHToken(auxiliaryToken_);
        
        uint amountBT = amountBT_ * 10 ** mockDAIToken.decimals();
        uint amountAT = amountAT_ * 10 ** mockWETHToken.decimals();
        
        // gives UniswapV2Router an allowance of at least amountBT, amountAT desired on BT, AT
        mockDAIToken.increaseAllowance(router_, amountBT);
        mockWETHToken.increaseAllowance(router_, amountAT);

        // adds liquidity to BT-AT pair
        IUniswapV2Router02 uniswapV2Router02 = IUniswapV2Router02(router_);
        uniswapV2Router02.addLiquidity(backingToken_, auxiliaryToken_, amountBT, amountAT, amountBT*99/100, amountAT*99/100, projectContract, block.timestamp+300);
    }
}