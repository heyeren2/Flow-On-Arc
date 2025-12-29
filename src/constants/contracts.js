// Contract addresses - Update these with your deployed contract addresses
export const CONTRACTS = {
  // Token addresses
  CAT: '0xFC28c3839E51686BA7CC29D428Fc5a183b2C75ad',
  DARC: '0x6dAab4Bd4031c33197d973dd4a364Eef3Bce7294',
  PANDA: '0xffB1B71a42714888aF3AEbbE7BA68Be4c2ECD236',
  USDC: '0x3600000000000000000000000000000000000000',
  
  // Contract addresses
  FAUCET: '0x45f38af8AF8498113288cc1912F34351a0fb5E4A',
  SWAP_ROUTER: '0x59D97e9fB8bafdbDDEb562Ae6291A42e6a5a48BB',
  LENDING_POOL: '0xA7b038E0276b3a64e447D09FDeC18Dd8754514a8',
};

// Arc Testnet chain configuration
export const ARC_TESTNET = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: {
    decimals: 6,
    name: 'USDC',
    symbol: 'USDC',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.arc.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Explorer',
      url: 'https://testnet.arcscan.app',
    },
  },
  testnet: true,
};

