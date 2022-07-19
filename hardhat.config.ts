import { config as dotEnvConfig } from "dotenv";
dotEnvConfig();

import { HardhatUserConfig } from "hardhat/types";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-etherscan";
import "solidity-coverage";

const PRIVATE_KEY =
  process.env.PRIVATE_KEY! ||
  "c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3"; // well known private key
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  solidity: {
    compilers: [{
      version: "0.8.12", settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }],
  },
  networks: {
    hardhat: {},
    localhost: {},
    testnet: {
      url: "https://rinkeby.infura.io/v3/",
      chainId: 4,
      gas: 2100000,
      gasPrice: 20000000000,
      accounts: [PRIVATE_KEY]
    },
    mainnet: {
      url: "https://mainnet.infura.io/v3/",
      chainId: 1,
      gas: 2100000,
      gasPrice: 20000000000,
      accounts: [PRIVATE_KEY]
    },
    coverage: {
      url: "http://127.0.0.1:8555", // Coverage launches its own ganache-cli client
    },
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io
    apiKey: ETHERSCAN_API_KEY,
  },
};

export default config;
