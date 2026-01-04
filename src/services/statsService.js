import { ethers } from 'ethers';
import { CONTRACTS } from '../constants/contracts';
import { LENDING_POOL_ABI, SWAP_ROUTER_ABI, FAUCET_ABI } from '../constants/abis';
import { LENDABLE_TOKENS, TOKENS } from '../constants/tokens';

// ========== CACHING & RETRY CONFIGURATION ==========

// Cache for storing last known good values
const statsCache = {
  tvl: null,
  volume: null,
  transactions: null,
  historicalTVL: null,
  historicalVolume: null,
  historicalTransactions: null,
  lastUpdated: null,
};

// Retry configuration
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second

// Block range configuration
// Maximum blocks to query for "All Time" (prevents timeout on large ranges)
const MAX_BLOCKS_QUERY = 500000; // ~70 days at 12s blocks
const BLOCKS_PER_DAY = 7200; // Approximate (12s block time)

// AMM Trading pairs (token paired with USDC)
const AMM_PAIRS = [
  { token: TOKENS.CAT, pair: TOKENS.USDC },
  { token: TOKENS.DARC, pair: TOKENS.USDC },
  { token: TOKENS.PANDA, pair: TOKENS.USDC },
];

/**
 * Utility: Sleep for specified milliseconds
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Utility: Retry a function up to N times with delay
 */
