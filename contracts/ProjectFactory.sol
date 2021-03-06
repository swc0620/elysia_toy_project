// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import './Project.sol';

contract ProjectFactory {
    address[] public createdProjects;

    function createProject(string memory description_, uint minimumBacking_, address manufacturer_, uint backingDuration_) external {
        Project newProject = new Project(msg.sender, description_, minimumBacking_, manufacturer_, backingDuration_);
        createdProjects.push(address(newProject));
    }

    function getProjects() public view returns (address[] memory) {
        return createdProjects;
    }
}