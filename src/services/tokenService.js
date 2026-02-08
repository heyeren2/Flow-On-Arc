import { ethers } from 'ethers';
import { ERC20_ABI, SWAP_ROUTER_ABI } from '../constants/abis';
import { TOKENS } from '../constants/tokens';
import { CONTRACTS } from '../constants/contracts';

// Known precompile addresses that don't support standard ERC20 calls
const USDC_PRECOMPILE = '0x3600000000000000000000000000000000000000';

export async function getTokenBalance(provider, tokenAddress, userAddress) {
  if (!provider || !userAddress || !tokenAddress) {
    return 0n;
  }

  try {
    // Ensure addresses are checksummed
    const checksummedTokenAddress = ethers.getAddress(tokenAddress);
    const checksummedUserAddress = ethers.getAddress(userAddress);

    // USDC is the native token on Arc - use getBalance
    // provider.getBalance() returns wei (18 decimals) but USDC is 6 decimals
    // We need to scale down by 10^12 to convert to 6-decimal format
    if (checksummedTokenAddress.toLowerCase() === USDC_PRECOMPILE.toLowerCase()) {
      const balanceWei = await provider.getBalance(checksummedUserAddress);
      // Convert from 18 decimals to 6 decimals (divide by 10^12)
      const balance = balanceWei / 1_000_000_000_000n;
      return balance;
    }

    const tokenContract = new ethers.Contract(checksummedTokenAddress, ERC20_ABI, provider);
    const balance = await tokenContract.balanceOf(checksummedUserAddress);
    return balance;
  } catch (error) {
    console.warn(`[RPC] Balance fetch failed for ${tokenAddress}:`, error.code || error.message);
    return 0n;
  }
}

export async function getPoolLiquidity(provider, poolId, userAddress) {
  if (!provider || !poolId || !userAddress || poolId.startsWith('0x0000')) return 0n;

  try {
    const ammContract = new ethers.Contract(CONTRACTS.SWAP_ROUTER, SWAP_ROUTER_ABI, provider);
    const balance = await ammContract.userLiquidity(poolId, userAddress);
    return balance;
  } catch (error) {
    console.warn(`[RPC] Pool liquidity fetch failed for ${poolId}:`, error.code || error.message);
    return 0n;
  }
}

export async function getAllBalances(provider, userAddress) {
  if (!provider || !userAddress) {
    return {
      CAT: 0n,
      DARC: 0n,
      PANDA: 0n,
      USDC: 0n,
      LP_USDC_CAT: 0n,
      LP_USDC_DARC: 0n,
      LP_USDC_PANDA: 0n,
    };
  }

  try {
    // Verify user address is valid
    if (!ethers.isAddress(userAddress)) {
      console.error('Invalid user address:', userAddress);
      return {
        CAT: 0n,
        DARC: 0n,
        PANDA: 0n,
        USDC: 0n,
        LP_USDC_CAT: 0n,
        LP_USDC_DARC: 0n,
        LP_USDC_PANDA: 0n,
      };
    }

    // Fetch balances with better error handling per token
    const balancePromises = [
      getTokenBalance(provider, TOKENS.CAT.address, userAddress).catch(err => {
        console.error('Error fetching CAT balance:', err);
        return 0n;
      }),
      getTokenBalance(provider, TOKENS.DARC.address, userAddress).catch(err => {
        console.error('Error fetching DARC balance:', err);
        return 0n;
      }),
      getTokenBalance(provider, TOKENS.PANDA.address, userAddress).catch(err => {
        console.error('Error fetching PANDA balance:', err);
        return 0n;
      }),
      getTokenBalance(provider, TOKENS.USDC.address, userAddress).catch(err => {
        console.error('Error fetching USDC balance:', err);
        return 0n;
      }),
      getPoolLiquidity(provider, CONTRACTS.POOL_ID_USDC_CAT, userAddress).catch(() => 0n),
      getPoolLiquidity(provider, CONTRACTS.POOL_ID_USDC_DARC, userAddress).catch(() => 0n),
      getPoolLiquidity(provider, CONTRACTS.POOL_ID_USDC_PANDA, userAddress).catch(() => 0n),
    ];

    const balances = await Promise.all(balancePromises);

    return {
      CAT: balances[0] || 0n,
      DARC: balances[1] || 0n,
      PANDA: balances[2] || 0n,
      USDC: balances[3] || 0n,
      LP_USDC_CAT: balances[4] || 0n,
      LP_USDC_DARC: balances[5] || 0n,
      LP_USDC_PANDA: balances[6] || 0n,
    };
  } catch (error) {
    console.error('Error fetching all balances:', error.message);
    return {
      CAT: 0n,
      DARC: 0n,
      PANDA: 0n,
      USDC: 0n,
      LP_USDC_CAT: 0n,
      LP_USDC_DARC: 0n,
      LP_USDC_PANDA: 0n,
    };
  }
}

