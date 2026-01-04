import { ethers } from 'ethers';
import { CONTRACTS } from '../constants/contracts';
import { FAUCET_ABI } from '../constants/abis';

export async function getClaimableAmounts(provider, userAddress) {
  if (!provider || !userAddress) {
    return {
      catAmount: 0n,
      darcAmount: 0n,
      pandaAmount: 0n,
      tier: 0,
      nextClaimTime: 0,
      canClaim: false,
    };
  }

  try {
    const faucetContract = new ethers.Contract(CONTRACTS.FAUCET, FAUCET_ABI, provider);
    
    const tierInt = await faucetContract.getUserTier(userAddress);
    const nextClaim = await faucetContract.nextClaimTime(userAddress);
    
    const tierIndex = Number(tierInt);
    
    if (tierIndex === -1) {
      return {
        catAmount: 0n,
        darcAmount: 0n,
        pandaAmount: 0n,
        tier: 0,
        nextClaimTime: 0,
        canClaim: false,
      };
    }

    const tierInfo = await faucetContract.tiers(tierIndex);
    const rewardAmount = tierInfo.rewardAmount;
    
    const now = Math.floor(Date.now() / 1000);
    const canClaimNow = now >= Number(nextClaim);

    return {
      catAmount: rewardAmount,
      darcAmount: rewardAmount,
      pandaAmount: rewardAmount,
      tier: tierIndex,
      nextClaimTime: Number(nextClaim),
      canClaim: canClaimNow,
    };
  } catch (error) {
    console.error('Error fetching claimable amounts:', error);
    return {
      catAmount: 0n,
      darcAmount: 0n,
      pandaAmount: 0n,
      tier: 0,
      nextClaimTime: 0,
      canClaim: false,
    };
  }
}

export async function claimTokens(signer) {
  if (!signer) throw new Error('Signer not available');
  
  const faucetContract = new ethers.Contract(CONTRACTS.FAUCET, FAUCET_ABI, signer);
  const tx = await faucetContract.claim();
  return tx;
}

