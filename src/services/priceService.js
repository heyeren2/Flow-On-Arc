import { ethers } from 'ethers';
import { CONTRACTS } from '../constants/contracts';
import { LENDING_POOL_ABI } from '../constants/abis';
import { TOKENS } from '../constants/tokens';

// Known precompile addresses that aren't in the lending pool
const USDC_PRECOMPILE = '0x3600000000000000000000000000000000000000';

export async function getTokenPrice(provider, tokenAddress) {
  if (!provider || !tokenAddress) return 0;

  // USDC is always $1 - skip RPC call
  if (tokenAddress.toLowerCase() === USDC_PRECOMPILE.toLowerCase()) {
    return 1.0;
  }

  try {
    const lendingPool = new ethers.Contract(CONTRACTS.LENDING_POOL, LENDING_POOL_ABI, provider);
    const reserveData = await lendingPool.getReserveData(tokenAddress);

    // priceUSD is the 5th element (index 4) in the return tuple
    const priceUSD = reserveData[4];

    // Convert from wei (assuming price is stored with 18 decimals)
    return Number(priceUSD) / 1e18;
  } catch (error) {
    console.warn('[RPC] Token price fetch failed:', error.code || error.message);
    return 0;
  }
}

export async function getAllTokenPrices(provider) {
  if (!provider) {
    return {
      CAT: 0,
      DARC: 0,
      PANDA: 0,
      USDC: 1.0, // USDC is always $1
    };
  }

  try {
    const prices = await Promise.all([
      getTokenPrice(provider, TOKENS.CAT.address).catch(() => 0),
      getTokenPrice(provider, TOKENS.DARC.address).catch(() => 0),
      getTokenPrice(provider, TOKENS.PANDA.address).catch(() => 0),
    ]);

    return {
      CAT: prices[0] || 0,
      DARC: prices[1] || 0,
      PANDA: prices[2] || 0,
      USDC: 1.0, // USDC is always $1
    };
  } catch (error) {
    console.error('Error fetching all token prices:', error);
    return {
      CAT: 0,
      DARC: 0,
      PANDA: 0,
      USDC: 1.0,
    };
  }
}

