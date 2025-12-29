import { ethers } from 'ethers';
import { ERC20_ABI } from '../constants/abis';
import { TOKENS } from '../constants/tokens';

export async function getTokenBalance(provider, tokenAddress, userAddress) {
  if (!provider || !userAddress || !tokenAddress) {
    return 0n;
  }
  
  try {
    // Ensure addresses are checksummed
    const checksummedTokenAddress = ethers.getAddress(tokenAddress);
    const checksummedUserAddress = ethers.getAddress(userAddress);
    
    const tokenContract = new ethers.Contract(checksummedTokenAddress, ERC20_ABI, provider);
    const balance = await tokenContract.balanceOf(checksummedUserAddress);
    
    return balance;
  } catch (error) {
    console.error(`Error fetching token balance for ${tokenAddress}:`, error);
    // Return 0n on error to prevent breaking the UI
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
    ];

    const balances = await Promise.all(balancePromises);

    return {
      CAT: balances[0] || 0n,
      DARC: balances[1] || 0n,
      PANDA: balances[2] || 0n,
      USDC: balances[3] || 0n,
    };
  } catch (error) {
    console.error('Error fetching all balances:', error);
    return {
      CAT: 0n,
      DARC: 0n,
      PANDA: 0n,
      USDC: 0n,
    };
  }
}

