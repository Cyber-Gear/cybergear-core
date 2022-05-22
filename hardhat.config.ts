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
const SNOWTRACE_API_KEY = process.env.SNOWTRACE_API_KEY;

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  solidity: {
    compilers: [{ version: "0.8.12", settings: {} }],
  },
  networks: {
    hardhat: {},
    localhost: {},
    testnet: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      chainId: 43113,
      gas: 2100000,
      gasPrice: 20000000000,
      accounts: [PRIVATE_KEY]
    },
    mainnet: {
      url: "https://api.avax.network/ext/bc/C/rpc",
      chainId: 43114,
      gas: 2100000,
      gasPrice: 20000000000,
      accounts: [PRIVATE_KEY]
    },
    coverage: {
      url: "http://127.0.0.1:8555", // Coverage launches its own ganache-cli client
    },
  },
  etherscan: {
    // Your API key for Snowtrace
    // Obtain one at https://snowtrace.io/
    apiKey: SNOWTRACE_API_KEY,
  },
};

export default config;
