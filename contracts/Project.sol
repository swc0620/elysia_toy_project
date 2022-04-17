// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";

contract Project {
    address public proposer;
    string public description;
    address public manufacturer;
    uint public minimumBacking;

    struct DueTime {
        bool open;
        uint closeTime;
    }

    DueTime public backingTime;
    address public pairAddress;

    constructor(address proposer_, string memory description_, uint minimumBacking_, address manufacturer_) {        
        proposer = proposer_;
        description = description_;
        minimumBacking = minimumBacking_;
        manufacturer = manufacturer_;
    }

    modifier isProposer {
        require(msg.sender == proposer);
        _;
    }

    function startBacking(uint backingDuration_, address backingTokenAddress) public isProposer {
        require(backingTime.open == false);
        
        backingTime.open = true;
        backingTime.closeTime = block.timestamp + backingDuration_;
    
        IUniswapV2Factory uniswapV2Factory = IUniswapV2Factory(0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f);
        pairAddress = uniswapV2Factory.createPair(backingTokenAddress, 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);
    }

    function backProject() external payable {
        require(backingTime.open == true);
        require(block.timestamp < backingTime.closeTime);
        require(msg.value > minimumBacking);
    }
}