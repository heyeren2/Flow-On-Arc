import { CONTRACTS } from './contracts';

export const TOKENS = {
  CAT: {
    symbol: 'CAT',
    name: 'CAT Token',
    address: CONTRACTS.CAT,
    decimals: 18,
    icon: '/icons/CAT.png',
  },
  DARC: {
    symbol: 'DARC',
    name: 'DARC Token',
    address: CONTRACTS.DARC,
    decimals: 18,
    icon: '/icons/DARC.png',
  },
  PANDA: {
    symbol: 'PANDA',
    name: 'PANDA Token',
    address: CONTRACTS.PANDA,
    decimals: 18,
    icon: '/icons/PANDA.png',
  },
  USDC: {
    symbol: 'USDC',
    name: 'USDC',
    address: CONTRACTS.USDC,
    decimals: 6,
    icon: '/icons/USDC.png',
  },
};

export const SWAPPABLE_TOKENS = [TOKENS.CAT, TOKENS.DARC, TOKENS.PANDA];
export const LENDABLE_TOKENS = [TOKENS.CAT, TOKENS.DARC, TOKENS.PANDA];

