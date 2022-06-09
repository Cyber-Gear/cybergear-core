import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {  Market__factory,  Market } from "../../typechain-types";
import {  CS__factory,  CS } from "../../typechain-types";
import {  CB__factory,  CB } from "../../typechain-types";
import {  CN__factory,  CN } from "../../typechain-types";
import {  FUN__factory,  FUN } from "../../typechain-types";
import { solidity } from "ethereum-waffle";

import { createVerify } from "crypto";
import { BigNumber } from "ethers";
import exp from "constants";

chai.use(chaiAsPromised).use(solidity);
const { expect } = chai;

describe("Market", async () => {
    let owner: SignerWithAddress, addr1: SignerWithAddress, addr2: SignerWithAddress, addr3: SignerWithAddress;
    let  market:  Market;
    let  cs:  CS;
    let  cb:  CB;
    let  cn:  CN;
    let  fun:  FUN;

    beforeEach(async () => {
        [owner, addr1, addr2, addr3] = await ethers.getSigners();
        const  MarketFactory = (await ethers.getContractFactory("Market")) as  Market__factory;
        const  CSFactory = (await ethers.getContractFactory("CS")) as  CS__factory;
        const  CBFactory = (await ethers.getContractFactory("CB")) as  CB__factory;
        const  CNFactory = (await ethers.getContractFactory("CN")) as  CN__factory;
        const  FUNFactory = (await ethers.getContractFactory("FUN")) as  FUN__factory;

        market = await  MarketFactory.deploy(owner.address);
        cs = await  CSFactory.deploy(owner.address);
        cb = await  CBFactory.deploy(owner.address);
        cn = await  CNFactory.deploy(owner.address);
        fun = await  FUNFactory.deploy();

        await  market.deployed();
        await  cs.deployed();
        await  cb.deployed();
        await  cn.deployed();
        await  fun.deployed();

    });

    describe("setAddrs",async () =>{
        it(`Treasury address should be addr2`,async () =>{
            const MANAGER_ROLE = await market.MANAGER_ROLE();

            await expect(market.connect(addr1).setAddrs(addr2.address)
            ).to.be.rejectedWith("AccessControl: account " + addr1.address.toLowerCase() + " is missing role " + MANAGER_ROLE);

            await market.grantRole(MANAGER_ROLE, addr1.address);
            await market.connect(addr1).setAddrs(addr2.address);
            expect(await market.treasury()).to.equal(addr2.address);
        });
    });

    describe("setFee",async () =>{
        it(`Fee should be 2000`,async () =>{
            const MANAGER_ROLE = await market.MANAGER_ROLE();

            await expect(market.connect(addr1).setFee(2000)
            ).to.be.rejectedWith("AccessControl: account " + addr1.address.toLowerCase() + " is missing role " + MANAGER_ROLE);

            await market.grantRole(MANAGER_ROLE, addr1.address);

            await expect(market.connect(addr1).setFee(6000)
            ).to.be.rejectedWith("The fee ratio cannot exceed 50%");

            await market.connect(addr1).setFee(2000);
            expect(await market.fee()).to.equal(2000);
        });
    });

    describe("sell",async () =>{
        it(`CB#2 token is AVAX, price is 10, seller addr2;
            CS#2 token is FUN, price is 1,seller addr2;
            CN#1 token is FUN, price is 50,seller addr3;
            `,async ()=>{
            const zero = "0x0000000000000000000000000000000000000000";
            const SPAWNER_ROLE = await cs.SPAWNER_ROLE();

            //sell box
            await cb.setBoxInfo(2,5,zero,addr1.address,10,false,[40,60]);
            await cb.addBoxesMaxSupply(5,2);
            await cb.connect(addr2).buyBoxes(4,2,{value: 20});
            
            expect(await cb.ownerOf(2)).to.equal(addr2.address);
            await expect(market.connect(addr2).sell([cb.address],[2],[zero],[10])
            ).to.be.rejectedWith("ERC721: transfer caller is not owner nor approved");

            await cb.connect(addr2).setApprovalForAll(market.address,true);
            await market.connect(addr2).sell([cb.address],[2],[zero],[10]);

            expect(await market.token(cb.address,2)).to.equal(zero);
            expect(await market.price(cb.address,2)).to.equal(10);
            expect(await market.seller(cb.address,2)).to.equal(addr2.address);

            //sell shard
            await cs.grantRole(SPAWNER_ROLE, owner.address);
            await cs.spawnCss([14,11,12,13], addr2.address);

            expect(await cs.ownerOf(2)).to.equal(addr2.address);
            await expect(market.connect(addr2).sell([cs.address],[2],[fun.address],[1])
            ).to.be.rejectedWith("ERC721: transfer caller is not owner nor approved");

            await cs.connect(addr2).setApprovalForAll(market.address,true);
            await market.connect(addr2).sell([cs.address],[2],[fun.address],[1]);

            expect(await market.token(cs.address,2)).to.equal(fun.address);
            expect(await market.price(cs.address,2)).to.equal(1);
            expect(await market.seller(cs.address,2)).to.equal(addr2.address);

            //sell nft
            await cn.grantRole(SPAWNER_ROLE, owner.address);
            await cn.spawnCn(15, addr2.address);
            await cn.spawnCn(13, addr3.address);
            await cn.spawnCn(10, addr3.address);

            expect(await cn.ownerOf(1)).to.equal(addr3.address);
            await expect(market.connect(addr3).sell([cn.address],[1],[fun.address],[50])
            ).to.be.rejectedWith("ERC721: transfer caller is not owner nor approved");

            await cn.connect(addr3).setApprovalForAll(market.address,true);
            await market.connect(addr3).sell([cn.address],[1],[fun.address],[50]);

            expect(await market.token(cn.address,1)).to.equal(fun.address);
            expect(await market.price(cn.address,1)).to.equal(50);
            expect(await market.seller(cn.address,1)).to.equal(addr3.address);

        });
    });

    describe("cancel",async ()=>{
        it(`CS#0 token is FUN, price is 5,seller addr3;
            CS#1 token is FUN, price is 1,seller addr2;
            CS#2 token is FUN, price is 2,seller addr2(DELETED);
            CS#3 token is FUN, price is 3,seller addr2(DELETED);`,async () =>{
            
            const SPAWNER_ROLE = await cs.SPAWNER_ROLE();
            const zero = "0x0000000000000000000000000000000000000000";   

            await cs.grantRole(SPAWNER_ROLE, owner.address);
            await cs.spawnCss([14], addr3.address);
            await cs.spawnCss([11,12,13], addr2.address);

            await cs.connect(addr3).setApprovalForAll(market.address,true);
            await market.connect(addr3).sell([cs.address],[0],[fun.address],[5]);
            await cs.connect(addr2).setApprovalForAll(market.address,true);
            await market.connect(addr2).sell([cs.address,cs.address,cs.address],[1,2,3],[fun.address,fun.address,fun.address],[1,2,3]);

            await expect(market.connect(addr2).cancel([cs.address,cs.address],[0,3])
            ).to.be.rejectedWith("This NFT is not own");

            await market.connect(addr2).cancel([cs.address,cs.address],[2,3]);

            for(let i=0;i<2;i++){
                expect(await market.token(cs.address,i+2)).to.equal(zero);
                expect(await market.price(cs.address,i+2)).to.equal(0);
                expect(await market.seller(cs.address,i+2)).to.equal(zero);
            }

            expect(await cs.balanceOf(addr2.address)).to.equal(2);
        });
    });

    describe("buy",async ()=>{
        it(`On sale:
            CS#0 token is FUN, price is 5,seller addr2;
            CS#1 token is AVAX, price is 1,seller addr2;
            CS#2 token is FUN, price is 2,seller addr2;
            CS#3 token is FUN, price is 3,seller addr2;
            addr3 buy CS#0 CS#1;
            Owner of CS#2 should be owner;`,async ()=>{
            
            const SPAWNER_ROLE = await cs.SPAWNER_ROLE();
            const SETTER_ROLE = await cs.SETTER_ROLE();
            const zero = "0x0000000000000000000000000000000000000000";   

            await cs.grantRole(SPAWNER_ROLE, owner.address);
            await cs.grantRole(SETTER_ROLE, owner.address);
            await market.setAddrs(addr1.address);
            await market.setFee(2);

            await cs.spawnCss([5,11,12,13], addr2.address);

            await cs.connect(addr2).setApprovalForAll(market.address,true);
            await market.connect(addr2).sell([cs.address,cs.address,cs.address,cs.address],[0,1,2,3],[fun.address,zero,fun.address,fun.address],[5,1,2,3]);
            
            expect(await fun.allowance(owner.address,fun.address)).to.equal(0);

            // await fun.connect(addr3).increaseAllowance(fun.address,60);

            await fun.approve(market.address,100);
            expect(await fun.allowance(owner.address,market.address)).to.equal(100);

            await market.buy([cs.address,cs.address],[0,1],{value:1});

            for(let i=0;i<2;i++){
                expect(await market.token(cs.address,i)).to.equal(zero);
                expect(await market.price(cs.address,i)).to.equal(0);
                expect(await market.seller(cs.address,i)).to.equal(zero);
            }

            expect(await cs.ownerOf(0)).to.equal(owner.address);
            expect(await cs.ownerOf(1)).to.equal(owner.address);

        });
    });
});
