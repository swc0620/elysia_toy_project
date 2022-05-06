import hre, { ethers, waffle } from "hardhat";
import { expect } from "chai";
import { BigNumber, Contract, utils } from "ethers";

import UniswapV2PairConfigArtifact from "../artifacts/contracts/test/UniswapV2PairConfig.sol/UniswapV2PairConfig.json";
import FaucetableERC20Artifact from "../artifacts/contracts/test/FaucetableERC20.sol/FaucetableERC20.json";
import { FaucetableERC20 } from "../typechain-types/contracts/test/FaucetableERC20";
import { UniswapV2PairConfig } from "../typechain-types/contracts//test/UniswapV2PairConfig";
import factoryABI from "../abi/factoryABI.json";
import pairABI from "../abi/pairABI.json";

const { deployContract } = waffle;

describe("UniswapV2PairConfig", () => {
    let uniswapV2PairConfig: UniswapV2PairConfig;

    const [admin, projectContract, proposer] = waffle.provider.getWallets();
    // let proposer: SignerWithAddress;

    beforeEach(async () => {
        uniswapV2PairConfig = await deployContract(
            proposer,
            UniswapV2PairConfigArtifact,
            [
                proposer.address,
                projectContract.address,
            ]
        ) as UniswapV2PairConfig;
    });

    context('when new UniswapV2PairConfig is set', async () => {
        it('has given data', async () => {
            expect(await uniswapV2PairConfig.proposer()).to.be.equal(proposer.address);
            expect(await uniswapV2PairConfig.projectContract()).to.be.equal(projectContract.address);
        });

        it('adds liquidity to BT-AT pair', async () => {
            const mockDAIToken = await deployContract(
                admin,
                FaucetableERC20Artifact,
                [
                    "MockDAIToken",
                    "MDAI"
                ]
            ) as FaucetableERC20;
            const mockWETHToken = await deployContract(
                admin,
                FaucetableERC20Artifact,
                [
                    "MockWETHToken",
                    "MWETH"
                ]
            ) as FaucetableERC20;
                        
            for (let i = 0; i < 10; i++) {
                await mockDAIToken.connect(proposer).faucet();
                await mockWETHToken.connect(proposer).faucet();
            }

            await mockDAIToken.connect(proposer).increaseAllowance(uniswapV2PairConfig.address, BigNumber.from(utils.parseEther("1000")));
            await mockWETHToken.connect(proposer).increaseAllowance(uniswapV2PairConfig.address, BigNumber.from(utils.parseEther("1000")));
            const routerAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
            const tx = await uniswapV2PairConfig.connect(proposer).addLiquidity(mockDAIToken.address, mockWETHToken.address, routerAddress, BigNumber.from(utils.parseEther("1000")), BigNumber.from(utils.parseEther("1000")));
            
            
            const factoryAddress = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
            const factoryContract: Contract = await hre.ethers.getContractAt(factoryABI, factoryAddress);
            
            const pairAddress = await factoryContract.getPair(mockDAIToken.address, mockWETHToken.address);
            const pairContract: Contract = await hre.ethers.getContractAt(pairABI, pairAddress);
            
            await expect(tx)
                .to.emit(mockDAIToken, 'Transfer').withArgs(proposer.address, uniswapV2PairConfig.address, BigNumber.from(utils.parseEther("1000")))
                .to.emit(mockWETHToken, 'Transfer').withArgs(proposer.address, uniswapV2PairConfig.address, BigNumber.from(utils.parseEther("1000")))
                .to.emit(mockDAIToken, 'Transfer').withArgs(uniswapV2PairConfig.address, pairAddress, BigNumber.from(utils.parseEther("1000")))
                .to.emit(mockWETHToken, 'Transfer').withArgs(uniswapV2PairConfig.address, pairAddress, BigNumber.from(utils.parseEther("1000")));

            expect(await pairContract.balanceOf(uniswapV2PairConfig.address)).to.not.equal(0);
        });
    });
});