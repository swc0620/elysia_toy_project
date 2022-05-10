import hre, { waffle, ethers } from "hardhat";
import { expect } from "chai";
import { Contract, utils } from "ethers";
import ProjectArtifact from "../artifacts/contracts/Project.sol/Project.json";
import UniswapV2PairConfigArtifact from "../artifacts/contracts/test/UniswapV2PairConfig.sol/UniswapV2PairConfig.json";
import FaucetableERC20Artifact from "../artifacts/contracts/test/FaucetableERC20.sol/FaucetableERC20.json";
import { FaucetableERC20 } from "../typechain-types/contracts/test/FaucetableERC20";
import { Project } from "../typechain-types/contracts/Project";
import factoryABI from "../abi/factoryABI.json";
import pairABI from "../abi/pairABI.json";
import routerABI from "../abi/routerABI.json";
import { UniswapV2PairConfig } from "../typechain-types/contracts/test/UniswapV2PairConfig";

const { deployContract } = waffle;

describe("Project", () => {
    let project: Project;
    let mockDAIToken: FaucetableERC20;
    let mockWETHToken: FaucetableERC20;

    const [admin, proposer, backer1, backer2, passerby, manufacturer] = waffle.provider.getWallets();

    const factoryAddress = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
    const routerAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    const backingDuration = 300;
    const approvalDuaration = 300;

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

        it('is able to start backing', async () => {            
            const startBackingTx = await project.startBacking(backingDuration, utils.parseEther("2"), mockDAIToken.address, mockWETHToken.address);
            expect(await project.minimumBacking()).to.be.equal(utils.parseEther("2"));
            expect(await project.backingCloseTime()).to.be.above(0);

            const blockNumber = await ethers.provider.getBlockNumber();
            const blockTimestamp = (await ethers.provider.getBlock(blockNumber)).timestamp;
            await expect(startBackingTx).to.emit(project, "BackingStarted").withArgs(blockTimestamp+backingDuration, backingDuration);
        });

        it('reverts startBacking() unless msg.sender is the proposer', async () => {
            await expect(project.connect(backer1).startBacking(backingDuration, utils.parseEther("2"), mockDAIToken.address, mockWETHToken.address)).to.be.revertedWith("msg.sender is not the proposer");
        });

        it('reverts backProject() when backingCloseTime == 0', async () => {
            await expect(project.connect(backer1).backProject(utils.parseEther("1"), 2000, routerAddress)).to.be.revertedWith("backing did not start yet or backing already ended");
        });

        it('reverts startApproval() when backingCloseTime == 0', async () => {
            await expect(project.connect(proposer).startApproval(approvalDuaration)).to.be.revertedWith("backing did not start yet");
        });

        it('reverts finaliseProject() when approvalCloseTime == 0', async () => {
            await expect(project.connect(proposer).finaliseProject(routerAddress, factoryAddress)).to.be.revertedWith("approval did not start");
        });

        context('after startBacking() function has been provoked', async () => {
            let factoryContract: Contract;
            let pairAddress: string;
            let pairContract: Contract;
            beforeEach(async () => {
                // provoke startBacking()
                await project.startBacking(backingDuration, utils.parseEther("2"), mockDAIToken.address, mockWETHToken.address);

                // initially distribute MDAI to backers
                await mockDAIToken.connect(backer1).faucet(utils.parseEther("100"));
                await mockDAIToken.connect(backer2).faucet(utils.parseEther("100"));

                // add liquidity to LP pool in advance
                await mockDAIToken.connect(proposer).faucet(utils.parseEther("1000"));
                await mockWETHToken.connect(proposer).faucet(utils.parseEther("1000"));
                const configContractAddress = await project.uniswapV2PairConfigContract();
                const configContractABI = UniswapV2PairConfigArtifact.abi;
                const configContract: UniswapV2PairConfig = await hre.ethers.getContractAt(configContractABI, configContractAddress) as UniswapV2PairConfig;
                await mockDAIToken.connect(proposer).increaseAllowance(configContract.address, utils.parseEther("1000"));
                await mockWETHToken.connect(proposer).increaseAllowance(configContract.address, utils.parseEther("1000"));
                await configContract.connect(proposer).addLiquidity(mockDAIToken.address, mockWETHToken.address, routerAddress, utils.parseEther("1000"), utils.parseEther("1000"), utils.parseEther("990"), utils.parseEther("990"));
            
                // passerby adds liquidity to LP
                const routerContract: Contract = await hre.ethers.getContractAt(routerABI, routerAddress);
                await mockDAIToken.connect(passerby).faucet(utils.parseEther("5000"));
                await mockWETHToken.connect(passerby).faucet(utils.parseEther("5000"));
                await mockDAIToken.connect(passerby).increaseAllowance(routerAddress, utils.parseEther("5000"));
                await mockWETHToken.connect(passerby).increaseAllowance(routerAddress, utils.parseEther("5000"));
                const blockNumber = await ethers.provider.getBlockNumber();
                const blockTimestamp = (await ethers.provider.getBlock(blockNumber)).timestamp;
                await routerContract.connect(passerby).addLiquidity(mockDAIToken.address, mockWETHToken.address, utils.parseEther("5000"), utils.parseEther("5000"), utils.parseEther("4900"), utils.parseEther("1000"), passerby.address, blockTimestamp+300);

                // initialise pairContract 
                factoryContract = await hre.ethers.getContractAt(factoryABI, factoryAddress);
                pairAddress = await factoryContract.getPair(mockDAIToken.address, mockWETHToken.address);
                pairContract = await hre.ethers.getContractAt(pairABI, pairAddress);
            });

            it('reverts when amountBT_ is less than minimumBacking', async () => {
                await expect(project.backProject(utils.parseEther("1"), 2000, routerAddress)).to.be.revertedWith("unsufficient backing.");
            });

            it('is able to back project', async () => {
                await mockDAIToken.connect(backer1).increaseAllowance(project.address, utils.parseEther("100"));
                const backingTx = await project.connect(backer1).backProject(utils.parseEther("100"), 2000, routerAddress);

                await expect(backingTx)
                    .to.emit(mockDAIToken, 'Transfer').withArgs(backer1.address, project.address, utils.parseEther("100"))
                    .to.emit(mockDAIToken, 'Transfer').withArgs(project.address, pairAddress, utils.parseEther("50"))
                    .to.emit(project, 'BackingCreated').withArgs(backer1.address, utils.parseEther("100"));

                expect(await pairContract.balanceOf(project.address)).to.not.equal(0);
                expect(await project.totalBacking()).to.be.equal(utils.parseEther("100"));
                expect(await project.backings(backer1.address)).to.be.equal(utils.parseEther("100"));
                expect(await project.backersCount()).to.be.equal(1);
            });

            it('is able to back project twice', async () => {                
                await mockDAIToken.connect(backer1).increaseAllowance(project.address, utils.parseEther("100"));
                await mockDAIToken.connect(backer2).increaseAllowance(project.address, utils.parseEther("100"));
                const backingTx1 = await project.connect(backer1).backProject(utils.parseEther("100"), 2000, routerAddress);
                const backingTx2 = await project.connect(backer2).backProject(utils.parseEther("100"), 2000, routerAddress);

                await expect(backingTx1)
                    .to.emit(mockDAIToken, 'Transfer').withArgs(backer1.address, project.address, utils.parseEther("100"))
                    .to.emit(mockDAIToken, 'Transfer').withArgs(project.address, pairAddress, utils.parseEther("50"))
                    .to.emit(project, 'BackingCreated').withArgs(backer1.address, utils.parseEther("100"));

                await expect(backingTx2)
                    .to.emit(mockDAIToken, 'Transfer').withArgs(backer2.address, project.address, utils.parseEther("100"))
                    .to.emit(mockDAIToken, 'Transfer').withArgs(project.address, pairAddress, utils.parseEther("50"))
                    .to.emit(project, 'BackingCreated').withArgs(backer2.address, utils.parseEther("100"));

                expect(await pairContract.balanceOf(project.address)).to.not.equal(0);
                expect(await project.totalBacking()).to.be.equal(utils.parseEther("200"));
                expect(await project.backings(backer1.address)).to.be.equal(utils.parseEther("100"));
                expect(await project.backings(backer2.address)).to.be.equal(utils.parseEther("100"));
                expect(await project.backersCount()).to.be.equal(2);
                expect(await project.totalLiquidity()).to.be.above(0);
            });

            it('counts backing only once per backer', async () => {
                await mockDAIToken.connect(backer1).faucet(utils.parseEther("100"));
                await mockDAIToken.connect(backer1).increaseAllowance(project.address, utils.parseEther("200"));
                await project.connect(backer1).backProject(utils.parseEther("100"), 2000, routerAddress);
                await project.connect(backer1).backProject(utils.parseEther("100"), 2000, routerAddress);

                expect(await pairContract.balanceOf(project.address)).to.not.equal(0);
                expect(await project.totalBacking()).to.be.equal(utils.parseEther("200"));
                expect(await project.backings(backer1.address)).to.be.equal(utils.parseEther("200"));
                expect(await project.backersCount()).to.be.equal(1);
            });

            it('reverts startBacking() when backingCloseTime != 0', async () => {
                await expect(project.connect(proposer).startBacking(backingDuration, utils.parseEther("2"), mockDAIToken.address, mockWETHToken.address)).to.be.revertedWith("backing has already started");
            });

            it('reverts startApproval() when block.timestamp < backingCloseTime', async () => {
                await expect(project.connect(proposer).startApproval(approvalDuaration)).to.be.revertedWith("backing is not closed");
            });

            context('after time longer than backingDuration_ has passed', async () => {
                beforeEach('', async () => {
                    // backer1 and backer2 back project                    
                    await mockDAIToken.connect(backer1).increaseAllowance(project.address, utils.parseEther("100"));
                    await mockDAIToken.connect(backer2).increaseAllowance(project.address, utils.parseEther("100"));
                    await project.connect(backer1).backProject(utils.parseEther("100"), 2000, routerAddress);
                    await project.connect(backer2).backProject(utils.parseEther("100"), 2000, routerAddress);

                    // time longer than backingDuration_ passed
                    const sevenDays = 7 * 24 * 60 * 60;
                    await ethers.provider.send('evm_increaseTime', [sevenDays]);
                    await ethers.provider.send('evm_mine', []);
                });

                it('reverts backProject() when block.timestamp >= backingCloseTime', async () => {
                    await expect(project.connect(backer1).backProject(utils.parseEther("100"), 2000, routerAddress)).to.be.revertedWith("backing did not start yet or backing already ended");
                });

                it('is able to start receiving approval', async () => {
                    const startApprovalTx = await project.startApproval(approvalDuaration);

                    expect(await project.approvalCloseTime()).to.be.above(0);
                    const blockNumber = await ethers.provider.getBlockNumber();
                    const blockTimestamp = (await ethers.provider.getBlock(blockNumber)).timestamp;
                    await expect(startApprovalTx).to.emit(project, "ApprovalStarted").withArgs(blockTimestamp+approvalDuaration, approvalDuaration);
                });

                it('reverts startApproval() unless msg.sender is the proposer', async () => {
                    await expect(project.connect(backer1).startApproval(approvalDuaration)).to.be.revertedWith("msg.sender is not the proposer");
                });

                context('after startApproval() function has been provoked', async () => {
                    beforeEach('', async () => {
                        // provoke startApproval()
                        await project.startApproval(approvalDuaration);
                    });

                    it('reverts startApproval() when approvalCloseTime != 0', async () => {
                        await expect(project.connect(proposer).startApproval(approvalDuaration)).to.be.revertedWith("approval has already started");
                    });

                    it('reverts approveProject() unless backings[msg.sender] > 0', async () => {
                        await expect(project.connect(passerby).approveProject()).to.be.revertedWith("msg.sender is not on the backers list");
                    });

                    it('approves project with voting power relevant to stake of backing', async () => {
                        const approvalTx = await project.connect(backer1).approveProject();
                        expect(await project.totalApproval()).to.be.equal(await project.backings(backer1.address));
                        expect(await project.approvals(backer1.address)).to.be.equal(true);
                        await expect(approvalTx).to.emit(project, "ApprovalCreated").withArgs(backer1.address);
                    });

                    it('reverts when one backer tries to approve project twice', async () => {
                        await project.connect(backer1).approveProject();
                        await expect(project.connect(backer1).approveProject()).to.be.revertedWith("msg.sender has already voted");
                    });

                    it('reverts finaliseProject() when block.timestamp < approvalCloseTime', async () => {
                        await expect(project.finaliseProject(routerAddress, factoryAddress)).to.be.revertedWith("approval is not closed");
                    });

                    context('when both backers approved the project and time longer than approvalDuration_ passed', async () => {
                        beforeEach('', async () => {
                            await project.connect(backer1).approveProject();
                            await project.connect(backer2).approveProject();

                            const sevenDays = 7 * 24 * 60 * 60;
                            await ethers.provider.send('evm_increaseTime', [sevenDays]);
                            await ethers.provider.send('evm_mine', []);
                        });

                        it('reverts approveProject() when block.timestamp >= approvalCloseTime', async () => {
                            await expect(project.connect(proposer).approveProject()).to.be.revertedWith("approval did not start yet or backing already ended");
                        });

                        it('reverts finaliseProject() unless msg.sender is the proposer', async () => {
                            await expect(project.connect(backer1).finaliseProject(routerAddress, factoryAddress)).to.be.revertedWith("msg.sender is not the proposer");
                        });

                        it('is able to finalise project', async () => {
                            const finaliseProjectTx = await project.connect(proposer).finaliseProject(routerAddress, factoryAddress);
                            expect(await mockDAIToken.balanceOf(manufacturer.address)).to.be.above(0);
                            expect(await project.projectNotFinalised()).to.be.equal(false);
                            await expect(finaliseProjectTx).to.emit(project, "ProjectFinalised");
                        });
                    });

                    context('when only one backer approved the project and time longer than approvalDuration_ passed', async () => {
                        beforeEach('', async () => {
                            await project.connect(backer1).approveProject();

                            const sevenDays = 7 * 24 * 60 * 60;
                            await ethers.provider.send('evm_increaseTime', [sevenDays]);
                            await ethers.provider.send('evm_mine', []);
                        });

                        it('is able to finalise project', async () => {
                            const finaliseProjectTx = await project.connect(proposer).finaliseProject(routerAddress, factoryAddress);
                            expect(await mockDAIToken.balanceOf(manufacturer.address)).to.be.above(0);
                            expect(await project.projectNotFinalised()).to.be.equal(false);
                            await expect(finaliseProjectTx).to.emit(project, "ProjectFinalised");
                        });
                    });
                    
                    context('when no backer approved the project and time longer than approvalDuration_ passed', async () => {
                        beforeEach('', async () => {
                            const sevenDays = 7 * 24 * 60 * 60;
                            await ethers.provider.send('evm_increaseTime', [sevenDays]);
                            await ethers.provider.send('evm_mine', []);
                        });
                        
                        it('is able to finalise project', async () => {
                            const finaliseProjectTx = await project.connect(proposer).finaliseProject(routerAddress, factoryAddress);
                            expect(await mockDAIToken.balanceOf(manufacturer.address)).to.be.equal(0);
                            expect(await project.projectNotFinalised()).to.be.equal(true);
                            await expect(finaliseProjectTx).to.emit(project, "ProjectFinalised");
                        });
                    });
                });
            });
        });
    });
});