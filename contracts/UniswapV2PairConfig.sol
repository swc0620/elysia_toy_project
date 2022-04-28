// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "./MockDAIToken.sol";
import "./MockWETHToken.sol";

contract UniswapV2PairConfig {
    address public projectContract;
    address public proposer;

    address public backingToken;
    address public auxiliaryToken;
    address public pairAddress;

    constructor(address proposer_, address projectContract_) {
        proposer = proposer_;
        projectContract = projectContract_;
    }

    modifier isProposer {
        require(msg.sender == proposer);
        _;
    }

    function createPair(address backingToken_, address auxiliaryToken_) external isProposer {
        // creates BT-AT pair
        IUniswapV2Factory uniswapV2Factory = IUniswapV2Factory(0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f);
        pairAddress = uniswapV2Factory.createPair(backingToken_, auxiliaryToken_);

        backingToken = backingToken_;
        auxiliaryToken = auxiliaryToken_;
    }

    function addLiquidity(uint amountBT_, uint amountAT_) external isProposer returns (uint, uint, uint) {
        MockDAIToken mockDAIToken = MockDAIToken(backingToken);
        MockWETHToken mockWETHToken = MockWETHToken(auxiliaryToken);
        
        uint amountBT = amountBT_ * 10 ** mockDAIToken.decimals();
        uint amountAT = amountAT_ * 10 ** mockWETHToken.decimals();
        
        // gives UniswapV2Router an allowance of at least amountBT, amountAT desired on BT, AT
        mockDAIToken.increaseAllowance(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D, amountBT);
        mockWETHToken.increaseAllowance(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D, amountAT);

        // adds liquidity to BT-AT pair
        IUniswapV2Router02 uniswapV2Router02 = IUniswapV2Router02(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);
        return (uniswapV2Router02.addLiquidity(backingToken, auxiliaryToken, amountBT, amountAT, amountBT*99/100, amountAT*99/100, projectContract, block.timestamp));
    }
}