import { ethers } from 'ethers';
import { CONTRACTS } from '../constants/contracts';
import { LENDING_POOL_ABI, SWAP_ROUTER_ABI, FAUCET_ABI } from '../constants/abis';
import { LENDABLE_TOKENS } from '../constants/tokens';
import { formatUnits } from 'ethers';

/**
 * Get Total Value Locked (TVL) from lending pool
 * TVL = Sum of all totalSupplied across all reserves
 */
export async function getTotalTVL(provider) {
  if (!provider) return 0;

  try {
    const lendingPool = new ethers.Contract(CONTRACTS.LENDING_POOL, LENDING_POOL_ABI, provider);
    let totalTVL = 0n;

    // Get totalSupplied for each supported token
    for (const token of LENDABLE_TOKENS) {
      try {
        const reserveData = await lendingPool.getReserveData(token.address);
        // reserveData structure: [availableLiquidity, totalSupplied, totalBorrowed, ltv, priceUSD]
        const totalSupplied = reserveData[1] || 0n;
        const priceUSD = reserveData[4] || 0n;
        
        // Calculate value: totalSupplied * priceUSD / 1e18 (price is in 18 decimals)
        // Adjust for token decimals
        const tokenDecimals = token.decimals;
        const scalingFactor = 10n ** BigInt(18 - tokenDecimals);
        const normalizedSupplied = totalSupplied * scalingFactor;
        const valueUSD = (normalizedSupplied * priceUSD) / 10n ** 18n;
        
        totalTVL += valueUSD;
      } catch (error) {
        console.error(`Error fetching reserve data for ${token.symbol}:`, error);
      }
    }

    return Number(totalTVL) / 1e18;
  } catch (error) {
    console.error('Error fetching TVL:', error);
    return 0;
  }
}

/**
 * Get total swap volume from Swap Router events
 */
export async function getTotalVolume(provider, periodDays = null) {
  if (!provider) return 0;

  try {
    const swapRouter = new ethers.Contract(CONTRACTS.SWAP_ROUTER, SWAP_ROUTER_ABI, provider);
    const swapFilter = swapRouter.filters.Swap();
    
    let fromBlock = 0;
    if (periodDays) {
      const currentBlock = await provider.getBlockNumber();
      const blocksPerDay = 7200; // Approximate blocks per day (assuming ~12s block time)
      fromBlock = Math.max(0, currentBlock - (periodDays * blocksPerDay));
    }

    const events = await swapRouter.queryFilter(swapFilter, fromBlock);
    
    let totalVolume = 0n;

    for (const event of events) {
      const { tokenIn, amountIn } = event.args;
      
      // Get token price
      try {
        const lendingPool = new ethers.Contract(CONTRACTS.LENDING_POOL, LENDING_POOL_ABI, provider);
        const reserveData = await lendingPool.getReserveData(tokenIn);
        const priceUSD = reserveData[4] || 0n;
        
        // Find token decimals
        const token = LENDABLE_TOKENS.find(t => t.address.toLowerCase() === tokenIn.toLowerCase());
        const decimals = token?.decimals || 18;
        
        // Calculate volume in USD
        const scalingFactor = 10n ** BigInt(18 - decimals);
        const normalizedAmount = amountIn * scalingFactor;
        const valueUSD = (normalizedAmount * priceUSD) / 10n ** 18n;
        
        totalVolume += valueUSD;
      } catch (error) {
        // Skip if price fetch fails
        console.warn(`Could not get price for token ${tokenIn}:`, error);
      }
    }

    return Number(totalVolume) / 1e18;
  } catch (error) {
    console.error('Error fetching volume:', error);
    return 0;
  }
}

/**
 * Get total transaction count from all contracts
 */
