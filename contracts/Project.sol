// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

contract Project {
    address public proposer;
    string public description;
    address public manufacturer;
    uint public minimumBacking;

    constructor(address proposer_, string memory description_, uint minimumBacking_, address manufacturer_) {
        proposer = proposer_;
        description = description_;
        minimumBacking = minimumBacking_;
        manufacturer = manufacturer_;
    }
}