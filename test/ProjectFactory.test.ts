import hre, { waffle } from "hardhat";
import { expect } from "chai";
import { BigNumber, Contract, utils } from "ethers";

import ProjectFactoryArtifact from "../artifacts/contracts/ProjectFactory.sol/ProjectFactory.json"
import { ProjectFactory } from "../typechain-types/contracts/ProjectFactory"
import { hexStripZeros } from "ethers/lib/utils";

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
            await projectFactory.connect(proposer).createProject("New Battery", BigNumber.from(utils.parseEther("0.01")), manufacturer.address);
            const projectAddress = await projectFactory.createdProjects(0)
            expect(projectAddress).to.not.equal(0);

            const projectABI = [{"constant":true,"inputs":[],"name":"proposer","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"}, {"constant":true,"inputs":[],"name":"manufacturer","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"}, {"constant":true,"inputs":[],"name":"description","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"}, {"constant":true,"inputs":[],"name":"minimumBacking","outputs":[{"internalType":"uint","name":"","type":"uint"}],"payable":false,"stateMutability":"view","type":"function"}]

            const projectContract: Contract = await hre.ethers.getContractAt(projectABI, projectAddress);
            expect(await projectContract.proposer()).to.be.equal(proposer.address);
            expect(await projectContract.description()).to.be.equal("New Battery");
            expect(await projectContract.minimumBacking()).to.be.equal(BigNumber.from(utils.parseEther("0.01")));
            expect(await projectContract.manufacturer()).to.be.equal(manufacturer.address);
        });

        it('gets addresses of created projects', async () => {
            await projectFactory.connect(proposer).createProject("New Battery", BigNumber.from(utils.parseEther("0.01")), manufacturer.address);
            expect(await projectFactory.createdProjects(0)).to.be.equal((await projectFactory.getProjects())[0]);
        });
    });
});