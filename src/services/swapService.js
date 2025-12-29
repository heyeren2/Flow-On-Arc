import { ethers } from 'ethers';
import { CONTRACTS } from '../constants/contracts';
import { SWAP_ROUTER_ABI, ERC20_ABI } from '../constants/abis';
import { parseTokenAmount } from '../utils/formatters';

export async function getSwapAmountsOut(provider, amountIn, tokenIn, tokenOut) {
  if (!provider || !amountIn || amountIn === '0' || !tokenIn || !tokenOut) {
    return 0n;
  }

  try {
    const swapRouter = new ethers.Contract(CONTRACTS.SWAP_ROUTER, SWAP_ROUTER_ABI, provider);
    const path = [tokenIn.address, tokenOut.address];
    const amountInWei = parseTokenAmount(amountIn, tokenIn.decimals);
    
    const amounts = await swapRouter.getAmountsOut(amountInWei, path);
    return amounts[amounts.length - 1];
  } catch (error) {
    console.error('Error getting swap amounts:', error);
    return 0n;
  }
}

export async function checkSwapAllowance(provider, userAddress, tokenIn, amountIn) {
  if (!provider || !userAddress || !tokenIn || !amountIn) return false;
  
  try {
    const tokenInContract = new ethers.Contract(tokenIn.address, ERC20_ABI, provider);
    const amountInWei = parseTokenAmount(amountIn, tokenIn.decimals);
    const allowance = await tokenInContract.allowance(userAddress, CONTRACTS.SWAP_ROUTER);
    return allowance >= amountInWei;
  } catch (error) {
    console.error('Error checking allowance:', error);
    return false;
  }
}

export async function approveSwapToken(signer, tokenIn, amountIn) {
  if (!signer) throw new Error('Signer not available');

  const tokenInContract = new ethers.Contract(tokenIn.address, ERC20_ABI, signer);
  const amountInWei = parseTokenAmount(amountIn, tokenIn.decimals);
  
  const tx = await tokenInContract.approve(CONTRACTS.SWAP_ROUTER, amountInWei);
  return tx;
}

export async function executeSwap(signer, amountIn, tokenIn, tokenOut, amountOutMin) {
  if (!signer) throw new Error('Signer not available');

  const swapRouter = new ethers.Contract(CONTRACTS.SWAP_ROUTER, SWAP_ROUTER_ABI, signer);
  const path = [tokenIn.address, tokenOut.address];
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
  const amountInWei = parseTokenAmount(amountIn, tokenIn.decimals);
  const amountOutMinWei = parseTokenAmount(amountOutMin, tokenOut.decimals);
  const userAddress = await signer.getAddress();
  
  const tx = await swapRouter.swapExactTokensForTokens(
    amountInWei,
    amountOutMinWei,
    path,
    userAddress,
    deadline
  );

  return tx;
}

export async function swapTokens(signer, amountIn, tokenIn, tokenOut, amountOutMin) {
  if (!signer) throw new Error('Signer not available');

  const swapRouter = new ethers.Contract(CONTRACTS.SWAP_ROUTER, SWAP_ROUTER_ABI, signer);
  const tokenInContract = new ethers.Contract(tokenIn.address, ERC20_ABI, signer);
  
  // Check and approve token if needed
  const amountInWei = parseTokenAmount(amountIn, tokenIn.decimals);
  const userAddress = await signer.getAddress();
  const allowance = await tokenInContract.allowance(userAddress, CONTRACTS.SWAP_ROUTER);
  
  if (allowance < amountInWei) {
    const approveTx = await tokenInContract.approve(CONTRACTS.SWAP_ROUTER, amountInWei);
    await approveTx.wait();
  }

  // Execute swap
  const path = [tokenIn.address, tokenOut.address];
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
  const amountOutMinWei = parseTokenAmount(amountOutMin, tokenOut.decimals);
  
  const tx = await swapRouter.swapExactTokensForTokens(
    amountInWei,
    amountOutMinWei,
    path,
    userAddress,
    deadline
  );

  return tx;
}

