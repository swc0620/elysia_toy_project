// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./UniswapV2PairConfig.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "./MockDAIToken.sol";

contract Project {
    address uniswapV2PairConfigContract;
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
    uint private _backersCount;
    mapping(address => uint) private _backings;
    uint private _totalBacking;

    constructor(address proposer_, string memory description_, uint minimumBacking_, address manufacturer_) {        
        proposer = proposer_;
        description = description_;
        minimumBacking = minimumBacking_;
        manufacturer = manufacturer_;

        // configuration contract is used by the proposer to achieve the premise, which is the proposer has created BT-AT pair and added liquidity to the pair
        uniswapV2PairConfigContract = address(new UniswapV2PairConfig(proposer_, address(this)));
    }

    modifier isProposer {
        require(msg.sender == proposer);
        _;
    }

    function startBacking(uint backingDuration_, address pairAddress_, address backingToken_, address auxiliaryToken_) public isProposer {
        require(backingTime.open == false);
        
        backingTime.open = true;
        backingTime.closeTime = block.timestamp + backingDuration_;

        pairAddress = pairAddress_;
        backingToken = backingToken_;
        auxiliaryToken = auxiliaryToken_;
    }

    function backProject(uint amountBT_) external payable {
        require(backingTime.open == true);
        require(block.timestamp < backingTime.closeTime);
        require(msg.value > minimumBacking);

        // let this contract be in control of amountBT
        MockDAIToken mockDAIToken = MockDAIToken(backingToken);
        MockWETHToken mockWETHToken = MockWETHToken(auxiliaryToken);
        uint amountBT = amountBT_ * 10 ** mockDAIToken.decimals();
        require(mockDAIToken.transferFrom(msg.sender, address(this), amountBT), "transferFrom failed.");
    
        // approve UniswapV2Rounter to withdraw amountBT
        require(mockDAIToken.approve(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D, amountBT), "approve failed.");
        
        // swap BT-AT
        address[] memory path = new address[](2);
        path[0] = address(mockDAIToken);
        path[1] = address(mockWETHToken);
        IUniswapV2Router02 uniswapV2Router02 = IUniswapV2Router02(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);
        uint[] memory amounts = uniswapV2Router02.swapExactTokensForTokens(amountBT/2, 1*10**mockWETHToken.decimals(), path, address(this), block.timestamp);
        
        // add liquidity to BT-AT pair
        uniswapV2Router02.addLiquidity(backingToken, auxiliaryToken, amountBT/2, amounts[1], amountBT/2*99/100, amounts[1]*99/100, address(this), block.timestamp);
    
        // update backer data
        _totalBacking += amountBT;
        if (_backings[msg.sender] != 0) {
            _backersCount += 1;
        }
        _backings[msg.sender] += amountBT;
    }
}