async function withRetry(fn, retries = RETRY_ATTEMPTS, delay = RETRY_DELAY) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${attempt}/${retries} failed:`, error.message);
      if (attempt < retries) {
        await sleep(delay * attempt); // Exponential backoff
      }
    }
  }
  throw lastError;
}

/**
 * Utility: Check if provider is ready
 */
async function isProviderReady(provider) {
  if (!provider) return false;
  try {
    await provider.getBlockNumber();
    return true;
  } catch {
    return false;
  }
}

/**
 * Utility: Get a reasonable starting block for event queries
 * Avoids querying from block 0 which can fail on many networks
 */
async function getFromBlock(provider, periodDays = null) {
  try {
    const currentBlock = await provider.getBlockNumber();
    
    if (periodDays) {
      // Calculate blocks for the requested period
      const blocksBack = periodDays * BLOCKS_PER_DAY;
      return Math.max(0, currentBlock - blocksBack);
    } else {
      // "All Time" - use max blocks query to avoid timeout
      // This covers approximately 70 days of history
      return Math.max(0, currentBlock - MAX_BLOCKS_QUERY);
    }
  } catch (error) {
    console.error('Error getting block number:', error);
    return 0;
  }
}

/**
 * Get Total Value Locked (TVL) from lending pool AND AMM pools
 * TVL = Lending Pool Deposits + AMM Pool Liquidity
 */
export async function getTotalTVL(provider) {
  if (!provider) {
    return statsCache.tvl || 0;
  }

  // Check provider readiness
  const ready = await isProviderReady(provider);
  if (!ready) {
    console.warn('Provider not ready, returning cached TVL');
    return statsCache.tvl || 0;
  }

  try {
    const lendingPool = new ethers.Contract(CONTRACTS.LENDING_POOL, LENDING_POOL_ABI, provider);
    const swapRouter = new ethers.Contract(CONTRACTS.SWAP_ROUTER, SWAP_ROUTER_ABI, provider);
    
    let lendingTVL = 0n;
    let ammTVL = 0n;

    // ========== LENDING POOL TVL ==========
    console.log('Fetching Lending Pool TVL...');
    for (const token of LENDABLE_TOKENS) {
      try {
        const reserveData = await withRetry(() => lendingPool.getReserveData(token.address));
        const totalSupplied = reserveData[1] || 0n;
        const priceUSD = reserveData[4] || 0n;
        
        const tokenDecimals = token.decimals;
        const scalingFactor = 10n ** BigInt(18 - tokenDecimals);
        const normalizedSupplied = totalSupplied * scalingFactor;
        const valueUSD = (normalizedSupplied * priceUSD) / 10n ** 18n;
        
        lendingTVL += valueUSD;
        console.log(`  ${token.symbol}: $${Number(valueUSD) / 1e18}`);
      } catch (error) {
        console.error(`Error fetching reserve data for ${token.symbol}:`, error.message);
      }
    }

    // ========== AMM POOL TVL ==========
    console.log('Fetching AMM Pool TVL...');
    for (const { token, pair } of AMM_PAIRS) {
      try {
        // Get pool ID with retry
        const poolId = await withRetry(() => swapRouter.getPoolId(token.address, pair.address));
        
        // Get pool reserves with retry
        const poolData = await withRetry(() => swapRouter.pools(poolId));
        
        const reserve0 = poolData[2] || 0n;
        const reserve1 = poolData[3] || 0n;
        
        // Skip if pool is empty
        if (reserve0 === 0n && reserve1 === 0n) {
          console.log(`  ${token.symbol}/${pair.symbol}: Empty pool, skipping`);
          continue;
        }
        
        // Determine which reserve is which token
        const token0Address = poolData[0];
        let tokenReserve, usdcReserve;
        
        if (token0Address && token0Address.toLowerCase() === token.address.toLowerCase()) {
          tokenReserve = reserve0;
          usdcReserve = reserve1;
        } else {
          tokenReserve = reserve1;
          usdcReserve = reserve0;
        }
        
        // Get token price from lending pool
        const reserveData = await withRetry(() => lendingPool.getReserveData(token.address));
        const tokenPriceUSD = reserveData[4] || 0n;
        
        // Calculate token value in USD
        const tokenScalingFactor = 10n ** BigInt(18 - token.decimals);
        const normalizedTokenReserve = tokenReserve * tokenScalingFactor;
        const tokenValueUSD = (normalizedTokenReserve * tokenPriceUSD) / 10n ** 18n;
        
        // USDC value (price = $1)
        const usdcScalingFactor = 10n ** BigInt(18 - pair.decimals);
        const normalizedUsdcReserve = usdcReserve * usdcScalingFactor;
        const usdcPriceUSD = 10n ** 18n;
        const usdcValueUSD = (normalizedUsdcReserve * usdcPriceUSD) / 10n ** 18n;
        
        const poolTVL = tokenValueUSD + usdcValueUSD;
        ammTVL += poolTVL;
        console.log(`  ${token.symbol}/${pair.symbol}: $${Number(poolTVL) / 1e18}`);
      } catch (error) {
        console.error(`Error fetching AMM pool data for ${token.symbol}/${pair.symbol}:`, error.message);
      }
    }

    const totalTVL = Number(lendingTVL + ammTVL) / 1e18;
    console.log(`Total TVL: $${totalTVL} (Lending: $${Number(lendingTVL) / 1e18}, AMM: $${Number(ammTVL) / 1e18})`);

    // Validate: Don't accept 0 if we had a previous non-zero value
    if (totalTVL === 0 && statsCache.tvl && statsCache.tvl > 0) {
      console.warn('TVL returned 0 but cache has value, returning cached value');
      return statsCache.tvl;
    }

    // Update cache
    statsCache.tvl = totalTVL;
    return totalTVL;
  } catch (error) {
    console.error('Error fetching TVL:', error);
    return statsCache.tvl || 0;
  }
}

/**
 * Get total swap volume from Swap Router events
 */
export async function getTotalVolume(provider, periodDays = null) {
  if (!provider) {
    return statsCache.volume || 0;
  }

  const ready = await isProviderReady(provider);
  if (!ready) {
    return statsCache.volume || 0;
  }

  try {
    const swapRouter = new ethers.Contract(CONTRACTS.SWAP_ROUTER, SWAP_ROUTER_ABI, provider);
    const lendingPool = new ethers.Contract(CONTRACTS.LENDING_POOL, LENDING_POOL_ABI, provider);
    
    // Use helper to get reasonable starting block
    const fromBlock = await getFromBlock(provider, periodDays);
    const currentBlock = await provider.getBlockNumber();
    
    console.log(`Fetching Volume... (blocks ${fromBlock} to ${currentBlock})`);

    const swapFilter = swapRouter.filters.Swap();
    const events = await withRetry(() => swapRouter.queryFilter(swapFilter, fromBlock));
    
    console.log(`  Found ${events.length} swap events`);
    
    let totalVolume = 0n;

    for (const event of events) {
      const { tokenIn, amountIn } = event.args;
      
      try {
        const reserveData = await lendingPool.getReserveData(tokenIn);
        const priceUSD = reserveData[4] || 0n;
        
        const token = LENDABLE_TOKENS.find(t => t.address.toLowerCase() === tokenIn.toLowerCase());
        const decimals = token?.decimals || 18;
        
        const scalingFactor = 10n ** BigInt(18 - decimals);
        const normalizedAmount = amountIn * scalingFactor;
        const valueUSD = (normalizedAmount * priceUSD) / 10n ** 18n;
        
        totalVolume += valueUSD;
        console.log(`  ${token?.symbol || 'Unknown'} swap: $${Number(valueUSD) / 1e18}`);
      } catch (error) {
        console.warn(`  Error processing swap event:`, error.message);
      }
    }

    const volume = Number(totalVolume) / 1e18;
    console.log(`  Total Volume: $${volume}`);
    
    // Update cache
    statsCache.volume = volume;
    return volume;
  } catch (error) {
    console.error('Error fetching volume:', error);
    return statsCache.volume || 0;
  }
}

/**
 * Get total transaction count from all contracts
 */
export async function getTotalTransactions(provider, periodDays = null) {
  if (!provider) {
    return statsCache.transactions || 0;
  }

  const ready = await isProviderReady(provider);
  if (!ready) {
    return statsCache.transactions || 0;
  }

  try {
    // Use helper to get reasonable starting block
    const fromBlock = await getFromBlock(provider, periodDays);
    const currentBlock = await provider.getBlockNumber();
    
    console.log(`Fetching Transactions... (blocks ${fromBlock} to ${currentBlock})`);

    let swapCount = 0;
    let supplyCount = 0;
    let withdrawCount = 0;
    let borrowCount = 0;
    let repayCount = 0;
    let faucetCount = 0;

    // Count Swap events
    try {
      const swapRouter = new ethers.Contract(CONTRACTS.SWAP_ROUTER, SWAP_ROUTER_ABI, provider);
      const swapFilter = swapRouter.filters.Swap();
      const swapEvents = await withRetry(() => swapRouter.queryFilter(swapFilter, fromBlock));
      swapCount = swapEvents.length;
    } catch (error) {
      console.error('  Error counting swap events:', error.message);
    }

    // Count Lending Pool events
    try {
      const lendingPool = new ethers.Contract(CONTRACTS.LENDING_POOL, LENDING_POOL_ABI, provider);
      
      const [supplyEvents, withdrawEvents, borrowEvents, repayEvents] = await Promise.all([
        withRetry(() => lendingPool.queryFilter(lendingPool.filters.CollateralSupplied(), fromBlock)),
        withRetry(() => lendingPool.queryFilter(lendingPool.filters.CollateralWithdrawn(), fromBlock)),
        withRetry(() => lendingPool.queryFilter(lendingPool.filters.TokenBorrowed(), fromBlock)),
        withRetry(() => lendingPool.queryFilter(lendingPool.filters.TokenRepaid(), fromBlock)),
      ]);
      
      supplyCount = supplyEvents.length;
      withdrawCount = withdrawEvents.length;
      borrowCount = borrowEvents.length;
      repayCount = repayEvents.length;
    } catch (error) {
      console.error('  Error counting lending pool events:', error.message);
    }

    // Count Faucet events
    try {
      const faucet = new ethers.Contract(CONTRACTS.FAUCET, FAUCET_ABI, provider);
      const faucetFilter = faucet.filters.TokensClaimed();
      const faucetEvents = await withRetry(() => faucet.queryFilter(faucetFilter, fromBlock));
      faucetCount = faucetEvents.length;
    } catch (error) {
      console.error('  Error counting faucet events:', error.message);
    }

    const totalCount = swapCount + supplyCount + withdrawCount + borrowCount + repayCount + faucetCount;
    
    console.log(`  Swap events: ${swapCount}`);
    console.log(`  Supply events: ${supplyCount}`);
    console.log(`  Withdraw events: ${withdrawCount}`);
    console.log(`  Borrow events: ${borrowCount}`);
    console.log(`  Repay events: ${repayCount}`);
    console.log(`  Faucet events: ${faucetCount}`);
    console.log(`  Total Transactions: ${totalCount}`);

    // Update cache
    statsCache.transactions = totalCount;
    return totalCount;
  } catch (error) {
    console.error('Error fetching transaction count:', error);
    return statsCache.transactions || 0;
  }
}

/**
 * Get historical TVL data points by tracking supply/withdraw events
 */
export async function getHistoricalTVL(provider, periodDays = null) {
  if (!provider) return statsCache.historicalTVL || [];

  try {
    const currentTVL = await getTotalTVL(provider);
    const lendingPool = new ethers.Contract(CONTRACTS.LENDING_POOL, LENDING_POOL_ABI, provider);
    
    // Use helper to get reasonable starting block
    const fromBlock = await getFromBlock(provider, periodDays);
    const currentBlock = await provider.getBlockNumber();

    const [supplyEvents, withdrawEvents] = await Promise.all([
      withRetry(() => lendingPool.queryFilter(lendingPool.filters.CollateralSupplied(), fromBlock)),
      withRetry(() => lendingPool.queryFilter(lendingPool.filters.CollateralWithdrawn(), fromBlock)),
    ]);

    // Get block timestamps for events (limited batch)
    const allEvents = [...supplyEvents.map(e => ({ ...e, type: 'supply' })), 
                       ...withdrawEvents.map(e => ({ ...e, type: 'withdraw' }))];
    
    // Sample blocks for timestamps (avoid too many RPC calls)
    const uniqueBlocks = [...new Set(allEvents.map(e => e.blockNumber))].slice(0, 50);
    const blockTimestamps = {};
    
    await Promise.all(
      uniqueBlocks.map(async (blockNum) => {
        try {
          const block = await provider.getBlock(blockNum);
          blockTimestamps[blockNum] = block?.timestamp || Math.floor(Date.now() / 1000);
        } catch {
          blockTimestamps[blockNum] = Math.floor(Date.now() / 1000);
        }
      })
    );

    // Assign timestamps
    const eventsWithTimestamps = allEvents.map(event => ({
      ...event,
      timestamp: blockTimestamps[event.blockNumber] || Math.floor(Date.now() / 1000),
    })).sort((a, b) => a.timestamp - b.timestamp);

    // Build time buckets
    const now = Math.floor(Date.now() / 1000);
    const periodSeconds = periodDays ? periodDays * 86400 : 
                         eventsWithTimestamps.length > 0 ? now - eventsWithTimestamps[0].timestamp : 86400;
    const dataPoints = Math.min(periodDays || 30, 30);
    const bucketSize = Math.max(3600, Math.floor(periodSeconds / dataPoints));

    const buckets = {};
    const startTime = now - periodSeconds;
    
    for (const event of eventsWithTimestamps) {
      const bucketIndex = Math.floor((event.timestamp - startTime) / bucketSize);
      const clampedIndex = Math.max(0, Math.min(dataPoints - 1, bucketIndex));
      
      if (!buckets[clampedIndex]) {
        buckets[clampedIndex] = { supply: 0, withdraw: 0 };
      }

      try {
        const { token, amount } = event.args;
        const reserveData = await lendingPool.getReserveData(token);
        const priceUSD = reserveData[4] || 0n;
        
        const tokenInfo = LENDABLE_TOKENS.find(t => t.address.toLowerCase() === token.toLowerCase());
        const decimals = tokenInfo?.decimals || 18;
        
        const scalingFactor = 10n ** BigInt(18 - decimals);
        const normalizedAmount = amount * scalingFactor;
        const valueUSD = Number((normalizedAmount * priceUSD) / 10n ** 18n) / 1e18;

        if (event.type === 'supply') {
          buckets[clampedIndex].supply += valueUSD;
        } else {
          buckets[clampedIndex].withdraw += valueUSD;
        }
      } catch {
        // Skip if calculation fails
      }
    }

    // Build cumulative TVL data
    const data = [];
    let cumulativeChange = 0;
    
    for (let i = dataPoints - 1; i >= 0; i--) {
      const bucket = buckets[i];
      if (bucket) {
        cumulativeChange += (bucket.supply - bucket.withdraw);
      }
      const historicalTVL = Math.max(0, currentTVL - cumulativeChange);
      data.unshift(historicalTVL);
    }

    if (data.length === 0) {
      return Array(dataPoints).fill(currentTVL);
    }

    // Update cache
    statsCache.historicalTVL = data;
    return data;
  } catch (error) {
    console.error('Error fetching historical TVL:', error);
    return statsCache.historicalTVL || [];
  }
}

/**
 * Get historical volume data points
 */
export async function getHistoricalVolume(provider, periodDays = null) {
  if (!provider) return statsCache.historicalVolume || [];

  try {
    const swapRouter = new ethers.Contract(CONTRACTS.SWAP_ROUTER, SWAP_ROUTER_ABI, provider);
    const lendingPool = new ethers.Contract(CONTRACTS.LENDING_POOL, LENDING_POOL_ABI, provider);
    
    // Use helper to get reasonable starting block
    const fromBlock = await getFromBlock(provider, periodDays);
    const currentBlock = await provider.getBlockNumber();

    const events = await withRetry(() => swapRouter.queryFilter(swapRouter.filters.Swap(), fromBlock));
    
    // Sample blocks for timestamps
    const uniqueBlocks = [...new Set(events.map(e => e.blockNumber))].slice(0, 50);
    const blockTimestamps = {};
    
    await Promise.all(
      uniqueBlocks.map(async (blockNum) => {
        try {
          const block = await provider.getBlock(blockNum);
          blockTimestamps[blockNum] = block?.timestamp || Math.floor(Date.now() / 1000);
        } catch {
          blockTimestamps[blockNum] = Math.floor(Date.now() / 1000);
        }
      })
    );

    const eventsWithTimestamps = events.map(event => ({
      ...event,
      timestamp: blockTimestamps[event.blockNumber] || Math.floor(Date.now() / 1000),
    }));

    // Build time buckets
    const now = Math.floor(Date.now() / 1000);
    const periodSeconds = periodDays ? periodDays * 86400 : 
                         eventsWithTimestamps[0]?.timestamp ? now - eventsWithTimestamps[0].timestamp : 86400;
    const dataPoints = Math.min(periodDays || 30, 30);
    const bucketSize = Math.max(3600, Math.floor(periodSeconds / dataPoints));

    const buckets = {};
    
    for (const event of eventsWithTimestamps) {
      const bucketIndex = Math.floor((event.timestamp - (now - periodSeconds)) / bucketSize);
      const clampedIndex = Math.max(0, Math.min(dataPoints - 1, bucketIndex));
      if (!buckets[clampedIndex]) {
        buckets[clampedIndex] = [];
      }
      buckets[clampedIndex].push(event);
    }

    // Calculate volume for each bucket
    const data = [];
    
    for (let i = 0; i < dataPoints; i++) {
      const bucketEvents = buckets[i] || [];
      let bucketVolume = 0n;

      for (const event of bucketEvents) {
        try {
          const { tokenIn, amountIn } = event.args;
          const reserveData = await lendingPool.getReserveData(tokenIn);
          const priceUSD = reserveData[4] || 0n;
          
          const token = LENDABLE_TOKENS.find(t => t.address.toLowerCase() === tokenIn.toLowerCase());
          const decimals = token?.decimals || 18;
          
          const scalingFactor = 10n ** BigInt(18 - decimals);
          const normalizedAmount = amountIn * scalingFactor;
          const valueUSD = (normalizedAmount * priceUSD) / 10n ** 18n;
          
          bucketVolume += valueUSD;
        } catch {
          // Skip if calculation fails
        }
      }

      data.push(Number(bucketVolume) / 1e18);
    }

    // Update cache
    statsCache.historicalVolume = data;
    return data;
  } catch (error) {
    console.error('Error fetching historical volume:', error);
    return statsCache.historicalVolume || [];
  }
}

/**
 * Get historical transaction count data points
 */
export async function getHistoricalTransactions(provider, periodDays = null) {
  if (!provider) return statsCache.historicalTransactions || [];

  try {
    // Use helper to get reasonable starting block
    const fromBlock = await getFromBlock(provider, periodDays);
    const currentBlock = await provider.getBlockNumber();

    // Fetch all events in parallel
    const [swapEvents, supplyEvents, withdrawEvents, borrowEvents, repayEvents, faucetEvents] = await Promise.all([
      (async () => {
        try {
          const swapRouter = new ethers.Contract(CONTRACTS.SWAP_ROUTER, SWAP_ROUTER_ABI, provider);
          return await withRetry(() => swapRouter.queryFilter(swapRouter.filters.Swap(), fromBlock));
        } catch { return []; }
      })(),
      (async () => {
        try {
          const lendingPool = new ethers.Contract(CONTRACTS.LENDING_POOL, LENDING_POOL_ABI, provider);
          return await withRetry(() => lendingPool.queryFilter(lendingPool.filters.CollateralSupplied(), fromBlock));
        } catch { return []; }
      })(),
      (async () => {
        try {
          const lendingPool = new ethers.Contract(CONTRACTS.LENDING_POOL, LENDING_POOL_ABI, provider);
          return await withRetry(() => lendingPool.queryFilter(lendingPool.filters.CollateralWithdrawn(), fromBlock));
        } catch { return []; }
      })(),
      (async () => {
        try {
          const lendingPool = new ethers.Contract(CONTRACTS.LENDING_POOL, LENDING_POOL_ABI, provider);
          return await withRetry(() => lendingPool.queryFilter(lendingPool.filters.TokenBorrowed(), fromBlock));
        } catch { return []; }
      })(),
      (async () => {
        try {
          const lendingPool = new ethers.Contract(CONTRACTS.LENDING_POOL, LENDING_POOL_ABI, provider);
          return await withRetry(() => lendingPool.queryFilter(lendingPool.filters.TokenRepaid(), fromBlock));
        } catch { return []; }
      })(),
      (async () => {
        try {
          const faucet = new ethers.Contract(CONTRACTS.FAUCET, FAUCET_ABI, provider);
          return await withRetry(() => faucet.queryFilter(faucet.filters.TokensClaimed(), fromBlock));
        } catch { return []; }
      })(),
    ]);

    // Combine all events
    const allEvents = [
      ...swapEvents,
      ...supplyEvents,
      ...withdrawEvents,
      ...borrowEvents,
      ...repayEvents,
      ...faucetEvents,
    ];

    // Sample blocks for timestamps
    const uniqueBlocks = [...new Set(allEvents.map(e => e.blockNumber))].slice(0, 100);
    const blockTimestamps = {};
    
    await Promise.all(
      uniqueBlocks.map(async (blockNum) => {
        try {
          const block = await provider.getBlock(blockNum);
          blockTimestamps[blockNum] = block?.timestamp || Math.floor(Date.now() / 1000);
        } catch {
          blockTimestamps[blockNum] = Math.floor(Date.now() / 1000);
        }
      })
    );

    const eventsWithTimestamps = allEvents.map(event => ({
      ...event,
      timestamp: blockTimestamps[event.blockNumber] || Math.floor(Date.now() / 1000),
    })).sort((a, b) => a.timestamp - b.timestamp);

    // Build time buckets
    const now = Math.floor(Date.now() / 1000);
    const periodSeconds = periodDays ? periodDays * 86400 : 
                         eventsWithTimestamps.length > 0 ? now - eventsWithTimestamps[0].timestamp : 86400;
    const dataPoints = Math.min(periodDays || 30, 30);
    const bucketSize = Math.max(3600, Math.floor(periodSeconds / dataPoints));

    const buckets = {};
    const startTime = now - periodSeconds;
    
    for (const event of eventsWithTimestamps) {
      const bucketIndex = Math.floor((event.timestamp - startTime) / bucketSize);
      const clampedIndex = Math.max(0, Math.min(dataPoints - 1, bucketIndex));
      buckets[clampedIndex] = (buckets[clampedIndex] || 0) + 1;
    }

    const data = [];
    for (let i = 0; i < dataPoints; i++) {
      data.push(buckets[i] || 0);
    }

    // Update cache
    statsCache.historicalTransactions = data;
    return data;
  } catch (error) {
    console.error('Error fetching historical transactions:', error);
    return statsCache.historicalTransactions || [];
  }
}

/**
 * Get all protocol statistics with caching and retry
 */
export async function getProtocolStats(provider, periodDays = null) {
  // Return cached data if no provider
  if (!provider) {
    return {
      tvl: statsCache.tvl || 0,
      volume: statsCache.volume || 0,
      transactions: statsCache.transactions || 0,
      historicalTVL: statsCache.historicalTVL || [],
      historicalVolume: statsCache.historicalVolume || [],
      historicalTransactions: statsCache.historicalTransactions || [],
    };
  }

  // Check provider readiness
  const ready = await isProviderReady(provider);
  if (!ready) {
    console.warn('Provider not ready, returning cached stats');
    return {
      tvl: statsCache.tvl || 0,
      volume: statsCache.volume || 0,
      transactions: statsCache.transactions || 0,
      historicalTVL: statsCache.historicalTVL || [],
      historicalVolume: statsCache.historicalVolume || [],
      historicalTransactions: statsCache.historicalTransactions || [],
    };
  }

  try {
    // Fetch all stats in parallel
    const [tvl, volume, transactions, historicalTVL, historicalVolume, historicalTransactions] = await Promise.all([
      getTotalTVL(provider),
      getTotalVolume(provider, periodDays),
      getTotalTransactions(provider, periodDays),
      getHistoricalTVL(provider, periodDays),
      getHistoricalVolume(provider, periodDays),
      getHistoricalTransactions(provider, periodDays),
    ]);

    // Update cache timestamp
    statsCache.lastUpdated = Date.now();

    return {
      tvl,
      volume,
      transactions,
      historicalTVL,
      historicalVolume,
      historicalTransactions,
    };
  } catch (error) {
    console.error('Error fetching protocol stats:', error);
    // Return cached data on error
    return {
      tvl: statsCache.tvl || 0,
      volume: statsCache.volume || 0,
      transactions: statsCache.transactions || 0,
      historicalTVL: statsCache.historicalTVL || [],
      historicalVolume: statsCache.historicalVolume || [],
      historicalTransactions: statsCache.historicalTransactions || [],
    };
  }
}

/**
 * Get cache status (for debugging)
 */
export function getCacheStatus() {
  return {
    ...statsCache,
    age: statsCache.lastUpdated ? Date.now() - statsCache.lastUpdated : null,
  };
}