export async function getTotalTransactions(provider, periodDays = null) {
  if (!provider) return 0;

  try {
    let fromBlock = 0;
    if (periodDays) {
      const currentBlock = await provider.getBlockNumber();
      const blocksPerDay = 7200;
      fromBlock = Math.max(0, currentBlock - (periodDays * blocksPerDay));
    }

    let totalCount = 0;

    // Count Swap events
    try {
      const swapRouter = new ethers.Contract(CONTRACTS.SWAP_ROUTER, SWAP_ROUTER_ABI, provider);
      const swapFilter = swapRouter.filters.Swap();
      const swapEvents = await swapRouter.queryFilter(swapFilter, fromBlock);
      totalCount += swapEvents.length;
    } catch (error) {
      console.error('Error counting swap events:', error);
    }

    // Count Lending Pool events
    try {
      const lendingPool = new ethers.Contract(CONTRACTS.LENDING_POOL, LENDING_POOL_ABI, provider);
      
      const supplyFilter = lendingPool.filters.CollateralSupplied();
      const withdrawFilter = lendingPool.filters.CollateralWithdrawn();
      const borrowFilter = lendingPool.filters.TokenBorrowed();
      const repayFilter = lendingPool.filters.TokenRepaid();
      
      const [supplyEvents, withdrawEvents, borrowEvents, repayEvents] = await Promise.all([
        lendingPool.queryFilter(supplyFilter, fromBlock),
        lendingPool.queryFilter(withdrawFilter, fromBlock),
        lendingPool.queryFilter(borrowFilter, fromBlock),
        lendingPool.queryFilter(repayFilter, fromBlock),
      ]);
      
      totalCount += supplyEvents.length + withdrawEvents.length + borrowEvents.length + repayEvents.length;
    } catch (error) {
      console.error('Error counting lending pool events:', error);
    }

    // Count Faucet events
    try {
      const faucet = new ethers.Contract(CONTRACTS.FAUCET, FAUCET_ABI, provider);
      const faucetFilter = faucet.filters.TokensClaimed();
      const faucetEvents = await faucet.queryFilter(faucetFilter, fromBlock);
      totalCount += faucetEvents.length;
    } catch (error) {
      console.error('Error counting faucet events:', error);
    }

    return totalCount;
  } catch (error) {
    console.error('Error fetching transaction count:', error);
    return 0;
  }
}

/**
 * Get historical TVL data points by tracking supply/withdraw events
 */
export async function getHistoricalTVL(provider, periodDays = null) {
  if (!provider) return [];

  try {
    const currentTVL = await getTotalTVL(provider);
    const lendingPool = new ethers.Contract(CONTRACTS.LENDING_POOL, LENDING_POOL_ABI, provider);
    
    let fromBlock = 0;
    const currentBlock = await provider.getBlockNumber();
    
    if (periodDays) {
      const blocksPerDay = 7200;
      fromBlock = Math.max(0, currentBlock - (periodDays * blocksPerDay));
    }

    // Get supply and withdraw events to track TVL changes over time
    const supplyFilter = lendingPool.filters.CollateralSupplied();
    const withdrawFilter = lendingPool.filters.CollateralWithdrawn();
    
    const [supplyEvents, withdrawEvents] = await Promise.all([
      lendingPool.queryFilter(supplyFilter, fromBlock),
      lendingPool.queryFilter(withdrawFilter, fromBlock),
    ]);

    // Get block timestamps for events
    const supplyEventsWithTimestamps = await Promise.all(
      supplyEvents.map(async (e) => {
        try {
          const block = await provider.getBlock(e.blockNumber);
          return { ...e, type: 'supply', timestamp: block.timestamp };
        } catch {
          return { ...e, type: 'supply', timestamp: Date.now() / 1000 };
        }
      })
    );

    const withdrawEventsWithTimestamps = await Promise.all(
      withdrawEvents.map(async (e) => {
        try {
          const block = await provider.getBlock(e.blockNumber);
          return { ...e, type: 'withdraw', timestamp: block.timestamp };
        } catch {
          return { ...e, type: 'withdraw', timestamp: Date.now() / 1000 };
        }
      })
    );

    // Sort by timestamp
    const allEvents = [...supplyEventsWithTimestamps, ...withdrawEventsWithTimestamps].sort((a, b) => a.timestamp - b.timestamp);

    // Determine time buckets
    const now = Math.floor(Date.now() / 1000);
    const periodSeconds = periodDays ? periodDays * 86400 : 
                         allEvents.length > 0 ? now - allEvents[0].timestamp : 86400;
    const dataPoints = periodDays ? Math.min(periodDays, 30) : 30;
    const bucketSize = Math.max(3600, Math.floor(periodSeconds / dataPoints));

    // Group events by time buckets and calculate cumulative changes
    const buckets = {};
    const startTime = now - periodSeconds;
    
    for (const event of allEvents) {
      const bucketIndex = Math.floor((event.timestamp - startTime) / bucketSize);
      const clampedIndex = Math.max(0, Math.min(dataPoints - 1, bucketIndex));
      
      if (!buckets[clampedIndex]) {
        buckets[clampedIndex] = { supply: 0, withdraw: 0 };
      }

      // Calculate USD value of the amount
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
      } catch (error) {
        // Skip if calculation fails
      }
    }

    // Build cumulative TVL data (start from current and work backwards)
    const data = [];
    let cumulativeChange = 0;
    
    for (let i = dataPoints - 1; i >= 0; i--) {
      const bucket = buckets[i];
      if (bucket) {
        cumulativeChange += (bucket.supply - bucket.withdraw);
      }
      // Approximate historical TVL by subtracting cumulative changes from current
      const historicalTVL = Math.max(0, currentTVL - cumulativeChange);
      data.unshift(historicalTVL);
    }

    // If no data, return current TVL for all points
    if (data.length === 0) {
      return Array(dataPoints).fill(currentTVL);
    }

    return data;
  } catch (error) {
    console.error('Error fetching historical TVL:', error);
    return [];
  }
}

