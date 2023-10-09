import hre, { ethers } from "hardhat";

function sleep(s: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, s * 1000);
  })
}

async function main() {
  const constructorArgs: any[] = [
  ];
  const contractName = "Guild";
  const factory = await ethers.getContractFactory(contractName);
  const contract = await factory.deploy(...constructorArgs);
  await contract.deployed();
  console.log(`${contractName} contract successfully deployed:`, contract.address);
  await sleep(20);
  await hre.run("verify:verify", {
    address: contract.address,
    constructorArguments: constructorArgs,
    contract: `contracts/pool/${contractName}.sol:${contractName}`
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
