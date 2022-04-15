# Kick-fianance
## What is Kick-finance?
* Kick-finance is a toy project developed by Woochul Shin as a part of the internship in Elysia.
* Kick-finance aims to decentralise the process of crowd funding, eliminates the role of intermediary and replaces it with smart contracts.
## Overview
![overviewImg](https://raw.githubusercontent.com/elysia-dev/kick-finance/main/Overview.png)
### Data Structures

#### 1. ProjectFactory Contract

- state:

```solidity
address[] public createdProjects;
```

#### 2. Project Contract

```solidity
struct DueTime {
	bool open
	uint closeTime
}
```

- state:

```solidity
address public proposer;
string public description;
address public manufacturer;
uint public minimumBacking; // minimum amount of money required for backers to participate in backing project

DueTime public backingTime;
uint private _backersCount;
mapping(address => uint) private _backings;
uint private _totalBacking;

DueTime public votingTime;
mapping(address => bool) private _approvals;
uint approvalCount;

bool public approved
bool public finalised
```

### Functions

#### 1. ProjectFactory Contract

1. createProject(uint minimumBacking)

    createProject creates and deploys new project contract and initialises its minimumBacking amount and the address of proposer.

   - Effects:

     - address newProject = new Project(minimumBacking, msg.sender);
     - createdProjects.push(newProject);
2. getCreatedProjects()

    getCreatedProjects returns all addresses of created and deployed projects

   - Effects:

     - return createdProjects;

#### 2. Project Contract

1. startBacking(uint backingDuration)

    startBacking sets when the backing will be closed.

   - Check:

     - backingTime.open == false

   - Effects:

     - backingTime.open = true
     - backingTime.closeTime = block.timestamp + backingDuration

2. backProject(uint newBacking)

    backProject allows backers to participate in backing the project. If a backer has already backed the project, the backer can only increase the amount of backing and cannot retrieve the backing.

   - Check:

     - backingTime.open == true
     - block.timestamp < backingTime.closeTime
     - msg.value > minimumBacking

   - Effects:

     - backings[msg.sender] += newBacking
     - backersCount++
     - totalBacking += backing
     - transfer(DEFI-POOL-CONTRACT-ADDRESS, backing)

   - Interaction:

     - Transfers `backing` from `msg.sender` to ProjectContract
     - Transfers `backing` from ProjectContract to De-fi Pool Contract
     - Emits `BackingCreated`
  
3. startVote(uint votingDuration)

    holdVote allows proposer to hold vote on whether or not to proceed the project. If the vote gets approvals from more than half of the backers, the project can be finalised by the proposer.

   - Check:

     - backingTime.open == false
     - block.timestamp > backingTime.closeTime
     - msg.sender == proposer

   - Effects:

     - votingTime.open = true
     - votingTime.closeTime = block.timestamp + votingDuration
  - 
4. approveProject()

    approveProject allows backers to cast approval vote to the project.

   - Check:

     - votingTime.open == true
     - block.timestamp < votingTime.closeTime
     - backings[msg.sender] > 0
     - approvals[msg.sender] == false

   - Effects:

     - approvals[msg.sender] = true
     - approvalCount++

5. finaliseProject()

    finaliseProject allows proposer to finalise the project. The Project Contract retrieves the liquidity provided to the De-fi Pool Contract. If more than half of the backers have approved the project, then the backing is transfered to the manufacturer.

   - Check:

     - block.timestamp > votingTime.closeTime
     - msg.sender == proposer

   - Effects:

     - Retrieves the liquidity from De-fi Pool Contract
     - finalised = true
     - approvalCount > backersCount / 2
         - approved = true
         - transfer(manufacturer, backing)

   - Interaction:

     - Transfers `backing` from De-fi Pool Contract to ProjectContract
     - Transfers `backing` from ProjectContract to `manufacturer`
     - Emits `ProjectFinalised`
  
6. retrieveBacking()

    retrieveBacking allows backers to retrieve their backings after the project has been finalised and the project has not received approvals from more than half of the all the backers.

   - Check:

     - finalised == true
     - approved == false

   - Interaction:

     - Transfers `backing` from ProjectContract to `msg.sender`

## Dependencies
* Solidity (0.8.4)
* Hardhat