/**
 * Get historical volume data points
 */
export async function getHistoricalVolume(provider, periodDays = null) {
  if (!provider) return [];

  try {
    const swapRouter = new ethers.Contract(CONTRACTS.SWAP_ROUTER, SWAP_ROUTER_ABI, provider);
    const swapFilter = swapRouter.filters.Swap();
    
    let fromBlock = 0;
    const currentBlock = await provider.getBlockNumber();
    
    if (periodDays) {
      const blocksPerDay = 7200;
      fromBlock = Math.max(0, currentBlock - (periodDays * blocksPerDay));
    }

    const events = await swapRouter.queryFilter(swapFilter, fromBlock);
    
    // Get block timestamps for all events
    const eventsWithTimestamps = await Promise.all(
      events.map(async (event) => {
        try {
          const block = await provider.getBlock(event.blockNumber);
          return {
            ...event,
            timestamp: block.timestamp,
          };
        } catch (error) {
          return { ...event, timestamp: Date.now() / 1000 };
        }
      })
    );

    // Determine time buckets
    const now = Math.floor(Date.now() / 1000);
    const periodSeconds = periodDays ? periodDays * 86400 : now - eventsWithTimestamps[0]?.timestamp || 86400;
    const dataPoints = periodDays ? Math.min(periodDays, 30) : 30;
    const bucketSize = Math.max(3600, Math.floor(periodSeconds / dataPoints)); // At least 1 hour buckets

    // Group events by time buckets and calculate volume per bucket
    const buckets = {};
    
    for (const event of eventsWithTimestamps) {
      const bucketIndex = Math.floor((event.timestamp - (now - periodSeconds)) / bucketSize);
      if (!buckets[bucketIndex]) {
        buckets[bucketIndex] = [];
      }
      buckets[bucketIndex].push(event);
    }

    // Calculate volume for each bucket
    const lendingPool = new ethers.Contract(CONTRACTS.LENDING_POOL, LENDING_POOL_ABI, provider);
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
        } catch (error) {
          // Skip if calculation fails
        }
      }

      data.push(Number(bucketVolume) / 1e18);
    }

    return data;
  } catch (error) {
    console.error('Error fetching historical volume:', error);
    return [];
  }
}

/**
 * Get historical transaction count data points
 */
