// backendService.js

const BACKEND_URL = 'https://dapp-backend-blue-bush-5535.fly.dev';

/**
 ** Fetch protocol statistics from backend
 */
export async function fetchBackendStats() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      totalTransactions: data.totalTransactions || 0,
      totalVolume: data.totalVolume || 0,
      swaps: data.swaps || 0,
      supplies: data.supplies || 0,
      withdraws: data.withdraws || 0,
      borrows: data.borrows || 0,
      repays: data.repays || 0,
      claims: data.claims || 0,
      lastUpdated: data.lastUpdated,
    };
  } catch (error) {
    console.error('Error fetching backend stats:', error);
    throw error;
  }
}

// ADD THIS NEW FUNCTION
/**
 * Fetch stats breakdown by transaction type
 */
export async function fetchStatsBreakdown() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/stats/breakdown`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      breakdown: data.breakdown || []
    };
  } catch (error) {
    console.error('Error fetching stats breakdown:', error);
    throw error;
  }
}

/**
 * Fetch recent transactions from backend
 */
export async function fetchBackendTransactions(limit = 50, offset = 0, type = null) {
  try {
    let url = `${BACKEND_URL}/api/transactions?limit=${limit}&offset=${offset}`;
    if (type) {
      url += `&type=${type}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      transactions: data.transactions || [],
      total: data.total || 0,
      limit: data.limit,
      offset: data.offset,
    };
  } catch (error) {
    console.error('Error fetching backend transactions:', error);
    throw error;
  }
}

/**
 * Fetch transactions for a specific wallet
 */
export async function fetchWalletTransactions(walletAddress, limit = 20) {
  try {
    const response = await fetch(
      `${BACKEND_URL}/api/transactions/wallet/${walletAddress}?limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    return data.transactions || [];
  } catch (error) {
    console.error('Error fetching wallet transactions:', error);
    throw error;
  }
}

/**
 * Check backend health
 */
export async function checkBackendHealth() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return { healthy: false, error: `Status: ${response.status}` };
    }

    const data = await response.json();
    return {
      healthy: data.status === 'healthy',
      database: data.database,
      indexer: data.indexer,
    };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

/**
 * Get backend URL (for display purposes)
 */
export function getBackendUrl() {
  return BACKEND_URL;
}