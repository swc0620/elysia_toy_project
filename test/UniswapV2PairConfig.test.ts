import hre, { ethers, waffle } from "hardhat";
import { expect } from "chai";
import { BigNumber, Contract, ContractReceipt, ContractTransaction, providers, utils } from "ethers";

import UniswapV2PairConfigArtifact from "../artifacts/contracts/test/UniswapV2PairConfig.sol/UniswapV2PairConfig.json";
import MockDAITokenArtifact from "../artifacts/contracts/test/MockDAIToken.sol/MockDAIToken.json";
import MockWETHTokenArtifact from "../artifacts/contracts/test/MockWETHToken.sol/MockWETHToken.json";
import { UniswapV2PairConfig } from "../typechain-types/contracts//test/UniswapV2PairConfig";
import { MockDAIToken } from "../typechain-types/contracts/test/MockDAIToken"; 
import { MockWETHToken } from "../typechain-types/contracts/test/MockWETHToken";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const { deployContract } = waffle;

describe("UniswapV2PairConfig", () => {
    let uniswapV2PairConfig: UniswapV2PairConfig;

    const [admin, projectContract] = waffle.provider.getWallets();
    let proposer: SignerWithAddress;

    beforeEach(async () => {
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: ["0xE78388b4CE79068e89Bf8aA7f218eF6b9AB0e9d0"],
        });
        proposer = await ethers.getSigner("0xE78388b4CE79068e89Bf8aA7f218eF6b9AB0e9d0");

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
                MockDAITokenArtifact,
                [
                    "MockDAIToken",
                    "MDAI"
                ]
            ) as MockDAIToken;
            const mockWETHToken = await deployContract(
                admin,
                MockWETHTokenArtifact,
                [
                    "MockWETHToken",
                    "MWETH"
                ]
            ) as MockWETHToken;
                        
            for (let i = 0; i < 10; i++) {
                await mockDAIToken.connect(proposer).faucet();
                await mockWETHToken.connect(proposer).faucet();
            }

            await mockDAIToken.connect(proposer).transfer(uniswapV2PairConfig.address, BigNumber.from(utils.parseEther("1000")));
            await mockWETHToken.connect(proposer).transfer(uniswapV2PairConfig.address, BigNumber.from(utils.parseEther("1000")));
            const routerAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
            const tx: ContractTransaction = await uniswapV2PairConfig.connect(proposer).addLiquidity(mockDAIToken.address, mockWETHToken.address, routerAddress, 1000, 1000);
            const txReceipt: ContractReceipt = await tx.wait();

            const factoryABI = [{"inputs":[{"internalType":"address","name":"_feeToSetter","type":"address"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"token0","type":"address"},{"indexed":true,"internalType":"address","name":"token1","type":"address"},{"indexed":false,"internalType":"address","name":"pair","type":"address"},{"indexed":false,"internalType":"uint256","name":"","type":"uint256"}],"name":"PairCreated","type":"event"},{"constant":true,"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"allPairs","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"allPairsLength","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"tokenA","type":"address"},{"internalType":"address","name":"tokenB","type":"address"}],"name":"createPair","outputs":[{"internalType":"address","name":"pair","type":"address"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"feeTo","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"feeToSetter","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"name":"getPair","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"_feeTo","type":"address"}],"name":"setFeeTo","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"_feeToSetter","type":"address"}],"name":"setFeeToSetter","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"}];
            const factoryAddress = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
            const factoryContract: Contract = await hre.ethers.getContractAt(factoryABI, factoryAddress);
            
            const BTATpair = await factoryContract.functions.getPair(mockDAIToken.address, mockWETHToken.address);
            console.log(BTATpair); 
            
        });
    });
});