export async function getHistoricalTransactions(provider, periodDays = null) {
  if (!provider) return [];

  try {
    let fromBlock = 0;
    const currentBlock = await provider.getBlockNumber();
    
    if (periodDays) {
      const blocksPerDay = 7200;
      fromBlock = Math.max(0, currentBlock - (periodDays * blocksPerDay));
    }

    // Fetch all events
    const [swapEvents, supplyEvents, withdrawEvents, borrowEvents, repayEvents, faucetEvents] = await Promise.all([
      (async () => {
        try {
          const swapRouter = new ethers.Contract(CONTRACTS.SWAP_ROUTER, SWAP_ROUTER_ABI, provider);
          const swapFilter = swapRouter.filters.Swap();
          const events = await swapRouter.queryFilter(swapFilter, fromBlock);
          return events.map(e => ({ ...e, timestamp: null }));
        } catch (error) {
          return [];
        }
      })(),
      (async () => {
        try {
          const lendingPool = new ethers.Contract(CONTRACTS.LENDING_POOL, LENDING_POOL_ABI, provider);
          const filter = lendingPool.filters.CollateralSupplied();
          const events = await lendingPool.queryFilter(filter, fromBlock);
          return events.map(e => ({ ...e, timestamp: null }));
        } catch (error) {
          return [];
        }
      })(),
      (async () => {
        try {
          const lendingPool = new ethers.Contract(CONTRACTS.LENDING_POOL, LENDING_POOL_ABI, provider);
          const filter = lendingPool.filters.CollateralWithdrawn();
          const events = await lendingPool.queryFilter(filter, fromBlock);
          return events.map(e => ({ ...e, timestamp: null }));
        } catch (error) {
          return [];
        }
      })(),
      (async () => {
        try {
          const lendingPool = new ethers.Contract(CONTRACTS.LENDING_POOL, LENDING_POOL_ABI, provider);
          const filter = lendingPool.filters.TokenBorrowed();
          const events = await lendingPool.queryFilter(filter, fromBlock);
          return events.map(e => ({ ...e, timestamp: null }));
        } catch (error) {
          return [];
        }
      })(),
      (async () => {
        try {
          const lendingPool = new ethers.Contract(CONTRACTS.LENDING_POOL, LENDING_POOL_ABI, provider);
          const filter = lendingPool.filters.TokenRepaid();
          const events = await lendingPool.queryFilter(filter, fromBlock);
          return events.map(e => ({ ...e, timestamp: null }));
        } catch (error) {
          return [];
        }
      })(),
      (async () => {
        try {
          const faucet = new ethers.Contract(CONTRACTS.FAUCET, FAUCET_ABI, provider);
          const filter = faucet.filters.TokensClaimed();
          const events = await faucet.queryFilter(filter, fromBlock);
          return events.map(e => ({ ...e, timestamp: null }));
        } catch (error) {
          return [];
        }
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

    // Get timestamps for all events (batch process for efficiency)
    const uniqueBlocks = [...new Set(allEvents.map(e => e.blockNumber))];
    const blockTimestamps = {};
    
    // Sample blocks to get timestamps (to avoid too many calls)
    const sampleSize = Math.min(uniqueBlocks.length, 100);
    const sampledBlocks = uniqueBlocks.slice(0, sampleSize);
    
    await Promise.all(
      sampledBlocks.map(async (blockNum) => {
        try {
          const block = await provider.getBlock(blockNum);
          blockTimestamps[blockNum] = block.timestamp;
        } catch (error) {
          blockTimestamps[blockNum] = Date.now() / 1000;
        }
      })
    );

    // Assign timestamps to events
    const eventsWithTimestamps = allEvents.map(event => ({
      ...event,
      timestamp: blockTimestamps[event.blockNumber] || Date.now() / 1000,
    })).sort((a, b) => a.timestamp - b.timestamp);

    // Determine time buckets
    const now = Math.floor(Date.now() / 1000);
    const periodSeconds = periodDays ? periodDays * 86400 : 
                         eventsWithTimestamps.length > 0 ? 
                         now - eventsWithTimestamps[0].timestamp : 86400;
    const dataPoints = periodDays ? Math.min(periodDays, 30) : 30;
    const bucketSize = Math.max(3600, Math.floor(periodSeconds / dataPoints));

    // Group events by time buckets
    const buckets = {};
    const startTime = now - periodSeconds;
    
    for (const event of eventsWithTimestamps) {
      const bucketIndex = Math.floor((event.timestamp - startTime) / bucketSize);
      const clampedIndex = Math.max(0, Math.min(dataPoints - 1, bucketIndex));
      buckets[clampedIndex] = (buckets[clampedIndex] || 0) + 1;
    }

    // Build data array
    const data = [];
    for (let i = 0; i < dataPoints; i++) {
      data.push(buckets[i] || 0);
    }

    return data;
  } catch (error) {
    console.error('Error fetching historical transactions:', error);
    return [];
  }
}

/**
 * Get all protocol statistics
 */
export async function getProtocolStats(provider, periodDays = null) {
  if (!provider) {
    return {
      tvl: 0,
      volume: 0,
      transactions: 0,
      historicalTVL: [],
      historicalVolume: [],
      historicalTransactions: [],
    };
  }

  const [tvl, volume, transactions, historicalTVL, historicalVolume, historicalTransactions] = await Promise.all([
    getTotalTVL(provider),
    getTotalVolume(provider, periodDays),
    getTotalTransactions(provider, periodDays),
    getHistoricalTVL(provider, periodDays),
    getHistoricalVolume(provider, periodDays),
    getHistoricalTransactions(provider, periodDays),
  ]);

  return {
    tvl,
    volume,
    transactions,
    historicalTVL,
    historicalVolume,
    historicalTransactions,
  };
}

