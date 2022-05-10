import { waffle } from "hardhat";
import { expect } from "chai";
import { utils } from "ethers";

import FaucetableERC20Artifact from "../artifacts/contracts/test/FaucetableERC20.sol/FaucetableERC20.json";
import { FaucetableERC20 } from "../typechain-types/contracts/test/FaucetableERC20";

const { deployContract } = waffle;

describe("FaucetableERC20", () => {
    let mockDAIToken: FaucetableERC20;
    let mockWETHToken: FaucetableERC20;

    const [admin, backer1] = waffle.provider.getWallets();

    beforeEach(async () => {
        mockDAIToken = await deployContract(
            admin,
            FaucetableERC20Artifact,
            [
                "MockDAIToken",
                "MDAI"
            ]
        ) as FaucetableERC20;
    });

    beforeEach(async () => {
        mockWETHToken = await deployContract(
            admin,
            FaucetableERC20Artifact,
            [
                "MockWETHToken",
                "MWETH"
            ]
        ) as FaucetableERC20;
    });

    context('when new MockDAIToken is minted', async () => {
        it('has given data', async () => {
            expect(await mockDAIToken.totalSupply()).to.be.equal(utils.parseEther("10000"));
            expect(await mockDAIToken.name()).to.be.equal("MockDAIToken");
            expect(await mockDAIToken.symbol()).to.be.equal("MDAI");
        });

        it('distributes MDAI via faucet', async () => {
            await mockDAIToken.connect(backer1).faucet(utils.parseEther("100"));
            expect(await mockDAIToken.balanceOf(backer1.address)).to.be.equal(utils.parseEther("100"));
        });
    });
    
    context('when new MockWETHToken is minted', async () => {
        it('has given data', async () => {
            expect(await mockWETHToken.totalSupply()).to.be.equal(utils.parseEther("10000"));
            expect(await mockWETHToken.name()).to.be.equal("MockWETHToken");
            expect(await mockWETHToken.symbol()).to.be.equal("MWETH");
        });

        it('distributes MWETH via faucet', async () => {
            await mockWETHToken.connect(backer1).faucet(utils.parseEther("100"));
            expect(await mockWETHToken.balanceOf(backer1.address)).to.be.equal(utils.parseEther("100"));
        });
    });
});