import { ethers, formatUnits } from 'ethers';
import { CONTRACTS } from '../constants/contracts';
import { TOKENS } from '../constants/tokens';
import { SWAP_ROUTER_ABI, ERC20_ABI } from '../constants/abis';
import { parseTokenAmount } from '../utils/formatters';

export async function getSwapAmountsOut(provider, amountIn, tokenIn, tokenOut) {
  if (!provider || !amountIn || amountIn === '0' || !tokenIn || !tokenOut) {
    return 0n;
  }

  try {
    const swapRouter = new ethers.Contract(CONTRACTS.SWAP_ROUTER, SWAP_ROUTER_ABI, provider);
    const amountInWei = parseTokenAmount(amountIn, tokenIn.decimals);
    
    // STAC-STYLE PATHING: 
    // Always check if we need to go through USDC for better liquidity
    const USDC_ADDRESS = CONTRACTS.USDC;
    let path = [tokenIn.address, tokenOut.address];
    
    // If neither token is USDC, route through USDC
    if (tokenIn.address.toLowerCase() !== USDC_ADDRESS.toLowerCase() && 
        tokenOut.address.toLowerCase() !== USDC_ADDRESS.toLowerCase()) {
      path = [tokenIn.address, USDC_ADDRESS, tokenOut.address];
    }
    
    const amounts = await swapRouter.getAmountsOut(amountInWei, path);
    return amounts[amounts.length - 1];
  } catch (error) {
    console.error('Error getting swap amounts:', error);
    return 0n;
  }
}

