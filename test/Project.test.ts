import hre, { ethers, waffle } from "hardhat";
import { expect } from "chai";
import { BigNumber, utils } from "ethers";

import ProjectArtifact from "../artifacts/contracts/Project.sol/Project.json";
import { Project } from "../typechain-types/contracts/Project";

const { deployContract } = waffle;

describe("Project", () => {
    let project: Project;

    const [proposer, manufacturer, backer1, backer2] = waffle.provider.getWallets();

    beforeEach(async () => {
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: ["0xE78388b4CE79068e89Bf8aA7f218eF6b9AB0e9d0"],
        });

        const signer = await ethers.getSigner("0xE78388b4CE79068e89Bf8aA7f218eF6b9AB0e9d0");
        
        project = await deployContract(
            signer,
            ProjectArtifact,
            [
                proposer.address, 
                "New Battery", 
                BigNumber.from(utils.parseEther("0.01")), 
                manufacturer.address, 
            ]
        ) as Project;

    });

    context("when new Project is deployed", async () => {
        it('has given data', async () => {
            expect(await project.proposer()).to.be.equal(proposer.address)
            expect(await project.description()).to.be.equal("New Battery");
            expect(await project.minimumBacking()).to.be.equal(BigNumber.from(utils.parseEther("0.01")));
            expect(await project.manufacturer()).to.be.equal(manufacturer.address);
        });

        it('starts backingTime', async () => {
            await project.startBacking(10);
            expect((await project.backingTime()).open).to.be.equal(true);
            expect((await project.backingTime()).closeTime).to.be.above(0);
        });
    });
});