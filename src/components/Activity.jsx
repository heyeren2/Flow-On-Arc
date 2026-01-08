import React, { useState, useEffect, useCallback } from 'react';
import { Clock, ExternalLink, RefreshCw, ArrowRightLeft, PiggyBank, Landmark, Undo2, ArrowUpFromLine, Gift, Filter } from 'lucide-react';
import { fetchBackendTransactions } from '../services/backendService';

const Activity = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [total, setTotal] = useState(0);

  // Transaction type icons and colors
  const typeConfig = {
    swap: { icon: ArrowRightLeft, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Swap' },
    supply: { icon: PiggyBank, color: 'text-green-400', bg: 'bg-green-500/10', label: 'Supply' },
    borrow: { icon: Landmark, color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'Borrow' },
    repay: { icon: Undo2, color: 'text-purple-400', bg: 'bg-purple-500/10', label: 'Repay' },
    withdraw: { icon: ArrowUpFromLine, color: 'text-orange-400', bg: 'bg-orange-500/10', label: 'Withdraw' },
    claim: { icon: Gift, color: 'text-pink-400', bg: 'bg-pink-500/10', label: 'Faucet Claim' },
  };

  const filters = [
    { value: 'all', label: 'All' },
    { value: 'swap', label: 'Swaps' },
    { value: 'supply', label: 'Supplies' },
    { value: 'borrow', label: 'Borrows' },
    { value: 'repay', label: 'Repays' },
    { value: 'withdraw', label: 'Withdrawals' },
    { value: 'claim', label: 'Claims' },
  ];

  // Fetch transactions from backend
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const typeFilter = filter === 'all' ? null : filter;
      const data = await fetchBackendTransactions(50, 0, typeFilter);
      setTransactions(data.transactions || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to load transactions. Backend may be syncing.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchTransactions();
    
    // Refresh every 30 second
    const interval = setInterval(fetchTransactions, 30000);
    return () => clearInterval(interval);
  }, [fetchTransactions]);

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Format amount
  const formatAmount = (amount) => {
    if (!amount) return '-';
    const num = parseFloat(amount);
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    if (num >= 1) return num.toFixed(2);
    return num.toFixed(4);
  };

  // Render transaction row
  const TransactionRow = ({ tx }) => {
    const config = typeConfig[tx.type] || typeConfig.swap;
    const Icon = config.icon;

    return (
      <div className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-[#1a1a1a] last:border-b-0">
        {/* Type & Icon */}
        <div className="flex items-center gap-3 min-w-[140px]">
          <div className={`p-2 rounded-lg ${config.bg}`}>
            <Icon className={`w-4 h-4 ${config.color}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-white">{config.label}</p>
            <p className="text-xs text-gray-500">{formatTime(tx.timestamp)}</p>
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 px-4">
          {tx.type === 'swap' ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-white">{formatAmount(tx.amountIn)}</span>
              <span className="text-gray-500">{tx.tokenIn}</span>
              <ArrowRightLeft className="w-3 h-3 text-gray-600" />
              <span className="text-white">{formatAmount(tx.amountOut)}</span>
              <span className="text-gray-500">{tx.tokenOut}</span>
            </div>
          ) : tx.type === 'claim' ? (
            <p className="text-sm text-gray-400">Claimed tokens from faucet</p>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-white">{formatAmount(tx.amountIn)}</span>
              <span className="text-gray-500">{tx.tokenIn}</span>
            </div>
          )}
          {tx.usdValue > 0 && (
            <p className="text-xs text-gray-600">${tx.usdValue.toFixed(2)}</p>
          )}
        </div>

        {/* Wallet */}
        <div className="hidden md:block min-w-[120px] text-right">
          <p className="text-xs text-gray-500 font-mono">{tx.walletShort}</p>
        </div>

        {/* Explorer Link */}
        <a
          href={tx.explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-4 p-2 rounded-lg bg-[#1a1a1a] hover:bg-[#252525] transition-colors group"
          title="View on Explorer"
        >
          <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-[#5cb849]" />
        </a>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Activity</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total > 0 ? `${total} total transactions` : 'All protocol transactions'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-[#5a8a3a]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5a8a3a] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#5cb849]"></span>
            </span>
            Live
          </span>
          <button
            onClick={fetchTransactions}
            disabled={loading}
            className="p-2 rounded-lg bg-[#1a1a1a] hover:bg-[#252525] transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter className="w-4 h-4 text-gray-500 shrink-0" />
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              filter === f.value
                ? 'bg-[#5a8a3a] text-white'
                : 'bg-[#1a1a1a] text-gray-400 hover:text-white hover:bg-[#252525]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Transactions List */}
      <div className="glass-card overflow-hidden">
        {loading && transactions.length === 0 ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 text-gray-600 mx-auto mb-4 animate-spin" />
            <p className="text-gray-500">Loading transactions...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">{error}</p>
            <button
              onClick={fetchTransactions}
              className="text-sm text-[#5cb849] hover:underline"
            >
              Try again
            </button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-white text-xl font-semibold mb-2">No Transactions Yet</p>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              {filter === 'all' 
                ? 'Transactions will appear here as users interact with the protocol. Try performing a swap or supply!'
                : `No ${filter} transactions found. Try a different filter.`
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#1a1a1a]">
            {transactions.map((tx, idx) => (
              <TransactionRow key={tx.txHash || idx} tx={tx} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {transactions.length > 0 && (
        <p className="text-center text-xs text-gray-600">
          Showing {transactions.length} of {total} transactions • Data updates every 2mins
        </p>
      )}
    </div>
  );
};

export default Activity;