// Get spot exchange rate (1 token = X) - stable rate regardless of swap amount
export async function getSpotExchangeRate(provider, tokenIn, tokenOut) {
  if (!provider || !tokenIn || !tokenOut) {
    return null;
  }

  try {
    const swapRouter = new ethers.Contract(CONTRACTS.SWAP_ROUTER, SWAP_ROUTER_ABI, provider);
    
    // Use exactly 1 unit of the input token (1 token with proper decimals)
    // This gives us the spot price for 1 token
    const oneTokenAmount = '1';
    const oneTokenWei = parseTokenAmount(oneTokenAmount, tokenIn.decimals);
    
    // Determine path
    const USDC_ADDRESS = CONTRACTS.USDC;
    let path = [tokenIn.address, tokenOut.address];
    
    if (tokenIn.address.toLowerCase() !== USDC_ADDRESS.toLowerCase() && 
        tokenOut.address.toLowerCase() !== USDC_ADDRESS.toLowerCase()) {
      path = [tokenIn.address, USDC_ADDRESS, tokenOut.address];
    }
    
    // Get output for 1 token
    const amounts = await swapRouter.getAmountsOut(oneTokenWei, path);
    const amountOut = amounts[amounts.length - 1];
    
    // Convert both to human-readable format using formatUnits
    // Input: 1 token (already in correct format)
    // Output: amountOut needs to be converted from wei
    const inputHuman = parseFloat(formatUnits(oneTokenWei, tokenIn.decimals)); // Should be 1.0
    const outputHuman = parseFloat(formatUnits(amountOut, tokenOut.decimals));
    
    // Rate = how many output tokens per 1 input token
    const rate = outputHuman / inputHuman;
    
    return rate;
  } catch (error) {
    console.error('Error getting spot exchange rate:', error);
    return null;
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
  const amountInWei = parseTokenAmount(amountIn, tokenIn.decimals);
  const amountOutMinWei = parseTokenAmount(amountOutMin, tokenOut.decimals);
  const userAddress = await signer.getAddress();
  
  // STAC-STYLE PATHING
  const USDC_ADDRESS = CONTRACTS.USDC;
  let path = [tokenIn.address, tokenOut.address];
  
  if (tokenIn.address.toLowerCase() !== USDC_ADDRESS.toLowerCase() && 
      tokenOut.address.toLowerCase() !== USDC_ADDRESS.toLowerCase()) {
    path = [tokenIn.address, USDC_ADDRESS, tokenOut.address];
  }

  const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
  
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
  
  const amountInWei = parseTokenAmount(amountIn, tokenIn.decimals);
  const userAddress = await signer.getAddress();
  const allowance = await tokenInContract.allowance(userAddress, CONTRACTS.SWAP_ROUTER);
  
  if (allowance < amountInWei) {
    const approveTx = await tokenInContract.approve(CONTRACTS.SWAP_ROUTER, amountInWei);
    await approveTx.wait();
  }

  // STAC-STYLE PATHING
  const USDC_ADDRESS = CONTRACTS.USDC;
  let path = [tokenIn.address, tokenOut.address];
  
  if (tokenIn.address.toLowerCase() !== USDC_ADDRESS.toLowerCase() && 
      tokenOut.address.toLowerCase() !== USDC_ADDRESS.toLowerCase()) {
    path = [tokenIn.address, USDC_ADDRESS, tokenOut.address];
  }

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

export async function addLiquidity(signer, tokenA, tokenB, amountA, amountB) {
  if (!signer) throw new Error('Signer not available');

  const swapRouter = new ethers.Contract(CONTRACTS.SWAP_ROUTER, SWAP_ROUTER_ABI, signer);
  const amountAWei = parseTokenAmount(amountA, tokenA.decimals);
  const amountBWei = parseTokenAmount(amountB, tokenB.decimals);
  
  // First approve both tokens
  const tokenAContract = new ethers.Contract(tokenA.address, ERC20_ABI, signer);
  const tokenBContract = new ethers.Contract(tokenB.address, ERC20_ABI, signer);
  
  const approveATx = await tokenAContract.approve(CONTRACTS.SWAP_ROUTER, amountAWei);
  await approveATx.wait();
  
  const approveBTx = await tokenBContract.approve(CONTRACTS.SWAP_ROUTER, amountBWei);
  await approveBTx.wait();
  
  // Add liquidity
  const tx = await swapRouter.addLiquidity(
    tokenA.address,
    tokenB.address,
    amountAWei,
    amountBWei
  );

  return tx;
}

// Get pool reserves from the AMM contract
export async function getPoolReserves(provider, tokenA, tokenB) {
  if (!provider || !tokenA || !tokenB) return null;
  
  try {
    const swapRouter = new ethers.Contract(CONTRACTS.SWAP_ROUTER, SWAP_ROUTER_ABI, provider);
    const poolId = await swapRouter.getPoolId(tokenA.address, tokenB.address);
    const pool = await swapRouter.pools(poolId);
    
    return {
      token0: pool.token0,
      token1: pool.token1,
      reserve0: pool.reserve0,
      reserve1: pool.reserve1,
    };
  } catch (error) {
    console.error('Error getting pool reserves:', error);
    return null;
  }
}

// Calculate price impact based on liquidity depth and pool reserves
export async function calculatePriceImpact(provider, amountIn, tokenIn, tokenOut) {
  if (!provider || !amountIn || amountIn === '0' || !tokenIn || !tokenOut) {
    return null;
  }

  try {
    const swapRouter = new ethers.Contract(CONTRACTS.SWAP_ROUTER, SWAP_ROUTER_ABI, provider);
    const amountInWei = parseTokenAmount(amountIn, tokenIn.decimals);
    
    // Determine swap path
    const USDC_ADDRESS = CONTRACTS.USDC;
    let path = [tokenIn.address, tokenOut.address];
    
    if (tokenIn.address.toLowerCase() !== USDC_ADDRESS.toLowerCase() && 
        tokenOut.address.toLowerCase() !== USDC_ADDRESS.toLowerCase()) {
      path = [tokenIn.address, USDC_ADDRESS, tokenOut.address];
    }
    
    // Get actual output for the swap - if this succeeds, liquidity EXISTS
    const actualAmounts = await swapRouter.getAmountsOut(amountInWei, path);
    const actualAmountOut = actualAmounts[actualAmounts.length - 1];
    
    // Helper function to get token decimals from address
    const getTokenDecimals = (tokenAddress) => {
      const addr = tokenAddress.toLowerCase();
      if (addr === CONTRACTS.USDC.toLowerCase()) return 6;
      if (addr === CONTRACTS.CAT.toLowerCase()) return TOKENS.CAT.decimals;
      if (addr === CONTRACTS.DARC.toLowerCase()) return TOKENS.DARC.decimals;
      if (addr === CONTRACTS.PANDA.toLowerCase()) return TOKENS.PANDA.decimals;
      // Default to 18 for unknown tokens
      return 18;
    };
    
    // Get spot exchange rate (1 token) for comparison
    const spotAmountIn = parseTokenAmount('1', tokenIn.decimals);
    const spotAmounts = await swapRouter.getAmountsOut(spotAmountIn, path);
    const spotAmountOut = spotAmounts[spotAmounts.length - 1];
    
    // Convert to readable amounts
    const tokenOutDecimals = getTokenDecimals(tokenOut.address);
    const actualOutReadable = Number(actualAmountOut) / (10 ** tokenOutDecimals);
    const spotOutReadable = Number(spotAmountOut) / (10 ** tokenOutDecimals);
    const amountInNum = parseFloat(amountIn);
    
    // Calculate actual exchange rate for this swap
    const actualRate = actualOutReadable / amountInNum;
    const spotRate = spotOutReadable / 1; // 1 token
    
    // Calculate price impact: ((Spot Rate - Actual Rate) / Spot Rate) × 100
    const priceImpact = ((spotRate - actualRate) / spotRate) * 100;
    
    // Calculate price impact for each hop to estimate swap size
    let totalPriceImpact = 0;
    let minLiquidityDepth = Infinity;
    const poolInfo = [];
    
    for (let i = 0; i < path.length - 1; i++) {
      const hopTokenInAddr = path[i];
      const hopTokenOutAddr = path[i + 1];
      const hopAmountIn = actualAmounts[i];
      const hopAmountOut = actualAmounts[i + 1];
      
      // Get token decimals
      const hopTokenInDecimals = getTokenDecimals(hopTokenInAddr);
      const hopTokenOutDecimals = getTokenDecimals(hopTokenOutAddr);
      
      // Try to get pool reserves for swap size calculation, but don't fail if we can't
      let pool = null;
      try {
        pool = await getPoolReserves(provider, 
          { address: hopTokenInAddr }, 
          { address: hopTokenOutAddr }
        );
      } catch (error) {
        // Ignore errors - we'll estimate without reserves
        console.warn(`Could not fetch pool reserves for ${hopTokenInAddr}/${hopTokenOutAddr}:`, error);
      }
      
      let reserveInReadable = 0;
      let reserveOutReadable = 0;
      let swapSizePercent = 0;
      let liquidityDepthReadable = 0;
      
      if (pool && pool.reserve0 > 0n && pool.reserve1 > 0n) {
        // Determine which reserve is input and output
        const resIn = hopTokenInAddr.toLowerCase() === pool.token0.toLowerCase() 
          ? pool.reserve0 
          : pool.reserve1;
        const resOut = hopTokenInAddr.toLowerCase() === pool.token0.toLowerCase() 
          ? pool.reserve1 
          : pool.reserve0;
        
        // Convert reserves to human-readable format
        reserveInReadable = Number(resIn) / (10 ** hopTokenInDecimals);
        reserveOutReadable = Number(resOut) / (10 ** hopTokenOutDecimals);
        
        // Calculate swap size as percentage of pool
        swapSizePercent = (Number(hopAmountIn) / Number(resIn)) * 100;
        
        // Calculate liquidity depth
        liquidityDepthReadable = Math.min(reserveInReadable, reserveOutReadable);
        minLiquidityDepth = Math.min(minLiquidityDepth, liquidityDepthReadable);
        
        // Calculate spot price (before swap)
        const spotPrice = Number(resOut) / Number(resIn);
        
        // Calculate execution price (after swap)
        const newResIn = resIn + hopAmountIn;
        const newResOut = resOut - hopAmountOut;
        const executionPrice = Number(newResOut) / Number(newResIn);
        
        // Calculate price impact for this hop
        const hopPriceImpact = ((spotPrice - executionPrice) / spotPrice) * 100;
        totalPriceImpact += Math.max(0, hopPriceImpact);
        
        poolInfo.push({
          tokenIn: hopTokenInAddr,
          tokenOut: hopTokenOutAddr,
          reserveInReadable,
          reserveOutReadable,
          liquidityDepth: liquidityDepthReadable,
          swapSizePercent,
          hopPriceImpact: Math.max(0, hopPriceImpact)
        });
      } else {
        // If we can't get reserves, estimate swap size conservatively
        // Estimate reserves as at least 100x the swap amount (conservative)
        const estimatedReserveIn = Number(hopAmountIn) * 100 / (10 ** hopTokenInDecimals);
        const estimatedReserveOut = Number(hopAmountOut) * 100 / (10 ** hopTokenOutDecimals);
        
        reserveInReadable = estimatedReserveIn;
        reserveOutReadable = estimatedReserveOut;
        swapSizePercent = 1; // Estimate 1% if we can't calculate accurately
        liquidityDepthReadable = Math.min(estimatedReserveIn, estimatedReserveOut);
        minLiquidityDepth = Math.min(minLiquidityDepth, liquidityDepthReadable);
        
        poolInfo.push({
          tokenIn: hopTokenInAddr,
          tokenOut: hopTokenOutAddr,
          reserveInReadable,
          reserveOutReadable,
          liquidityDepth: liquidityDepthReadable,
          swapSizePercent,
          hopPriceImpact: 0, // Can't calculate without reserves
          estimated: true
        });
      }
    }
    
    // Use the overall price impact calculated from spot vs actual rate
    // This is more accurate than summing hops
    const finalPriceImpact = Math.max(0, priceImpact);
    
    return {
      priceImpact: finalPriceImpact,
      liquidityDepth: minLiquidityDepth === Infinity ? 0 : minLiquidityDepth,
      path: path.length,
      poolInfo,
      swapSizePercent: poolInfo[0]?.swapSizePercent || 0
    };
  } catch (error) {
    // Only return error if getAmountsOut itself failed (true "No Liquidity")
    if (error.message && (error.message.includes('No Liquidity') || error.message.includes('No liquidity'))) {
      return { 
        priceImpact: null, 
        error: 'No liquidity in pool',
        liquidityDepth: 0,
        path: 0
      };
    }
    console.error('Error calculating price impact:', error);
    return null;
  }
}