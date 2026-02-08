import { ethers } from 'ethers';
import { CONTRACTS } from '../constants/contracts';
import { LIQUIDITY_POOL_ABI, ERC20_ABI } from '../constants/abis';
import { parseTokenAmount } from '../utils/formatters';

export async function approveToken(signer, token, amount) {
    if (!signer) throw new Error('Signer not available');
    const amountWei = parseTokenAmount(amount, token.decimals);
    const tokenContract = new ethers.Contract(token.address, ERC20_ABI, signer);
    const tx = await tokenContract.approve(CONTRACTS.SWAP_ROUTER, amountWei);
    return tx;
}

export async function addLiquidity(signer, tokenA, tokenB, amountA, amountB) {
    if (!signer) throw new Error('Signer not available');

    const poolContract = new ethers.Contract(CONTRACTS.SWAP_ROUTER, LIQUIDITY_POOL_ABI, signer);
    const amountAWei = parseTokenAmount(amountA, tokenA.decimals);
    const amountBWei = parseTokenAmount(amountB, tokenB.decimals);

    // Approvals are now handled by the UI TransactionModal sequence

    // Add liquidity
    const tx = await poolContract.addLiquidity(
        tokenA.address,
        tokenB.address,
        amountAWei,
        amountBWei
    );

    return tx;
}

export async function removeLiquidity(signer, tokenA, tokenB, shares) {
    if (!signer) throw new Error('Signer not available');

    const poolContract = new ethers.Contract(CONTRACTS.SWAP_ROUTER, LIQUIDITY_POOL_ABI, signer);

    // In this AMM, LP tokens are 18 decimals by default for calculation
    // If 'shares' matches the large integer seen (e.g. 2000 * 10^18), we pass it directly
    // Ideally the UI passes a BigInt or string that is already parsed.
    // If the UI passes a human-readable string, we parse it as 18 decimals (standard for this contract's share)
    // However, shares logic: shares = amount0 + amount1. 
    // The UI uses 'amountLP' which is likely user-friendly string. 
    // But since shares ~ Amount(Dark), it's 18 decimals.

    // We assume 'shares' passed in is already BigInt or Wei String if from UI?
    // Let's assume the UI passes the raw user input string "2000.5" or similar.
    // We need to parse it. Since typical LP share here is dominated by 18-dec token, we treat it as 18 decimals.

    const sharesWei = typeof shares === 'string' ? parseTokenAmount(shares, 18) : shares;

    // Remove liquidity
    const tx = await poolContract.removeLiquidity(
        tokenA.address,
        tokenB.address,
        sharesWei
    );

    return tx;
}

// Get pool reserves from the AMM contract
export async function getPoolReserves(provider, tokenA, tokenB) {
    if (!provider || !tokenA || !tokenB) return null;

    try {
        const poolContract = new ethers.Contract(CONTRACTS.SWAP_ROUTER, LIQUIDITY_POOL_ABI, provider);
        const poolId = await poolContract.getPoolId(tokenA.address, tokenB.address);
        const pool = await poolContract.pools(poolId);

        return {
            token0: pool.token0,
            token1: pool.token1,
            reserve0: pool.reserve0,
            reserve1: pool.reserve1,
        };
    } catch (error) {
        console.warn('[RPC] Pool reserves fetch failed:', error.code || error.message);
        return null;
    }
}

export async function getPoolTotalSupply(provider, tokenA, tokenB) {
    if (!provider || !tokenA || !tokenB) return 0n;

    try {
        const poolContract = new ethers.Contract(CONTRACTS.SWAP_ROUTER, LIQUIDITY_POOL_ABI, provider);
        const poolId = await poolContract.getPoolId(tokenA.address, tokenB.address);
        const totalSupply = await poolContract.totalLiquidity(poolId);
        return totalSupply;
    } catch (error) {
        console.warn('[RPC] Pool total supply fetch failed:', error.code || error.message);
        return 0n;
    }
}
