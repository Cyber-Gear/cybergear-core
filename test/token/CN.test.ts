import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { CN__factory, CN } from "../../typechain-types";
import { createVerify } from "crypto";

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
            ).to.be.rejectedWith("AccessControl: account " + addr1.address.toLowerCase() + " is missing role " + MANAGER_ROLE);

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
            ).to.be.rejectedWith("AccessControl: account " + addr2.address.toLowerCase() + " is missing role " + SPAWNER_ROLE);

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

    describe("setData", async () => {
        it(`set NFT data needs SETTER_ROLE, otherwise it will fail;
            NFT#0 hero should be 11, owner is addr2;
            totalSupply should be 1;
            balanceOf addr2 should be 1`,async ()=> {
            const SETTER_ROLE = await cn.SETTER_ROLE();
            const SPAWNER_ROLE = await cn.SPAWNER_ROLE();

            await cn.grantRole(SPAWNER_ROLE, owner.address);
            await cn.spawnCn(15, addr2.address);

            await expect(cn.connect(addr1).setData(0, "hero",11)
            ).to.be.rejectedWith("AccessControl: account " + addr1.address.toLowerCase() + " is missing role " + SETTER_ROLE);

            await cn.grantRole(SETTER_ROLE, addr1.address);
            await cn.connect(addr1).setData(0, "hero",11);
            expect(await cn.data(0, "hero")).to.equal(11);
            expect(await cn.ownerOf(0)).to.equal(addr2.address);

            expect(await cn.totalSupply()).to.equal(1);
            expect(await cn.balanceOf(addr2.address)).to.equal(1);
        });
    });

    describe("setDatas", async () => {
        describe("getDatas",async () =>{
            it(`set NFT data needs SETTER_ROLE, otherwise it will fail;
                NFT#0 attribute[hp,atk,def] should be [100,5,4], owner is addr2`,async ()=> {
                const SETTER_ROLE = await cn.SETTER_ROLE();
                const SPAWNER_ROLE = await cn.SPAWNER_ROLE();
                const attr = [100,5,4];

                await cn.grantRole(SPAWNER_ROLE, owner.address);
                await cn.spawnCn(15, addr2.address);

                await expect(cn.connect(addr1).setDatas(0, "attribute",attr)
                ).to.be.rejectedWith("AccessControl: account " + addr1.address.toLowerCase() + " is missing role " + SETTER_ROLE);

                await cn.grantRole(SETTER_ROLE, addr1.address);
                await cn.connect(addr1).setDatas(0, "attribute",attr);
                for(let i = 0;i < 3;i++){
                    expect(await cn.datas(0, "attribute",i)).to.equal(attr[i]);
                }
                expect(await cn.ownerOf(0)).to.equal(addr2.address);
                
                expect(await (await cn.getDatas(0,"attribute")).map(Number)).to.deep.include.members([100,5,4]);
            });
        });
    });

    describe("safeTransferFromBatch", async () => {
        it(`NFT#0 hero should be 15, owner is addr1;
            NFT#1 hero should be 13, owner is addr1;
            totalSupply should be 2;
            balanceOf addr1 should be 2`,async ()=> {
            const SPAWNER_ROLE = await cn.SPAWNER_ROLE();

            await cn.grantRole(SPAWNER_ROLE, owner.address);
            await cn.spawnCn(15, addr2.address);
            await cn.spawnCn(13, addr2.address);

            await cn.connect(addr2).safeTransferFromBatch(addr2.address,addr1.address,[0,1])

            expect(await cn.ownerOf(0)).to.equal(addr1.address);
            expect(await cn.ownerOf(1)).to.equal(addr1.address);

            expect(await cn.totalSupply()).to.equal(2);
            expect(await cn.balanceOf(addr1.address)).to.equal(2);
        });
    });

    describe("tokensOfOwnerBySize", async () => {
        it(`If
            NFT#0 hero is 15, owner is addr2;
            NFT#1 hero is 13, owner is addr2;
            NFT#2 hero is 10, owner is addr3;
            NFT#3 hero is 4, owner is addr2;
            List of NFT owned by addr2 (cursor= 1,size=1 ) should be [[1,2],1]
            List of NFT owned by addr2 (cursor= 1,size=5 ) should be [[1,3],3] `,async ()=> {
            const SPAWNER_ROLE = await cn.SPAWNER_ROLE();

            await cn.grantRole(SPAWNER_ROLE, owner.address);
            await cn.spawnCn(15, addr2.address);
            await cn.spawnCn(13, addr2.address);
            await cn.spawnCn(10, addr3.address);
            await cn.spawnCn(4, addr2.address);

            expect(await (await cn.tokensOfOwnerBySize(addr2.address,1,1)).flat().map(Number)).to.deep.include.members([1,2,1]);
            expect(await (await cn.tokensOfOwnerBySize(addr2.address,1,5)).flat().map(Number)).to.deep.include.members([1,3,3]);

        });
    });

    describe("getRandomNumber",async () =>{
        it(`Two random numbers are different`,async () => {
            //same error
            const n1 = await cn.getRandomNumber(1,"hero",233,400);
            const n2 = await cn.getRandomNumber(1,"hero",233,402);
            
            expect(n1).to.not.equal(n2);
        });
    });

    describe("tokenURI",async () =>{
        it(`If
            baseURI is https://test3.com
            NFT#0 hero is 4, owner is addr2;
            URI of NFT#0 should not be null`, async () =>{
            const SPAWNER_ROLE = await cn.SPAWNER_ROLE();
            await cn.grantRole(SPAWNER_ROLE, owner.address);

            await cn.setBaseURI("https://test3.com");
            await cn.spawnCn(4, addr2.address);

            expect(await cn.tokenURI(0)).to.not.equal("");
            await expect(cn.tokenURI(5)).to.be.rejectedWith("ERC721Metadata: URI query for nonexistent token");

        });
    });

    describe("supportsInterface",async ()=>{
        it(`CN should support interface ERC165`,async () =>{
            expect(await cn.supportsInterface("0x01ffc9a7")).to.equal(true);
        });
    });
});