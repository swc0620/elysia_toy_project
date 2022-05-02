import { waffle } from "hardhat";
import { expect } from "chai";
import { BigNumber, utils } from "ethers";

import MockDAITokenArtifact from "../artifacts/contracts/test/MockDAIToken.sol/MockDAIToken.json";
import { MockDAIToken } from "../typechain-types/contracts/MockDAIToken";

const { deployContract } = waffle;

describe("MockDAIToken", () => {
    let mockDAIToken: MockDAIToken;

    const [admin, backer1] = waffle.provider.getWallets();

    beforeEach(async () => {
        mockDAIToken = await deployContract(
            admin,
            MockDAITokenArtifact,
            [
                "MockDAIToken",
                "MDAI"
            ]
        ) as MockDAIToken;
    });

    context('when new MockDAIToken is minted', async () => {
        it('has given data', async () => {
            expect(await mockDAIToken.totalSupply()).to.be.equal(BigNumber.from(utils.parseEther("10000")));
            expect(await mockDAIToken.name()).to.be.equal("MockDAIToken");
            expect(await mockDAIToken.symbol()).to.be.equal("MDAI");
        });

        it('distributes MDAI via faucet', async () => {
            await mockDAIToken.connect(backer1).faucet();
            expect(await mockDAIToken.balanceOf(backer1.address)).to.be.equal(BigNumber.from(utils.parseEther("100")));
        });
    });
});