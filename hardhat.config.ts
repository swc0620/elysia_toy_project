import "dotenv/config";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";

import "hardhat-deploy";

import { HardhatUserConfig } from "hardhat/types";

const config: HardhatUserConfig = {
  solidity: "0.8.4",
  namedAccounts: {
    admin: 0,
  },
  networks: {
    hardhat: {},
    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: process.env.ADMIN !== undefined ? [process.env.ADMIN] : [""],
      chainId: 1,
    },
    ropsten: {
      url: `https://ropsten.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: process.env.ADMIN !== undefined ? [process.env.ADMIN] : [""],
      chainId: 3,
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: process.env.ADMIN !== undefined ? [process.env.ADMIN] : [""],
      chainId: 4,
    }
  },
  verify: {
    etherscan: {
      apiKey: process.env.ETHERSCAN_API_KEY,
    },
  }
};

export default config;