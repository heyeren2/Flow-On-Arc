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
    
    const [claimableResult, nextClaimTime, canClaimNow, tier] = await Promise.all([
      faucetContract.getClaimableAmounts(userAddress),
      faucetContract.getNextClaimTime(userAddress),
      faucetContract.canClaim(userAddress),
      faucetContract.getUserTier(userAddress),
    ]);

    // Handle tuple response - ethers returns tuples as objects with numeric keys
    // The ABI shows: returns (uint256 catAmount, uint256 darcAmount, uint256 pandaAmount, uint256 tierIndex)
    const catAmount = claimableResult.catAmount ?? claimableResult[0] ?? 0n;
    const darcAmount = claimableResult.darcAmount ?? claimableResult[1] ?? 0n;
    const pandaAmount = claimableResult.pandaAmount ?? claimableResult[2] ?? 0n;

    return {
      catAmount: typeof catAmount === 'bigint' ? catAmount : BigInt(catAmount?.toString() || '0'),
      darcAmount: typeof darcAmount === 'bigint' ? darcAmount : BigInt(darcAmount?.toString() || '0'),
      pandaAmount: typeof pandaAmount === 'bigint' ? pandaAmount : BigInt(pandaAmount?.toString() || '0'),
      tier: Number(tier),
      nextClaimTime: Number(nextClaimTime),
      canClaim: Boolean(canClaimNow),
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

