import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { CB__factory, CB } from "../../typechain-types";
import { CN__factory, CN } from "../../typechain-types";
import { FUN__factory, FUN } from "../../typechain-types";
import { createVerify } from "crypto";
import { constants } from "buffer";
import exp from "constants";

chai.use(chaiAsPromised);
const { expect } = chai;

describe("CB", async () => {
    let owner: SignerWithAddress, addr1: SignerWithAddress, addr2: SignerWithAddress, addr3: SignerWithAddress;
    let cb: CB;
    let cn: CN;
    let fun: FUN;
    let zero = "0x0000000000000000000000000000000000000000";

    beforeEach(async () => {
        [owner, addr1, addr2, addr3] = await ethers.getSigners();
        const cbFactory = (await ethers.getContractFactory("CB")) as CB__factory;
        const cnFactory = (await ethers.getContractFactory("CN")) as CN__factory;
        const funFactory = (await ethers.getContractFactory("FUN")) as FUN__factory;
        cb = await cbFactory.deploy(owner.address);
        cn = await cnFactory.deploy(owner.address);
        fun = await funFactory.deploy();
        await cb.deployed();
        await cn.deployed();
        await fun.deployed();
    });

    describe("setBaseURI", async () => {
        it("The baseURI should be https://test1.com", async () => {
            await cb.setBaseURI("https://test1.com");

            expect(await cb.baseURI()).to.equal("https://test1.com");
        });

        it(`Set baseURI needs MANAGER_ROLE, otherwise it will fail;
            The baseURI should be https://test2.com`, async () => {
            const MANAGER_ROLE = await cb.MANAGER_ROLE();
        
            await expect(cb.connect(addr1).setBaseURI("https://test2.com")
            ).to.be.rejectedWith("AccessControl: account " + addr1.address.toLowerCase() + " is missing role " + MANAGER_ROLE);

            await cb.grantRole(MANAGER_ROLE, addr1.address);
            await cb.connect(addr1).setBaseURI("https://test2.com");

            expect(await cb.baseURI()).to.equal("https://test2.com");
        });
    });

    describe("setAddrs",async () =>{
        it(`Set Addrs needs MANAGER_ROLE, otherwise it will fail;
            cnAddr should be add2`, async () =>{
            const MANAGER_ROLE = await cb.MANAGER_ROLE();

            await expect(cb.connect(addr1).setAddrs(addr2.address)
            ).to.be.rejectedWith("AccessControl: account " + addr1.address.toLowerCase() + " is missing role " + MANAGER_ROLE);

            await cb.grantRole(MANAGER_ROLE, addr1.address);
            await cb.connect(addr1).setAddrs(addr2.address);

            expect(await cb.cn()).to.equal(addr2.address);

        });
    });

    describe("setBoxInfo", async () =>{
        it(`Set Addrs needs MANAGER_ROLE, otherwise it will fail;
            Box#1 price should be 10;
            Box#1 address of token should be addr2;
            Box#1 receiving addresses of box should be addr3;
            Box#1 purchase limit per hour should be 5
            Box#1 white list should be true 
            Box#1 hero probability should be [25,75]`, async () =>{
            const MANAGER_ROLE = await cb.MANAGER_ROLE();

            await expect(cb.connect(addr1).setBoxInfo(
            1,10,addr2.address,addr3.address,5,true,[50,50])
            ).to.be.rejectedWith("AccessControl: account " + addr1.address.toLowerCase() + " is missing role " + MANAGER_ROLE);   
            
            await cb.grantRole(MANAGER_ROLE, addr1.address);
            await cb.connect(addr1).setBoxInfo(1,10,addr2.address,addr3.address,5,true,[25,75]);
            
            expect(await cb.boxTokenPrices(1)).to.equal(10);
            expect(await cb.tokenAddrs(1)).to.equal(addr2.address);
            expect(await cb.receivingAddrs(1)).to.equal(addr3.address);
            expect(await cb.hourlyBuyLimits(1)).to.equal(5);
            expect(await cb.whiteListFlags(1)).to.equal(true);
            expect(await cb.heroProbabilities(1,0)).to.equal(25);
            expect(await cb.heroProbabilities(1,1)).to.equal(75);
        });
    });

    describe("addBoxesMaxSupply",async () =>{
        it(`Set Addrs needs MANAGER_ROLE, otherwise it will fail;
            Box#1 max supply should be 2000;`,async () =>{
            const MANAGER_ROLE = await cb.MANAGER_ROLE();

            await expect(cb.connect(addr1).addBoxesMaxSupply(2000,1)
            ).to.be.rejectedWith("AccessControl: account " + addr1.address.toLowerCase() + " is missing role " + MANAGER_ROLE);

            await cb.grantRole(MANAGER_ROLE, addr1.address);
            await cb.connect(addr1).addBoxesMaxSupply(2000,1);

            expect(await cb.boxesMaxSupply(1)).to.equal(2000);
        });
    });

    describe("addWhiteList",async () =>{
        describe("getWhiteExistence",async () =>{
            describe("removeWhiteList",async () =>{
                it(`Set Addrs needs MANAGER_ROLE, otherwise it will fail;
                    Box#2 white list should be [addr2,addr3];
                    [Addr2,Addr3] should be first in whitelist of box#2 then removed`, async () =>{
                    const MANAGER_ROLE = await cb.MANAGER_ROLE();

                    expect(await cb.getWhiteListExistence(2,addr2.address)).to.equal(false);
                    expect(await cb.getWhiteListExistence(2,addr3.address)).to.equal(false);

                    await expect(cb.connect(addr1).addWhiteList(2,[addr2.address,addr3.address])
                    ).to.be.rejectedWith("AccessControl: account " + addr1.address.toLowerCase() + " is missing role " + MANAGER_ROLE);


                    await cb.grantRole(MANAGER_ROLE, addr1.address);
                    await cb.connect(addr1).addWhiteList(2,[addr2.address,addr3.address]);

                    expect(await cb.getWhiteListExistence(2,addr2.address)).to.equal(true);
                    expect(await cb.getWhiteListExistence(2,addr3.address)).to.equal(true);

                    await cb.connect(addr1).removeWhiteList(2,[addr2.address,addr3.address]);
                    
                    expect(await cb.getWhiteListExistence(2,addr2.address)).to.equal(false);
                    expect(await cb.getWhiteListExistence(2,addr3.address)).to.equal(false);

                });
            }) 
        });
    })

    describe("clearNativeCoin", async () =>{
        it(`Set Addrs needs MANAGER_ROLE, otherwise it will fail;
            Balance of contract should be 0 `,async () =>{
            
            // const balanceOfContract = ethers.provider.getBalance(cb.address);
            const oldBalaceAddr2 = ethers.provider.getBalance(addr2.address);
            await cb.setBoxInfo(3,10,zero,cb.address,10,false,[10,40,50]);
            await cb.addBoxesMaxSupply(100,3);

            await cb.connect(addr1).buyBoxes(1,3,{value: 10});
            expect(await ethers.provider.getBalance(cb.address)).to.equal(10);

            await cb.clearNativeCoin(addr2.address,10);
            expect(await ethers.provider.getBalance(cb.address)).to.equal(0);            
        });
    });

    describe("buyBoxes", async () =>{
        describe("getUserHourlyBoxesLeftSupply",async () =>{
            describe("getBoxesLeftSupply",async () =>{
                it(`Amount should be > 0 otherwise it will fail;
                    Amount should be < box#3 purchase limit otherwise it will fail;
                    Box#3 left supply should be >= amount otherwise it will fail;
                    Price of box#3 should be set otherwise it will fail;
                    Receiving address of box#3 should be set otherwise it will fail;
                    Hero probabilities should be set otherwise it will fail;
                    If whitelist flag of box#3 is on, addr1 should be on whitelist, otherwise it will fail;
                    Box#3 price should be 10;
                    Box#3 hourly purchase limit should be 
                    Addr1 should purchase 6 box#3;
                    Balance of Addr1 box should be 6;
                    Box#3 purchased length should be 6; 
                    hourly left supply no test`, async () =>{
                    await expect(cb.connect(addr1).buyBoxes(0,3)
                    ).to.be.rejectedWith("Amount must > 0");
                    
                    await cb.setBoxInfo(3,0,zero,zero,10,true,[]);
                    await cb.addBoxesMaxSupply(5,3);
                    expect(await cb.getBoxesLeftSupply(3)).to.equal(5);
                    
                    await expect(cb.connect(addr1).buyBoxes(9,3)
                    ).to.be.rejectedWith("Not enough boxes supply");
                    
                    await cb.addBoxesMaxSupply(2000,3);
                    expect(await cb.getBoxesLeftSupply(3)).to.equal(2005);

                    await expect(cb.connect(addr1).buyBoxes(6,3)
                    ).to.be.rejectedWith("The box price of this box has not been set");

                    await cb.setBoxInfo(3,10,zero,zero,10,true,[]);
                    await expect(cb.connect(addr1).buyBoxes(6,3)
                    ).to.be.rejectedWith("The receiving address of this box has not been set");

                    await cb.setBoxInfo(3,10,zero,addr2.address,10,true,[]);
                    await expect(cb.connect(addr1).buyBoxes(6,3)
                    ).to.be.rejectedWith("The hero probability of this box has not been set");

                    await cb.setBoxInfo(3,10,zero,addr2.address,10,true,[20,30,50]);
                    await expect(cb.connect(addr1).buyBoxes(6,3)
                    ).to.be.rejectedWith("Your address must be on the whitelist");

                    await cb.addWhiteList(3,[addr1.address]);
                    await expect(cb.connect(addr1).buyBoxes(6,3)
                    ).to.be.rejectedWith("Price mismatch");
                    
                    //Token addr has not been set 
                    expect(await cb.boxTokenPrices(3)).to.equal(10);
                    await cb.connect(addr1).buyBoxes(6,3,{value: 60});
                    // 6+6>10
                    await expect(cb.connect(addr1).buyBoxes(6,3,{value: 60})
                    ).to.be.rejectedWith("Amount exceeds the hourly buy limit");

                    // expect(await cb.getUserHourlyBoxesLeftSupply(3,addr1.address,))
                    
                    expect(await cb.getBoxesLeftSupply(3)).to.equal(1999);
                    
                    expect(await cb.balanceOf(addr1.address)).to.equal(6);
                    expect(await cb.totalBoxesLength(3)).to.equal(6);

                    //Set token addr
                    cb.setBoxInfo(2,10,fun.address,cb.address,10,false,[25,25,50]);
                    await cb.addBoxesMaxSupply(5,2);
                    await fun.approve(cb.address,100);
                    await cb.buyBoxes(2,2);
                    // 6+3+3>10
                    // await expect(cb.connect(addr1).buyBoxes(3,3)
                    // ).to.be.rejectedWith("Amount exceeds the hourly buy limit");
                    
                    expect(await cb.getBoxesLeftSupply(2)).to.equal(3);
                    
                    expect(await cb.balanceOf(owner.address)).to.equal(2);
                    expect(await cb.totalBoxesLength(2)).to.equal(2);

                });

            })
        })
    });

    describe("openBoxes",async ()=>{
        describe("fulfillRandomness",async () =>{
            describe("getLevel",async ()=>{
                describe("random",async ()=>{
                    it(`Amount must > 0 otherwise it will fail;
                        100 box#2 price 20
                        100 box#3 price 10
                        Addr1 purchases 1 box#2 and 2 box#3;
                        Box#2 #0 owner is addr1;
                        Box#3 #1 owner is addr1;
                        Box#3 #2 owner is addr1;
                        Addr1 open 1 box#2 and 1 box#3 left 1 box#3;
                        `, async () =>{
                        const SPAWNER_ROLE = await cn.SPAWNER_ROLE();

                        await cb.setAddrs(cn.address);
                        await cn.grantRole(SPAWNER_ROLE, cb.address);

                        await expect(cb.connect(addr1).openBoxes([])
                        ).to.be.rejectedWith("Amount must > 0");
        
                        await cb.setBoxInfo(2,20,zero,cb.address,10,false,[2000,3000,5000]);
                        await cb.setBoxInfo(3,10,zero,cb.address,10,false,[500,500,1000,2000,3000,3000]);
                        await cb.addBoxesMaxSupply(100,2);
                        await cb.addBoxesMaxSupply(100,3);
                        await cb.connect(addr1).buyBoxes(1,2,{value: 20});
                        await cb.connect(addr1).buyBoxes(2,3,{value: 20});
        
                        expect(await ethers.provider.getBalance(cb.address)).to.equal(40);

                        await cb.connect(addr1).openBoxes([0,2]);
                        //expect(await cb.reqIdToTypes("0xced103054e349b8dfb51352f0f8fa9b5d20dde3d06f9f43cb2b85bc64b238205",1)).to.equal(3);
                        
                        await cb.connect(addr1).fulfillRandomness("0xced103054e349b8dfb51352f0f8fa9b5d20dde3d06f9f43cb2b85bc64b238205",2);
                    
                        expect(await cb.balanceOf(addr1.address)).to.equal(1);
                             
                    });
                });
            });
        });
    });

    describe("safeTransferFromBatch", async () => {
        it(`Box#2 #0 owner is addr1;
            Box#3 #1 owner is addr1;
            Box#3 #2 owner is addr1;
            Addr1 box#3#1 => addr2;
            Box#2 #0 owner is addr2;
            Box#3 #1 owner is addr2;
            Box#3 #2 owner is addr1;
            BalanceOf addr1 should be 1;
            BalanceOf addr2 should be 2;`,async ()=> {

            await cb.setBoxInfo(2,20,zero,addr2.address,10,false,[20,30,50]);
            await cb.setBoxInfo(3,10,zero,addr2.address,10,false,[10,40,50]);
            await cb.addBoxesMaxSupply(100,2);
            await cb.addBoxesMaxSupply(100,3);
            await cb.connect(addr1).buyBoxes(1,2,{value: 20});
            await cb.connect(addr1).buyBoxes(2,3,{value: 20});

            await cb.connect(addr1).safeTransferFromBatch(addr1.address,addr2.address,[0,1])

            expect(await cb.balanceOf(addr1.address)).to.equal(1);
            expect(await cb.balanceOf(addr2.address)).to.equal(2);
            expect(await cb.ownerOf(0)).to.equal(addr2.address);
            expect(await cb.ownerOf(1)).to.equal(addr2.address);

        });
    });

    describe("tokensOfOwnerBySize", async () => {
        it(`Box#2 #0 owner is addr1;
            Box#2 #1 owner is addr1;
            Box#3 #2 owner is addr2;
            Box#3 #3 owner is addr1;
            List of box owned by addr1 (cursor= 1,size=1 ) should be [[1,2],1]
            List of box owned by addr1 (cursor= 1,size=5 ) should be [[1,3],3] `,async ()=> {
            
            await cb.setBoxInfo(2,20,zero,addr2.address,10,false,[20,30,50]);
            await cb.setBoxInfo(3,10,zero,addr2.address,10,false,[10,40,50]);
            await cb.addBoxesMaxSupply(100,2);
            await cb.addBoxesMaxSupply(100,3);
            await cb.connect(addr1).buyBoxes(2,2,{value: 40});
            await cb.connect(addr2).buyBoxes(1,3,{value: 10});
            await cb.connect(addr1).buyBoxes(1,3,{value: 10});

            expect(await (await cb.tokensOfOwnerBySize(addr1.address,1,1)).flat().map(Number)).to.deep.include.members([1,2,1]);
            expect(await (await cb.tokensOfOwnerBySize(addr1.address,1,5)).flat().map(Number)).to.deep.include.members([1,3,3]);
        });
    });

    describe("tokenURI",async () =>{
        it(`If
            baseURI is https://test3.com
            Box#3#0 owner is addr1;
            URI of Box#0 should not be null`, async () =>{

            await cb.setBoxInfo(3,10,zero,addr2.address,10,false,[10,40,50]);
            await cb.addBoxesMaxSupply(100,3);

            await cb.setBaseURI("https://test3.com");
            await cb.connect(addr1).buyBoxes(1,3,{value: 10});

            expect(await cb.tokenURI(0)).to.not.equal("");
            await expect(cb.tokenURI(5)).to.be.rejectedWith("ERC721Metadata: URI query for nonexistent token");

        });
    });

    describe("supportsInterface",async ()=>{
        it(`CB should support interface ERC165`,async () =>{
            expect(await cb.supportsInterface("0x01ffc9a7")).to.equal(true);
        });
    });
});