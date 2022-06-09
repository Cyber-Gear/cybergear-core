import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { FUN__factory, FUN } from "../../typechain-types";
import { createVerify } from "crypto";

chai.use(chaiAsPromised);
const { expect } = chai;


describe("FUN", async () => {
    let owner: SignerWithAddress, addr1: SignerWithAddress, addr2: SignerWithAddress, addr3: SignerWithAddress;
    let fun: FUN;

    beforeEach(async () => {
        [owner, addr1, addr2, addr3] = await ethers.getSigners();
        const FUNFactory = (await ethers.getContractFactory("FUN")) as FUN__factory;
        fun = await FUNFactory.deploy();
        await fun.deployed();
    });
});