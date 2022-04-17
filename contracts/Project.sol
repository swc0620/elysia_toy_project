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

    constructor(address proposer_, string memory description_, uint minimumBacking_, address manufacturer_) {        
        proposer = proposer_;
        description = description_;
        minimumBacking = minimumBacking_;
        manufacturer = manufacturer_;
    }

    function startBacking(uint backingDuration_) public {
        require(backingTime.open == false);
        
        backingTime.open = true;
        backingTime.closeTime = block.timestamp + backingDuration_;
    }

    function backProject() external payable {
        require(backingTime.open == true);
        require(block.timestamp < backingTime.closeTime);
        require(msg.value > minimumBacking);

        
    }
}