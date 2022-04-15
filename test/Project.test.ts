import { waffle } from "hardhat";
import { expect } from "chai";
import { BigNumber, utils } from "ethers";

import ProjectArtifact from "../artifacts/contracts/Project.sol/Project.json";
import { Project } from "../typechain-types/contracts/Project";

const { deployContract } = waffle;

describe("Project", () => {
    let project: Project;

    const [proposer, manufacturer, backer1, backer2] = waffle.provider.getWallets();

    beforeEach(async () => {
        project = await deployContract(
            proposer,
            ProjectArtifact,
            [
                proposer.address, 
                "New Battery", 
                BigNumber.from(utils.parseEther("0.01")), 
                manufacturer.address, 
                10
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
            expect((await project.backingTime()).open).to.be.equal(true);
            expect((await project.backingTime()).closeTime).to.be.above(0);
        });
    });
});