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
import factoryABI from "../abi/factoryABI.json";
import pairABI from "../abi/pairABI.json";

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

    const factoryAddress = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
    const routerAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

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