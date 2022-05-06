import hre, { ethers, waffle } from "hardhat";
import { expect } from "chai";
import { BigNumber, Contract, Signer, utils } from "ethers";

import ProjectArtifact from "../artifacts/contracts/Project.sol/Project.json";
import UniswapV2PairConfigArtifact from "../artifacts/contracts/test/UniswapV2PairConfig.sol/UniswapV2PairConfig.json";
import FaucetableERC20Artifact from "../artifacts/contracts/test/FaucetableERC20.sol/FaucetableERC20.json";
import { FaucetableERC20 } from "../typechain-types/contracts/test/FaucetableERC20";
import { Project } from "../typechain-types/contracts/Project";
import factoryABI from "../abi/factoryABI.json";
import pairABI from "../abi/pairABI.json";
import { UniswapV2PairConfig } from "../typechain-types/contracts/test/UniswapV2PairConfig";

const { deployContract } = waffle;

describe("Project", () => {
    let project: Project;
    let mockDAIToken: FaucetableERC20;
    let mockWETHToken: FaucetableERC20;

    const [admin, proposer, backer1, backer2, manufacturer] = waffle.provider.getWallets();

    const factoryAddress = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
    const routerAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

    beforeEach(async () => {
        mockDAIToken = await deployContract(
            admin,
            FaucetableERC20Artifact,
            [
                "MockDAIToken",
                "MDAI"
            ]
        ) as FaucetableERC20;

        mockWETHToken = await deployContract(
            admin,
            FaucetableERC20Artifact,
            [
                "MockWETHToken",
                "MWETH"
            ]
        ) as FaucetableERC20;

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
            await project.startBacking(300, BigNumber.from(utils.parseEther("2")), pairAddress, mockDAIToken.address, mockWETHToken.address);
            expect(await project.minimumBacking()).to.be.equal(BigNumber.from(utils.parseEther("2")));
            expect(await project.backingCloseTime()).to.be.above(0);
        });

        it('reverts startBacking unless msg.sender is the proposer', async () => {
            const factoryContract: Contract = await hre.ethers.getContractAt(factoryABI, factoryAddress);
            
            const pairAddress = await factoryContract.getPair(mockDAIToken.address, mockWETHToken.address);
            await expect(project.connect(backer1).startBacking(300, BigNumber.from(utils.parseEther("2")), pairAddress, mockDAIToken.address, mockWETHToken.address)).to.be.reverted;
        });

        context('after startBacking() function has been provoked', async () => {
            beforeEach(async () => {
                // provoke startBacking()
                const factoryContract: Contract = await hre.ethers.getContractAt(factoryABI, factoryAddress);
                const pairAddress = await factoryContract.getPair(mockDAIToken.address, mockWETHToken.address);
                await project.startBacking(300, BigNumber.from(utils.parseEther("2")), pairAddress, mockDAIToken.address, mockWETHToken.address);

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
                const configContract: UniswapV2PairConfig = await hre.ethers.getContractAt(configContractABI, configContractAddress) as UniswapV2PairConfig;
                await mockDAIToken.connect(proposer).increaseAllowance(configContract.address, BigNumber.from(utils.parseEther("1000")));
                await mockWETHToken.connect(proposer).increaseAllowance(configContract.address, BigNumber.from(utils.parseEther("1000")));
                await configContract.connect(proposer).addLiquidity(mockDAIToken.address, mockWETHToken.address, routerAddress, BigNumber.from(utils.parseEther("1000")), BigNumber.from(utils.parseEther("1000")));
            });

            it('reverts when amountBT_ is less than minimumBacking', async () => {
                await expect(project.backProject(BigNumber.from(utils.parseEther("1")), routerAddress)).to.be.reverted;
            });

            it('is able to back project', async () => {
                const factoryContract: Contract = await hre.ethers.getContractAt(factoryABI, factoryAddress);
                const pairAddress = await factoryContract.getPair(mockDAIToken.address, mockWETHToken.address);
                const pairContract: Contract = await hre.ethers.getContractAt(pairABI, pairAddress);
                
                await mockDAIToken.connect(backer1).increaseAllowance(project.address, BigNumber.from(utils.parseEther("100")));
                const backingTx = await project.connect(backer1).backProject(BigNumber.from(utils.parseEther("100")), routerAddress);

                await expect(backingTx)
                    .to.emit(mockDAIToken, 'Transfer').withArgs(backer1.address, project.address, BigNumber.from(utils.parseEther("100")))
                    .to.emit(mockDAIToken, 'Transfer').withArgs(project.address, pairAddress, BigNumber.from(utils.parseEther("50")))
                    .to.emit(project, 'BackingCreated').withArgs(backer1.address, BigNumber.from(utils.parseEther("100")));

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
                const backingTx1 = await project.connect(backer1).backProject(BigNumber.from(utils.parseEther("100")), routerAddress);
                const backingTx2 = await project.connect(backer2).backProject(BigNumber.from(utils.parseEther("100")), routerAddress);

                await expect(backingTx1)
                    .to.emit(mockDAIToken, 'Transfer').withArgs(backer1.address, project.address, BigNumber.from(utils.parseEther("100")))
                    .to.emit(mockDAIToken, 'Transfer').withArgs(project.address, pairAddress, BigNumber.from(utils.parseEther("50")))
                    .to.emit(project, 'BackingCreated').withArgs(backer1.address, BigNumber.from(utils.parseEther("100")));

                await expect(backingTx2)
                    .to.emit(mockDAIToken, 'Transfer').withArgs(backer2.address, project.address, BigNumber.from(utils.parseEther("100")))
                    .to.emit(mockDAIToken, 'Transfer').withArgs(project.address, pairAddress, BigNumber.from(utils.parseEther("50")))
                    .to.emit(project, 'BackingCreated').withArgs(backer2.address, BigNumber.from(utils.parseEther("100")));

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
                await project.connect(backer1).backProject(BigNumber.from(utils.parseEther("100")), routerAddress);
                await project.connect(backer1).backProject(BigNumber.from(utils.parseEther("100")), routerAddress);

                expect(await pairContract.balanceOf(project.address)).to.not.equal(0);
                expect(await project.totalBacking()).to.be.equal(BigNumber.from(utils.parseEther("200")));
                expect(await project.backings(backer1.address)).to.be.equal(BigNumber.from(utils.parseEther("200")));
                expect(await project.backersCount()).to.be.equal(1);
            });
        });
    });
});