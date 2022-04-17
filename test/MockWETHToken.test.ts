import { waffle } from "hardhat";
import { expect } from "chai";
import { BigNumber, utils } from "ethers";

import MockWETHTokenArtifact from "../artifacts/contracts/MockWETHToken.sol/MockWETHToken.json";
import { MockWETHToken } from "../typechain-types/contracts/MockWETHToken";

const { deployContract } = waffle;

describe("MockWETHToken", () => {
    let mockWETHToken: MockWETHToken;

    const [admin, backer1] = waffle.provider.getWallets();

    beforeEach(async () => {
        mockWETHToken = await deployContract(
            admin,
            MockWETHTokenArtifact,
            [
                "MockWETHToken",
                "MWETH"
            ]
        ) as MockWETHToken;
    });

    context('when new MockWETHToken is minted', async () => {
        it('has given data', async () => {
            expect(await mockWETHToken.totalSupply()).to.be.equal(BigNumber.from(utils.parseEther("10000")));
            expect(await mockWETHToken.name()).to.be.equal("MockWETHToken");
            expect(await mockWETHToken.symbol()).to.be.equal("MWETH");
        });

        it('distributes MWETH via faucet', async () => {
            await mockWETHToken.connect(backer1).faucet();
            expect(await mockWETHToken.balanceOf(backer1.address)).to.be.equal(BigNumber.from(utils.parseEther("1")));
        });
    });
});