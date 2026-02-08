import { ethers } from 'ethers';
import { CONTRACTS } from '../constants/contracts';
import { LENDING_POOL_ABI, ERC20_ABI } from '../constants/abis';
import { parseTokenAmount } from '../utils/formatters';

export async function getUserAccountData(provider, userAddress) {
  if (!provider || !userAddress) {
    return {
      totalCollateralUSD: 0n,
      totalDebtUSD: 0n,
      availableBorrowsUSD: 0n,
      healthFactor: 0n,
    };
  }

  try {
    const lendingPool = new ethers.Contract(CONTRACTS.LENDING_POOL, LENDING_POOL_ABI, provider);
    const data = await lendingPool.getUserAccountData(userAddress);

    return {
      totalCollateralUSD: data[0],
      totalDebtUSD: data[1],
      availableBorrowsUSD: data[2],
      healthFactor: data[3],
    };
  } catch (error) {
    console.warn('[RPC] User account data fetch failed:', error.code || error.message);
    return {
      totalCollateralUSD: 0n,
      totalDebtUSD: 0n,
      availableBorrowsUSD: 0n,
      healthFactor: 0n,
    };
  }
}

export async function getUserCollateral(provider, userAddress, tokenAddress) {
  if (!provider || !userAddress) return 0n;

  try {
    const lendingPool = new ethers.Contract(CONTRACTS.LENDING_POOL, LENDING_POOL_ABI, provider);
    return await lendingPool.getUserCollateral(userAddress, tokenAddress);
  } catch (error) {
    console.warn('[RPC] User collateral fetch failed:', error.code || error.message);
    return 0n;
  }
}

export async function getUserDebt(provider, userAddress, tokenAddress) {
  if (!provider || !userAddress) return 0n;

  try {
    const lendingPool = new ethers.Contract(CONTRACTS.LENDING_POOL, LENDING_POOL_ABI, provider);
    return await lendingPool.getUserDebt(userAddress, tokenAddress);
  } catch (error) {
    console.warn('[RPC] User debt fetch failed:', error.code || error.message);
    return 0n;
  }
}

export async function checkSupplyAllowance(provider, userAddress, token, amount) {
  if (!provider || !userAddress || !token || !amount) return false;

  try {
    const tokenContract = new ethers.Contract(token.address, ERC20_ABI, provider);
    const amountWei = parseTokenAmount(amount, token.decimals);
    const allowance = await tokenContract.allowance(userAddress, CONTRACTS.LENDING_POOL);
    return allowance >= amountWei;
  } catch (error) {
    console.error('Error checking allowance:', error);
    return false;
  }
}

export async function approveSupplyToken(signer, token, amount) {
  if (!signer) throw new Error('Signer not available');

  const tokenContract = new ethers.Contract(token.address, ERC20_ABI, signer);
  const amountWei = parseTokenAmount(amount, token.decimals);

  const tx = await tokenContract.approve(CONTRACTS.LENDING_POOL, amountWei);
  return tx;
}

export async function executeSupply(signer, token, amount) {
  if (!signer) throw new Error('Signer not available');

  const lendingPool = new ethers.Contract(CONTRACTS.LENDING_POOL, LENDING_POOL_ABI, signer);
  const amountWei = parseTokenAmount(amount, token.decimals);

  const tx = await lendingPool.supplyCollateral(token.address, amountWei);
  return tx;
}

export async function supplyCollateral(signer, token, amount) {
  if (!signer) throw new Error('Signer not available');

  const lendingPool = new ethers.Contract(CONTRACTS.LENDING_POOL, LENDING_POOL_ABI, signer);
  const tokenContract = new ethers.Contract(token.address, ERC20_ABI, signer);

  // Check and approve token if needed
  const amountWei = parseTokenAmount(amount, token.decimals);
  const userAddress = await signer.getAddress();
  const allowance = await tokenContract.allowance(userAddress, CONTRACTS.LENDING_POOL);

  if (allowance < amountWei) {
    const approveTx = await tokenContract.approve(CONTRACTS.LENDING_POOL, amountWei);
    await approveTx.wait();
  }

  // Supply collateral
  const tx = await lendingPool.supplyCollateral(token.address, amountWei);
  return tx;
}

export async function withdrawCollateral(signer, token, amount) {
  if (!signer) throw new Error('Signer not available');

  const lendingPool = new ethers.Contract(CONTRACTS.LENDING_POOL, LENDING_POOL_ABI, signer);
  const amountWei = parseTokenAmount(amount, token.decimals);

  const tx = await lendingPool.withdrawCollateral(token.address, amountWei);
  return tx;
}

export async function borrowTokens(signer, token, amount) {
  if (!signer) throw new Error('Signer not available');

  const lendingPool = new ethers.Contract(CONTRACTS.LENDING_POOL, LENDING_POOL_ABI, signer);
  const amountWei = parseTokenAmount(amount, token.decimals);

  const tx = await lendingPool.borrow(token.address, amountWei);
  return tx;
}

export async function checkRepayAllowance(provider, userAddress, token, amount) {
  if (!provider || !userAddress || !token || !amount) return false;

  try {
    const tokenContract = new ethers.Contract(token.address, ERC20_ABI, provider);
    const amountWei = parseTokenAmount(amount, token.decimals);
    const allowance = await tokenContract.allowance(userAddress, CONTRACTS.LENDING_POOL);
    return allowance >= amountWei;
  } catch (error) {
    console.error('Error checking allowance:', error);
    return false;
  }
}

export async function approveRepayToken(signer, token, amount) {
  if (!signer) throw new Error('Signer not available');

  const tokenContract = new ethers.Contract(token.address, ERC20_ABI, signer);
  const amountWei = parseTokenAmount(amount, token.decimals);

  const tx = await tokenContract.approve(CONTRACTS.LENDING_POOL, amountWei);
  return tx;
}

export async function executeRepay(signer, token, amount) {
  if (!signer) throw new Error('Signer not available');

  const lendingPool = new ethers.Contract(CONTRACTS.LENDING_POOL, LENDING_POOL_ABI, signer);
  const amountWei = parseTokenAmount(amount, token.decimals);

  const tx = await lendingPool.repay(token.address, amountWei);
  return tx;
}

export async function repayTokens(signer, token, amount) {
  if (!signer) throw new Error('Signer not available');

  const lendingPool = new ethers.Contract(CONTRACTS.LENDING_POOL, LENDING_POOL_ABI, signer);
  const tokenContract = new ethers.Contract(token.address, ERC20_ABI, signer);

  // Check and approve token if needed
  const amountWei = parseTokenAmount(amount, token.decimals);
  const userAddress = await signer.getAddress();
  const allowance = await tokenContract.allowance(userAddress, CONTRACTS.LENDING_POOL);

  if (allowance < amountWei) {
    const approveTx = await tokenContract.approve(CONTRACTS.LENDING_POOL, amountWei);
    await approveTx.wait();
  }

  // Repay
  const tx = await lendingPool.repay(token.address, amountWei);
  return tx;
}

