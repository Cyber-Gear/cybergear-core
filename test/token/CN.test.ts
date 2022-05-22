import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { CN__factory, CN } from "../../typechain-types";

chai.use(chaiAsPromised);
const { expect } = chai;

describe("CN", async () => {
    let owner: SignerWithAddress, addr1: SignerWithAddress, addr2: SignerWithAddress, addr3: SignerWithAddress;
    let cn: CN;

    beforeEach(async () => {
        [owner, addr1, addr2, addr3] = await ethers.getSigners();
        const cnFactory = (await ethers.getContractFactory("CN")) as CN__factory;
        cn = await cnFactory.deploy(owner.address);
        await cn.deployed();
    });

    describe("setBaseURI", async () => {
        it("The baseURI should be https://test1.com", async () => {
            await cn.setBaseURI("https://test1.com");

            expect(await cn.baseURI()).to.equal("https://test1.com");
        });

        it(`Set baseURI needs MANAGER_ROLE, otherwise it will fail;
            The baseURI should be https://test2.com`, async () => {
            const MANAGER_ROLE = await cn.MANAGER_ROLE();

            await expect(cn.connect(addr1).setBaseURI("https://test2.com")
            ).to.be.revertedWith("AccessControl: account " + addr1.address.toLowerCase() + " is missing role " + MANAGER_ROLE);

            await cn.grantRole(MANAGER_ROLE, addr1.address);
            await cn.connect(addr1).setBaseURI("https://test2.com");

            expect(await cn.baseURI()).to.equal("https://test2.com");
        });
    });

    describe("spawnCn", async () => {
        it(`Mint NFT needs SPAWNER_ROLE, otherwise it will fail;
            NFT#0 hero should be 15, owner is addr2;
            NFT#1 hero should be 14, owner is addr2;
            NFT#2 hero should be 13, owner is addr3;
            totalSupply should be 3;
            balanceOf addr2 should be 2;
            balanceOf addr3 should be 1`, async () => {
            const SPAWNER_ROLE = await cn.SPAWNER_ROLE();

            await cn.grantRole(SPAWNER_ROLE, owner.address);
            await cn.spawnCn(15, addr2.address);
            expect(await cn.data(0, "hero")).to.equal(15);
            expect(await cn.ownerOf(0)).to.equal(addr2.address);

            await expect(cn.connect(addr2).spawnCn(14, addr2.address)
            ).to.be.revertedWith("AccessControl: account " + addr2.address.toLowerCase() + " is missing role " + SPAWNER_ROLE);

            await cn.grantRole(SPAWNER_ROLE, addr2.address);
            await cn.connect(addr2).spawnCn(14, addr2.address);
            expect(await cn.data(1, "hero")).to.equal(14);
            expect(await cn.ownerOf(1)).to.equal(addr2.address);

            await cn.connect(addr2).spawnCn(13, addr3.address);
            expect(await cn.data(2, "hero")).to.equal(13);
            expect(await cn.ownerOf(2)).to.equal(addr3.address);

            expect(await cn.totalSupply()).to.equal(3);
            expect(await cn.balanceOf(addr2.address)).to.equal(2);
            expect(await cn.balanceOf(addr3.address)).to.equal(1);
        });
    });
});