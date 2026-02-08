// backendService.js
import { logger } from '../utils/logger';

const SUBGRAPH_URL = import.meta.env.VITE_SUBGRAPH_URL;

/**
 * Generic GraphQL query helper
 */
async function querySubgraph(query, variables = {}) {
  if (!SUBGRAPH_URL) {
    logger.error('VITE_SUBGRAPH_URL is not defined');
    return null;
  }

  try {
    const response = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`Subgraph responded with status: ${response.status}`);
    }

    const { data, errors } = await response.json();
    if (errors) {
      console.error('Subgraph errors:', errors);
      throw new Error(errors[0].message);
    }
    return data;
  } catch (error) {
    logger.error('Error querying subgraph:', error);
    return null;
  }
}

/**
 * Fetch protocol statistics from subgraph
 */
export async function fetchBackendStats() {
  const subgraphData = await querySubgraph(`
    query GetProtocolStats {
      protocols(first: 1) {
        totalTransactions
        totalVolumeUSD
        swapCount
        supplyCount
        withdrawCount
        borrowCount
        repayCount
        claimCount
        lastUpdated
      }
    }
  `);

  if (subgraphData && subgraphData.protocols && subgraphData.protocols[0]) {
    const p = subgraphData.protocols[0];
    return {
      totalTransactions: parseInt(p.totalTransactions, 10),
      totalVolume: parseFloat(p.totalVolumeUSD),
      swaps: parseInt(p.swapCount, 10),
      supplies: parseInt(p.supplyCount, 10),
      withdraws: parseInt(p.withdrawCount, 10),
      borrows: parseInt(p.borrowCount, 10),
      repays: parseInt(p.repayCount, 10),
      claims: parseInt(p.claimCount, 10),
      lastUpdated: parseInt(p.lastUpdated, 10) * 1000,
    };
  }

  return {
    totalTransactions: 0,
    totalVolume: 0,
    swaps: 0,
    supplies: 0,
    withdraws: 0,
    borrows: 0,
    repays: 0,
    claims: 0,
    lastUpdated: Date.now(),
  };
}

/**
 * Fetch recent transactions from subgraph
 */
export async function fetchBackendTransactions(limit = 50, offset = 0, type = null) {
  let where = {};
  if (type) where.type = type;

  // Fetch both transactions AND protocol counts for accurate totals
  const query = `
    query GetTransactions($limit: Int, $offset: Int, $where: Transaction_filter) {
      transactions(
        first: $limit, 
        skip: $offset, 
        orderBy: timestamp, 
        orderDirection: desc,
        where: $where
      ) {
        id
        txHash
        blockNumber
        timestamp
        type
        wallet
        tokenIn
        tokenOut
        amountIn
        amountOut
        usdValue
      }
      protocols(first: 1) {
        totalTransactions
        swapCount
        supplyCount
        withdrawCount
        borrowCount
        repayCount
        claimCount
      }
    }
  `;

  const subgraphData = await querySubgraph(query, { limit, offset, where });

  if (subgraphData && subgraphData.transactions) {
    const txs = subgraphData.transactions.map(tx => ({
      ...tx,
      timestamp: parseInt(tx.timestamp) * 1000,
      amountIn: parseFloat(tx.amountIn),
      amountOut: tx.amountOut ? parseFloat(tx.amountOut) : 0,
      usdValue: parseFloat(tx.usdValue),
      walletShort: `${tx.wallet.slice(0, 6)}...${tx.wallet.slice(-4)}`,
      explorerUrl: `https://arcscan.io/tx/${tx.txHash}`
    }));

    // Map type to the correct count field
    let total = 0;
    if (subgraphData.protocols && subgraphData.protocols[0]) {
      const p = subgraphData.protocols[0];
      if (!type) {
        total = parseInt(p.totalTransactions, 10);
      } else {
        const countMap = {
          'swap': 'swapCount',
          'supply': 'supplyCount',
          'withdraw': 'withdrawCount',
          'borrow': 'borrowCount',
          'repay': 'repayCount',
          'claim': 'claimCount'
        };
        const field = countMap[type];
        total = field ? parseInt(p[field], 10) : txs.length;
      }
    } else {
      total = txs.length;
    }

    return {
      transactions: txs,
      total,
      limit,
      offset,
    };
  }

  return { transactions: [], total: 0, limit, offset };
}

/**
 * Fetch transactions for a specific wallet
 */
export async function fetchWalletTransactions(walletAddress, limit = 20) {
  const subgraphData = await querySubgraph(`
    query GetWalletTransactions($wallet: String, $limit: Int) {
      transactions(
        first: $limit, 
        orderBy: timestamp, 
        orderDirection: desc,
        where: { wallet: $wallet }
      ) {
        id
        txHash
        blockNumber
        timestamp
        type
        tokenIn
        amountIn
        usdValue
      }
    }
  `, { wallet: walletAddress.toLowerCase(), limit });

  if (subgraphData && subgraphData.transactions) {
    return subgraphData.transactions.map(tx => ({
      ...tx,
      timestamp: parseInt(tx.timestamp) * 1000,
      amountIn: parseFloat(tx.amountIn),
      usdValue: parseFloat(tx.usdValue),
    }));
  }

  return [];
}

export function getBackendUrl() {
  return SUBGRAPH_URL;
}

export async function checkBackendHealth() {
  try {
    const data = await querySubgraph(`{ _meta { block { number } } }`);
    return { healthy: !!data, indexer: 'goldsky', block: data?._meta?.block?.number };
  } catch (e) {
    return { healthy: false, error: e.message };
  }
}
