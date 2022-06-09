import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {  CS__factory,  CS } from "../../typechain-types";
import {  CN__factory,  CN } from "../../typechain-types";
import {  FUN__factory,  FUN } from "../../typechain-types";

import { createVerify } from "crypto";
import { BigNumber } from "ethers";
import exp from "constants";

chai.use(chaiAsPromised);
const { expect } = chai;

describe("CS", async () => {
    let owner: SignerWithAddress, addr1: SignerWithAddress, addr2: SignerWithAddress, addr3: SignerWithAddress;
    let  cs:  CS;
    let  cn:  CN;
    let  fun:  FUN;


    beforeEach(async () => {
        [owner, addr1, addr2, addr3] = await ethers.getSigners();
        const  CSFactory = (await ethers.getContractFactory("CS")) as  CS__factory;
        const  CNFactory = (await ethers.getContractFactory("CN")) as  CN__factory;
        const  FUNFactory = (await ethers.getContractFactory("FUN")) as  FUN__factory;

        cs = await  CSFactory.deploy(owner.address);
        cn = await  CNFactory.deploy(owner.address);
        fun = await  FUNFactory.deploy();

        await  cs.deployed();
        await  cn.deployed();
        await  fun.deployed();

    });

    describe("setBaseURI", async () => {
        it("The baseURI should be https://test1.com", async () => {
            await cs.setBaseURI("https://test1.com");

            expect(await cs.baseURI()).to.equal("https://test1.com");
        });

        it(`Set baseURI needs MANAGER_ROLE, otherwise it will fail;
            The baseURI should be https://test2.com`, async () => {
            const MANAGER_ROLE = await cs.MANAGER_ROLE();
        
            await expect(cs.connect(addr1).setBaseURI("https://test2.com")
            ).to.be.rejectedWith("AccessControl: account " + addr1.address.toLowerCase() + " is missing role " + MANAGER_ROLE);

            await cs.grantRole(MANAGER_ROLE, addr1.address);
            await cs.connect(addr1).setBaseURI("https://test2.com");

            expect(await cs.baseURI()).to.equal("https://test2.com");
        });
    });

    describe("setAddrs",async () =>{
        it(`Set Addrs needs MANAGER_ROLE, otherwise it will fail;
            Cn addr should be addr2;
            Fun addr should be addr3`, async () =>{
            const MANAGER_ROLE = await cs.MANAGER_ROLE();

            await expect(cs.connect(addr1).setAddrs(addr2.address,addr3.address)
            ).to.be.rejectedWith("AccessControl: account " + addr1.address.toLowerCase() + " is missing role " + MANAGER_ROLE);

            await cs.grantRole(MANAGER_ROLE, addr1.address);
            await cs.connect(addr1).setAddrs(addr2.address,addr3.address);
            expect(await cs.fun()).to.equal(addr2.address);
            expect(await cs.cn()).to.equal(addr3.address);
        });
    });

    describe("setPrices",async () =>{
        it(`Craft prices should be 
            [150,150,150,150,240,240,360,360,360,380,380,400,400,410,500]`,async () =>{
            const MANAGER_ROLE = await cs.MANAGER_ROLE();
            const newPrices = [150,150,150,150,240,240,360,360,360,380,380,400,400,410,500];

            await expect(cs.connect(addr2).setPrices(newPrices)
            ).to.be.rejectedWith("AccessControl: account " + addr2.address.toLowerCase() + " is missing role " + MANAGER_ROLE);
            
            await cs.grantRole(MANAGER_ROLE, addr2.address);
            expect(await cs.connect(addr2).setPrices(newPrices));
            for (let i=0;i<newPrices.length;i++){
                expect(await cs.craftPrices(i)).to.equal(newPrices[i]);
            }
        });
    })

    describe("spawnCss",async () =>{
        it(`Mint NFT shard needs SPAWNER_ROLE, otherwise it will fail;
            Shard#0 hero should be 5, owner is addr2;
            Shard#1 hero should be 4, owner is addr2;
            Shard#2 hero should be 3, owner is addr3;
            totalSupply should be 3;
            balanceOf addr2 should be 2;
            balanceOf addr3 should be 1`, async () => {
            const SPAWNER_ROLE = await cs.SPAWNER_ROLE();

            await expect(cs.connect(addr1).spawnCss([5,4], addr2.address)
            ).to.be.rejectedWith("AccessControl: account " + addr1.address.toLowerCase() + " is missing role " + SPAWNER_ROLE);

            await cs.grantRole(SPAWNER_ROLE, addr1.address);
            await cs.connect(addr1).spawnCss([5,4], addr2.address);
            await cs.connect(addr1).spawnCss([3], addr3.address);

            expect(await cs.data(0, "hero")).to.equal(5);
            expect(await cs.data(1, "hero")).to.equal(4);
            expect(await cs.data(2, "hero")).to.equal(3);

            expect(await cs.ownerOf(1)).to.equal(addr2.address);
            expect(await cs.ownerOf(2)).to.equal(addr3.address);

            expect(await cs.totalSupply()).to.equal(3);
            expect(await cs.balanceOf(addr2.address)).to.equal(2);
            expect(await cs.balanceOf(addr3.address)).to.equal(1);        
        });
    });

    describe("setData", async () => {
        it(`set shard data needs SETTER_ROLE, otherwise it will fail;
            Shard#0 hero should be 11, owner is addr2;
            totalSupply should be 1;
            balanceOf addr2 should be 1`,async ()=> {
            const SETTER_ROLE = await cs.SETTER_ROLE();
            const SPAWNER_ROLE = await cs.SPAWNER_ROLE();

            await cs.grantRole(SPAWNER_ROLE, owner.address);
            await cs.spawnCss([14], addr2.address);
            await expect(cs.connect(addr1).setData(0, "hero",11)
            ).to.be.rejectedWith("AccessControl: account " + addr1.address.toLowerCase() + " is missing role " + SETTER_ROLE);

            await cs.grantRole(SETTER_ROLE, addr1.address);
            await cs.connect(addr1).setData(0, "hero",11);
            expect(await (await cs.data(0, "hero"))).to.equal(11);
            expect(await cs.ownerOf(0)).to.equal(addr2.address);

            expect(await (await cs.totalSupply())).to.equal(1);
            expect(await (await cs.balanceOf(addr2.address))).to.equal(1);
        });
    });

    describe("setDatas", async () => {
        describe("getDatas", async () =>{
            it(`set shard data needs SETTER_ROLE, otherwise it will fail;
                Shard#0 attribute[hp,atk,def] should be [100,5,4], owner is addr2`,async ()=> {
                const SETTER_ROLE = await cs.SETTER_ROLE();
                const SPAWNER_ROLE = await cs.SPAWNER_ROLE();
                const attr = [100,5,4];

                await cs.grantRole(SPAWNER_ROLE, owner.address);
                await cs.spawnCss([14], addr2.address);

                await expect(cs.connect(addr1).setData(0, "attribute",attr)
                ).to.be.rejectedWith("AccessControl: account " + addr1.address.toLowerCase() + " is missing role " + SETTER_ROLE);

                await cs.grantRole(SETTER_ROLE, addr1.address);
                await cs.connect(addr1).setDatas(0, "attribute",[100,5,4]);
                // for(let i = 0;i < 3;i++){
                //     expect(await (await cs.datas(0, "attribute",i))).to.equal(attr[i]);
                // }
                expect(await (await cs.getDatas(0,"attribute")).map(Number)).to.deep.include.members(attr);

                expect(await cs.ownerOf(0)).to.equal(addr2.address);

            });
        });
    });

    describe("craft",async () =>{
        describe("getCraftPrice",async () =>{
            it(`Shard#0-49 hero 6;
                Shard#50-99 hero 11;
                Shard#100-109 master shard;
                Amount of shard should be with range(0,100] 10x;
                First shard should not be master shard;
                All shards should be same or include master shard;
                Owner crafts 20 shards,balance of owner should be 2`, async ()=>{
                const SPAWNER_ROLE = await cs.SPAWNER_ROLE(); 
                let input = [];

                await cs.setAddrs(fun.address,cn.address);
            
                await cs.grantRole(SPAWNER_ROLE, owner.address);
                await cn.grantRole(SPAWNER_ROLE, cs.address);

                for(let i =0;i<50;i++){
                    await cs.spawnCss([6], owner.address);
                }
                for(let i =0;i<50;i++){
                    await cs.spawnCss([11], owner.address);
                }
                for(let i =0;i<10;i++){
                    await cs.spawnCss([100], owner.address);
                }
                expect(await cs.getCraftPrice([6,6,6,6,6,6,6,6,6,6])).to.equal(BigNumber.from("200000000000000000000"));

                await expect(cs.craft([])).to.be.rejectedWith("CsIds length must > 0");
           
                //[6,..,6,11,...,11,100,...,100] len=110
                //[0,...,109]
                for(let i=0;i<110;i++){
                    input.push(i);
                }
                await expect(cs.craft(input)).to.be.rejectedWith("CsIds length must <= 100");
            
                input=[];
                //hero [6,..,6,11,...,11] len=99
                //id [0,...,98]
                for(let i=0;i<99;i++){
                    input.push(i);
                }
                await expect(cs.craft(input)).to.be.rejectedWith("CsIds length % 10 must == 0");

                //hero [100,6,..,6,11,...,11] len=100
                //id [101,0,...,98]
                input.unshift(101);
                await expect(cs.craft(input)).to.be.rejectedWith("Hero must < 100");

                await fun.approve(cs.address,BigNumber.from("100000000000000000000000"));

                //hero [6,..,6,11,...,11,100] len=100
                //id [0,...,98,101]
                input.shift();
                input.push(101);
                
                await expect(cs.craft(input)).to.be.rejectedWith("Cs hero mismatch");

                //[6,..,6,100] len=20
                //[0,...,18,101]
                input=[];
                for(let i=0;i<19;i++){
                    input.push(i);
                }
                input.push(101);

                await cs.craft(input);
                expect(await cs.balanceOf(owner.address)).to.equal(90);
                expect(await cn.balanceOf(owner.address)).to.equal(2);
            });
        });
    });

    describe("safeTransferFromBatch", async () => {
        it(`Shard#0 hero 3 owner is addr1;
            Shard#1 hero 4 owner is addr1;
            Shard#2 hero 5 owner is addr1;
            Shard#3 hero 6 owner is addr2;`,async () =>{
            const SPAWNER_ROLE = await cs.SPAWNER_ROLE();
            const data1 = [3,4,5,6];
            const data2 = [0,1,2];

            await cs.grantRole(SPAWNER_ROLE, owner.address);
            await cs.spawnCss(data1, addr2.address);

            for(let i=0;i<data1.length;i++){
                expect(await cs.ownerOf(i)).to.equal(addr2.address);
            }
            await cs.connect(addr2).safeTransferFromBatch(addr2.address,addr1.address,data2);
            
            for(let i=0;i<data2.length;i++){
                expect(await cs.ownerOf(data2[i])).to.equal(addr1.address);
            }
        });
    });
    
    describe("tokensOfOwnerBySize", async () => {
        it(`Shard#0 2 owner is addr1;
            Shard#1 3 owner is addr1;
            Shard#2 3 owner is addr2;
            Shard#3 11 owner is addr1;
            List of shards owned by addr1 (cursor= 1,size= 1 ) should be [[1,2],1];
            List of shards owned by addr1 (cursor= 1,size= 5 ) should be [[1,3],3] `,async ()=> {
            const SPAWNER_ROLE = await cs.SPAWNER_ROLE();

            await cs.grantRole(SPAWNER_ROLE, owner.address);
            await cs.spawnCss([2,3], addr1.address);
            await cs.spawnCss([3], addr2.address);
            await cs.spawnCss([11], addr1.address);

            expect((await cs.tokensOfOwnerBySize(addr1.address,1,1)).flat().map(Number)).to.deep.include.members([1,2,1]);
            expect((await cs.tokensOfOwnerBySize(addr1.address,1,5)).flat().map(Number)).to.deep.include.members([1,3,3]);
        });
    });

    describe("getRandomNumber",async () =>{
        it(`Two random numbers are different`,async () => {
            const n1 = await cs.getRandomNumber(1,"hero",233,400);
            const n2 = await cs.getRandomNumber(1,"hero",233,401);
            
            expect(n1).to.not.equal(n2);
        });
    });

    describe("tokenURI",async () =>{
        it(`If
            baseURI is https://test3.com
            Shard#0 hero is 4, owner is addr2;
            URI of Shard#0 should not be null`, async () =>{
            const SPAWNER_ROLE = await cn.SPAWNER_ROLE();
            await cs.grantRole(SPAWNER_ROLE, owner.address);

            await cs.setBaseURI("https://test3.com");
            await cs.spawnCss([4], addr2.address);

            expect(await cs.tokenURI(0)).to.not.equal("");
            await expect(cs.tokenURI(5)).to.be.rejectedWith("ERC721Metadata: URI query for nonexistent token");
  
        });
    });

    describe("supportsInterface",async ()=>{
        it(`CS should support interface ERC165`,async () =>{
            expect(await cs.supportsInterface("0x01ffc9a7")).to.equal(true);
        });
    });
});