// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "./test/UniswapV2PairConfig.sol";
import "./test/FaucetableERC20.sol";
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

    uint public backingCloseTime;
    uint public backersCount;
    mapping(address => uint) public backings;
    uint public totalBacking;

    uint public approvalCloseTime;
    mapping(address => bool) public approvals;

    event BackingCreated(address indexed backerAddress, uint amountBT);

    constructor(address proposer_, string memory description_, address manufacturer_) {        
        proposer = proposer_;
        description = description_;
        manufacturer = manufacturer_;

        // configuration contract is used by the proposer to achieve the premise, which is that the proposer has created BT-AT pair and has already added liquidity to the pair
        uniswapV2PairConfigContract = address(new UniswapV2PairConfig(proposer_, address(this)));
    }

    modifier isProposer {
        require(msg.sender == proposer, "msg.sender is not the proposer");
        _;
    }

    function startBacking(uint backingDuration_, uint minimumBacking_, address pairAddress_, address backingToken_, address auxiliaryToken_) public isProposer {        
        require(backingCloseTime == 0, "backing has already started");
        backingCloseTime = block.timestamp + backingDuration_;

        minimumBacking = minimumBacking_;
        pairAddress = pairAddress_;
        backingToken = backingToken_;
        auxiliaryToken = auxiliaryToken_;
    }

    // amountMinMultiplier_ is a multiplier used to decide amountAMin and amountBMin in UniswapV2Router02. Checkout UniswapV2 docs for more detail.
    function backProject(uint amountBT_, uint amountMinMultiplier_, address router_) external {
        require(block.timestamp < backingCloseTime, "backing did not start yet or backing already ended");

        // let this contract be in control of amountBT
        FaucetableERC20 mockDAIToken = FaucetableERC20(backingToken);
        FaucetableERC20 mockWETHToken = FaucetableERC20(auxiliaryToken);

        require(amountBT_ >= minimumBacking, "unsufficient backing.");
        address backerAddress = msg.sender;
        require(mockDAIToken.transferFrom(backerAddress, address(this), amountBT_), "transferFrom failed.");
    
        // approve UniswapV2Rounter to withdraw amountBT
        require(mockDAIToken.increaseAllowance(router_, amountBT_), "increaseAllowance failed.");
        
        // swap BT-AT
        address[] memory path = new address[](2);
        path[0] = backingToken;
        path[1] = auxiliaryToken;
        IUniswapV2Router02 uniswapV2Router02 = IUniswapV2Router02(router_);
        // amounts[0]: amount of input token, amounts[1]: amount of output token
        uint[] memory amounts = uniswapV2Router02.swapExactTokensForTokens(amountBT_/2, 1, path, address(this), block.timestamp+300);

        require(mockWETHToken.increaseAllowance(router_, amounts[1]), "increaseAllowance failed.");

        // add liquidity to BT-AT pair
        uniswapV2Router02.addLiquidity(backingToken, auxiliaryToken, amountBT_/2, amounts[1], amountBT_/amountMinMultiplier_, amounts[1]/amountMinMultiplier_, address(this), block.timestamp+300);

        // update backer data
        totalBacking += amountBT_;
        if (backings[backerAddress] == 0) {
            backersCount += 1;
        }
        backings[backerAddress] += amountBT_;

        emit BackingCreated(backerAddress, amountBT_);
    }

    function startApproval(uint approvalDuration_) external isProposer {
        require(backingCloseTime != 0, "backing did not start yet");
        require(approvalCloseTime == 0, "approval has already started");
        require(block.timestamp >= backingCloseTime);

        approvalCloseTime = block.timestamp + approvalDuration_;
    }

    function approveProject() external {
        require(block.timestamp < approvalCloseTime, "approval did not start yet or backing already ended");
        require(backings[msg.sender] > 0, "msg.sender is not on the backers list");
        require(approvals[msg.sender] == false, "msg.sender has already voted");

    }
}