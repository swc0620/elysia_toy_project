// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import './Project.sol';

contract ProjectFactory {
    address[] public createdProjects;

    function createProject(string memory description_, address manufacturer_) external {
        Project newProject = new Project(msg.sender, description_, manufacturer_);
        createdProjects.push(address(newProject));
    }

    function getProjects() public view returns (address[] memory) {
        return createdProjects;
    }
}