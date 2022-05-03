// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./test/UniswapV2PairConfig.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "./test/MockDAIToken.sol";
import "hardhat/console.sol";

contract Project {
    address public uniswapV2PairConfigContract;
    address public pairAddress;
    address public backingToken;
    address public auxiliaryToken;

    address public proposer;
    string public description;
    address public manufacturer;
    uint public minimumBacking;

    struct DueTime {
        bool open;
        uint closeTime;
    }

    DueTime public backingTime;
    uint public backersCount;
    mapping(address => uint) public backings;
    uint public totalBacking;

    event BackingCreated(address indexed backerAddress, uint amountBT);

    constructor(address proposer_, string memory description_, address manufacturer_) {        
        proposer = proposer_;
        description = description_;
        manufacturer = manufacturer_;

        // configuration contract is used by the proposer to achieve the premise, which is that the proposer has created BT-AT pair and has already added liquidity to the pair
        uniswapV2PairConfigContract = address(new UniswapV2PairConfig(proposer_, address(this)));
    }

    modifier isProposer {
        require(msg.sender == proposer);
        _;
    }

    function startBacking(uint backingDuration_, uint minimumBacking_, address pairAddress_, address backingToken_, address auxiliaryToken_) public isProposer {
        require(backingTime.open == false, "backing has already started");
        
        backingTime.open = true;
        backingTime.closeTime = block.timestamp + backingDuration_;

        MockDAIToken mockDAIToken = MockDAIToken(backingToken_);
        minimumBacking = minimumBacking_ * 10 ** mockDAIToken.decimals();
        pairAddress = pairAddress_;
        backingToken = backingToken_;
        auxiliaryToken = auxiliaryToken_;
    }

    function backProject(uint amountBT_, address router_) external {
        require(backingTime.open == true, "backing has not started");
        require(block.timestamp < backingTime.closeTime, "backing ended");

        // let this contract be in control of amountBT
        MockDAIToken mockDAIToken = MockDAIToken(backingToken);
        MockWETHToken mockWETHToken = MockWETHToken(auxiliaryToken);

        uint amountBT = amountBT_ * 10 ** mockDAIToken.decimals();

        require(amountBT >= minimumBacking, "unsufficient backing.");
        address backerAddress = msg.sender;
        require(mockDAIToken.transferFrom(backerAddress, address(this), amountBT), "transferFrom failed.");
    
        // approve UniswapV2Rounter to withdraw amountBT
        require(mockDAIToken.increaseAllowance(router_, amountBT), "increaseAllowance failed.");
        
        // swap BT-AT
        address[] memory path = new address[](2);
        path[0] = backingToken;
        path[1] = auxiliaryToken;
        IUniswapV2Router02 uniswapV2Router02 = IUniswapV2Router02(router_);
        uint[] memory amounts = uniswapV2Router02.swapExactTokensForTokens(amountBT/2, 1, path, address(this), block.timestamp+300);

        require(mockWETHToken.increaseAllowance(router_, amounts[1]), "increaseAllowance failed.");

        // add liquidity to BT-AT pair
        uniswapV2Router02.addLiquidity(backingToken, auxiliaryToken, amountBT/2, amounts[1], amountBT/2000, amounts[1]/2000, address(this), block.timestamp+300);

        // update backer data
        totalBacking += amountBT;
        if (backings[backerAddress] == 0) {
            backersCount += 1;
        }
        backings[backerAddress] += amountBT;

        emit BackingCreated(backerAddress, amountBT);
    }
}