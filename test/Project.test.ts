import hre, { ethers, waffle } from "hardhat";
import { expect } from "chai";
import { BigNumber, Contract, Signer, utils } from "ethers";

import ProjectArtifact from "../artifacts/contracts/Project.sol/Project.json";
import UniswapV2PairConfigArtifact from "../artifacts/contracts/test/UniswapV2PairConfig.sol/UniswapV2PairConfig.json";
import MockDAITokenArtifact from "../artifacts/contracts/test/MockDAIToken.sol/MockDAIToken.json";
import MockWETHTokenArtifact from "../artifacts/contracts/test/MockWETHToken.sol/MockWETHToken.json";
import { Project } from "../typechain-types/contracts/Project";
import { MockDAIToken } from "../typechain-types/contracts/test/MockDAIToken";
import { MockWETHToken } from "../typechain-types/contracts/test/MockWETHToken"; 
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { solidityKeccak256 } from "ethers/lib/utils";

const { deployContract } = waffle;

describe("Project", () => {
    let project: Project;
    let mockDAIToken: MockDAIToken;
    let mockWETHToken: MockWETHToken;

    const [manufacturer] = waffle.provider.getWallets();
    let admin: SignerWithAddress
    let proposer: SignerWithAddress;
    let backer1: SignerWithAddress;
    let backer2: SignerWithAddress;

    const factoryABI = [{"inputs":[{"internalType":"address","name":"_feeToSetter","type":"address"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"token0","type":"address"},{"indexed":true,"internalType":"address","name":"token1","type":"address"},{"indexed":false,"internalType":"address","name":"pair","type":"address"},{"indexed":false,"internalType":"uint256","name":"","type":"uint256"}],"name":"PairCreated","type":"event"},{"constant":true,"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"allPairs","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"allPairsLength","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"tokenA","type":"address"},{"internalType":"address","name":"tokenB","type":"address"}],"name":"createPair","outputs":[{"internalType":"address","name":"pair","type":"address"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"feeTo","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"feeToSetter","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"name":"getPair","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"_feeTo","type":"address"}],"name":"setFeeTo","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"_feeToSetter","type":"address"}],"name":"setFeeToSetter","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"}];
    const factoryAddress = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
    const routerAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    const pairABI = [{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount0","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1","type":"uint256"},{"indexed":true,"internalType":"address","name":"to","type":"address"}],"name":"Burn","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount0","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1","type":"uint256"}],"name":"Mint","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount0In","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1In","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount0Out","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1Out","type":"uint256"},{"indexed":true,"internalType":"address","name":"to","type":"address"}],"name":"Swap","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint112","name":"reserve0","type":"uint112"},{"indexed":false,"internalType":"uint112","name":"reserve1","type":"uint112"}],"name":"Sync","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"constant":true,"inputs":[],"name":"DOMAIN_SEPARATOR","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"MINIMUM_LIQUIDITY","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"PERMIT_TYPEHASH","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"to","type":"address"}],"name":"burn","outputs":[{"internalType":"uint256","name":"amount0","type":"uint256"},{"internalType":"uint256","name":"amount1","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"factory","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"getReserves","outputs":[{"internalType":"uint112","name":"_reserve0","type":"uint112"},{"internalType":"uint112","name":"_reserve1","type":"uint112"},{"internalType":"uint32","name":"_blockTimestampLast","type":"uint32"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"_token0","type":"address"},{"internalType":"address","name":"_token1","type":"address"}],"name":"initialize","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"kLast","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"to","type":"address"}],"name":"mint","outputs":[{"internalType":"uint256","name":"liquidity","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"nonces","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"permit","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"price0CumulativeLast","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"price1CumulativeLast","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"to","type":"address"}],"name":"skim","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"uint256","name":"amount0Out","type":"uint256"},{"internalType":"uint256","name":"amount1Out","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"swap","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"sync","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"token0","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"token1","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"}];


    beforeEach(async () => {
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: ["0xE78388b4CE79068e89Bf8aA7f218eF6b9AB0e9d0"],
        });
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: ["0x1b3cb81e51011b549d78bf720b0d924ac763a7c2"],
        });
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: ["0x2b6ed29a95753c3ad948348e3e7b1a251080ffb9"],
        });
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: ["0xca8fa8f0b631ecdb18cda619c4fc9d197c8affca"],
        });

        admin = await ethers.getSigner("0xca8fa8f0b631ecdb18cda619c4fc9d197c8affca");
        proposer = await ethers.getSigner("0xE78388b4CE79068e89Bf8aA7f218eF6b9AB0e9d0");
        backer1 = await ethers.getSigner("0x1b3cb81e51011b549d78bf720b0d924ac763a7c2");
        backer2 = await ethers.getSigner("0x2b6ed29a95753c3ad948348e3e7b1a251080ffb9");


        mockDAIToken = await deployContract(
            admin,
            MockDAITokenArtifact,
            [
                "MockDAIToken",
                "MDAI"
            ]
        ) as MockDAIToken;

        mockWETHToken = await deployContract(
            admin,
            MockWETHTokenArtifact,
            [
                "MockWETHToken",
                "MWETH"
            ]
        ) as MockWETHToken;

        project = await deployContract(
            proposer,
            ProjectArtifact,
            [
                proposer.address, 
                "New Battery", 
                manufacturer.address, 
            ]
        ) as Project;

    });

    context("when new Project is deployed", async () => {
        it('has given data', async () => {
            expect(await project.proposer()).to.be.equal(proposer.address)
            expect(await project.description()).to.be.equal("New Battery");
            expect(await project.manufacturer()).to.be.equal(manufacturer.address);
        });

        it('starts backingTime', async () => {
            const factoryContract: Contract = await hre.ethers.getContractAt(factoryABI, factoryAddress);
            
            const pairAddress = await factoryContract.getPair(mockDAIToken.address, mockWETHToken.address);
            await project.startBacking(300, 2, pairAddress, mockDAIToken.address, mockWETHToken.address);
            expect(await project.minimumBacking()).to.be.equal(BigNumber.from(utils.parseEther("2")));
            expect((await project.backingTime()).open).to.be.equal(true);
            expect((await project.backingTime()).closeTime).to.be.above(0);
        });

        it('reverts startBacking unless msg.sender is the proposer', async () => {
            const factoryContract: Contract = await hre.ethers.getContractAt(factoryABI, factoryAddress);
            
            const pairAddress = await factoryContract.getPair(mockDAIToken.address, mockWETHToken.address);
            await expect(project.connect(backer1).startBacking(300, 2, pairAddress, mockDAIToken.address, mockWETHToken.address)).to.be.reverted;
        });

        context('after startBacking() function has been provoked', async () => {
            beforeEach(async () => {
                // provoke startBacking()
                const factoryContract: Contract = await hre.ethers.getContractAt(factoryABI, factoryAddress);
                const pairAddress = await factoryContract.getPair(mockDAIToken.address, mockWETHToken.address);
                await project.startBacking(300, 2, pairAddress, mockDAIToken.address, mockWETHToken.address);

                // initially distribute MDAI to backers
                await mockDAIToken.connect(backer1).faucet();
                await mockDAIToken.connect(backer2).faucet();

                // add liquidity to LP pool in advance
                for (let i = 0; i < 10; i++) {
                    await mockDAIToken.connect(proposer).faucet();
                    await mockWETHToken.connect(proposer).faucet();
                }
                const configContractAddress = await project.uniswapV2PairConfigContract();
                const configContractABI = UniswapV2PairConfigArtifact.abi;
                const configContract: Contract = await hre.ethers.getContractAt(configContractABI, configContractAddress);
                await mockDAIToken.connect(proposer).increaseAllowance(configContract.address, BigNumber.from(utils.parseEther("1000")));
                await mockWETHToken.connect(proposer).increaseAllowance(configContract.address, BigNumber.from(utils.parseEther("1000")));
                await configContract.connect(proposer).addLiquidity(mockDAIToken.address, mockWETHToken.address, routerAddress, 1000, 1000);
            });

            it('reverts when amountBT_ is less than minimumBacking', async () => {
                await expect(project.backProject(1, routerAddress)).to.be.reverted;
            });

            it('is able to back project', async () => {
                const factoryContract: Contract = await hre.ethers.getContractAt(factoryABI, factoryAddress);
                const pairAddress = await factoryContract.getPair(mockDAIToken.address, mockWETHToken.address);
                const pairContract: Contract = await hre.ethers.getContractAt(pairABI, pairAddress);
                
                await mockDAIToken.connect(backer1).increaseAllowance(project.address, BigNumber.from(utils.parseEther("100")));
                const backingTx = await project.connect(backer1).backProject(100, routerAddress);

                await expect(backingTx)
                    .to.emit(mockDAIToken, 'Transfer').withArgs(backer1.address, project.address, BigNumber.from(utils.parseEther("100")))
                    .to.emit(mockDAIToken, 'Transfer').withArgs(project.address, pairAddress, BigNumber.from(utils.parseEther("50")));

                expect(await pairContract.balanceOf(project.address)).to.not.equal(0);
                expect(await project.totalBacking()).to.be.equal(BigNumber.from(utils.parseEther("100")));
                expect(await project.backings(backer1.address)).to.be.equal(BigNumber.from(utils.parseEther("100")));
                expect(await project.backersCount()).to.be.equal(1);
            });

            it('is able to back project twice', async () => {
                const factoryContract: Contract = await hre.ethers.getContractAt(factoryABI, factoryAddress);
                const pairAddress = await factoryContract.getPair(mockDAIToken.address, mockWETHToken.address);
                const pairContract: Contract = await hre.ethers.getContractAt(pairABI, pairAddress);
                
                await mockDAIToken.connect(backer1).increaseAllowance(project.address, BigNumber.from(utils.parseEther("100")));
                await mockDAIToken.connect(backer2).increaseAllowance(project.address, BigNumber.from(utils.parseEther("100")));
                const backingTx1 = await project.connect(backer1).backProject(100, routerAddress);
                const backingTx2 = await project.connect(backer2).backProject(100, routerAddress);

                await expect(backingTx1)
                    .to.emit(mockDAIToken, 'Transfer').withArgs(backer1.address, project.address, BigNumber.from(utils.parseEther("100")))
                    .to.emit(mockDAIToken, 'Transfer').withArgs(project.address, pairAddress, BigNumber.from(utils.parseEther("50")));

                await expect(backingTx2)
                    .to.emit(mockDAIToken, 'Transfer').withArgs(backer2.address, project.address, BigNumber.from(utils.parseEther("100")))
                    .to.emit(mockDAIToken, 'Transfer').withArgs(project.address, pairAddress, BigNumber.from(utils.parseEther("50")));

                expect(await pairContract.balanceOf(project.address)).to.not.equal(0);
                expect(await project.totalBacking()).to.be.equal(BigNumber.from(utils.parseEther("200")));
                expect(await project.backings(backer1.address)).to.be.equal(BigNumber.from(utils.parseEther("100")));
                expect(await project.backings(backer2.address)).to.be.equal(BigNumber.from(utils.parseEther("100")));
                expect(await project.backersCount()).to.be.equal(2);
            });

            it('counts backing only once per backer', async () => {
                const factoryContract: Contract = await hre.ethers.getContractAt(factoryABI, factoryAddress);
                const pairAddress = await factoryContract.getPair(mockDAIToken.address, mockWETHToken.address);
                const pairContract: Contract = await hre.ethers.getContractAt(pairABI, pairAddress);
                
                await mockDAIToken.connect(backer1).faucet();
                await mockDAIToken.connect(backer1).increaseAllowance(project.address, BigNumber.from(utils.parseEther("200")));
                const backingTx1 = await project.connect(backer1).backProject(100, routerAddress);
                const backingTx2 = await project.connect(backer1).backProject(100, routerAddress);

                await expect(backingTx1)
                    .to.emit(mockDAIToken, 'Transfer').withArgs(backer1.address, project.address, BigNumber.from(utils.parseEther("100")))
                    .to.emit(mockDAIToken, 'Transfer').withArgs(project.address, pairAddress, BigNumber.from(utils.parseEther("50")));

                await expect(backingTx2)
                    .to.emit(mockDAIToken, 'Transfer').withArgs(backer1.address, project.address, BigNumber.from(utils.parseEther("100")))
                    .to.emit(mockDAIToken, 'Transfer').withArgs(project.address, pairAddress, BigNumber.from(utils.parseEther("50")));

                expect(await pairContract.balanceOf(project.address)).to.not.equal(0);
                expect(await project.totalBacking()).to.be.equal(BigNumber.from(utils.parseEther("200")));
                expect(await project.backings(backer1.address)).to.be.equal(BigNumber.from(utils.parseEther("200")));
                expect(await project.backersCount()).to.be.equal(1);
            });
        });
    });
});