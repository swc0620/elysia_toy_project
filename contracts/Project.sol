// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

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

    constructor(address proposer_, string memory description_, uint minimumBacking_, address manufacturer_, uint backingDuration_) {
        proposer = proposer_;
        description = description_;
        minimumBacking = minimumBacking_;
        manufacturer = manufacturer_;

        _startBacking(backingDuration_);
    }

    modifier isProposer() {
        require(msg.sender == proposer, 'Not proposer');
        _;
    }

    function _startBacking(uint backingDuration_) private {
        require(backingTime.open == false);
        
        backingTime.open = true;
        backingTime.closeTime = block.timestamp + backingDuration_;
    }
}