import { waffle } from "hardhat";
import { expect } from "chai";
import { BigNumber, utils } from "ethers";

import ProjectFactoryArtifact from "../artifacts/contracts/ProjectFactory.sol/ProjectFactory.json"
import { ProjectFactory } from "../typechain-types/contracts/ProjectFactory"

const { deployContract } = waffle

describe("ProjectFactory", () => {
    let projectFactory: ProjectFactory;

    const [proposer, manufacturer] = waffle.provider.getWallets();

    beforeEach(async () => {
        projectFactory = await deployContract(
            proposer,
            ProjectFactoryArtifact,
            []
        ) as ProjectFactory;
    });

    context("when new ProjectFactory is deployed", async() => {
        it('creates new Project on proposer\'s request', async () => {
            await projectFactory.connect(proposer).createProject("New Battery", BigNumber.from(utils.parseEther("0.01")), manufacturer.address, 10);
            expect(await projectFactory.createdProjects(0)).to.not.equal(0);
        });

        it('gets addresses of created projects', async () => {
            await projectFactory.connect(proposer).createProject("New Battery", BigNumber.from(utils.parseEther("0.01")), manufacturer.address, 10);
            expect(await projectFactory.createdProjects(0)).to.be.equal((await projectFactory.getProjects())[0]);
        });
    });
});