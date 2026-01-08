import React, { useState, useEffect, useCallback, useRef } from 'react';
import { formatUSD } from '../utils/formatters';
import { useEthersProvider } from '../hooks/useEthers';
import { getProtocolStats } from '../services/statsService';
import { ArrowRightLeft, PiggyBank, Landmark, Undo2, ArrowUpFromLine, Gift } from 'lucide-react';

const ProtocolStats = () => {
  const provider = useEthersProvider();
  const [stats, setStats] = useState({
    tvl: 0,
    volume: 0,
    transactions: 0,
    historicalTVL: [],
    historicalVolume: [],
    historicalTransactions: [],
    source: null,
    breakdown: null,
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [fetchError, setFetchError] = useState(false);
  const previousStats = useRef(null);

  // Fetch live stats from backend + blockchain
  const fetchStats = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setFetchError(false);
    
    try {
      const data = await getProtocolStats(provider);
      
      // Validate data - don't accept sudden drops to 0 if we had good data
      if (data.tvl === 0 && previousStats.current?.tvl > 0) {
        console.warn('TVL dropped to 0, keeping previous value');
        data.tvl = previousStats.current.tvl;
      }
      
      // Store for future comparison
      previousStats.current = data;
      
      setStats(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching protocol stats:', error);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [provider]);

  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchStats();

    // Refresh every 60 seconds (silent refresh, no loading spinner)
    const interval = setInterval(() => fetchStats(false), 60000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  // Generate chart dataa
  const getChartData = (historicalData, currentValue) => {
    if (historicalData && historicalData.length > 0) {
      return historicalData;
    }
    
    const dataPoints = 20;
    const data = [];
    for (let i = 0; i < dataPoints; i++) {
      const progress = i / (dataPoints - 1);
      const value = currentValue * (0.7 + progress * 0.3);
      data.push(Math.max(0, value));
    }
    return data;
  };

  const tvlData = getChartData(stats.historicalTVL, stats.tvl);
  const volumeData = getChartData(stats.historicalVolume, stats.volume);
  const txData = getChartData(stats.historicalTransactions, stats.transactions);

  const StatCard = ({ title, value, formatValue, chartData, loading, subtitle }) => {
    const gradientId = `gradient-${title.replace(/\s+/g, '-').toLowerCase()}`;
    
    return (
      <div className="glass-card p-6 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-sm text-gray-400">{title}</p>
              {subtitle && (
                <p className="text-[10px] text-gray-600 mt-0.5">{subtitle}</p>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5a8a3a] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#5cb849]"></span>
              </span>
              <p className="text-xs text-[#5a8a3a] font-medium">live</p>
            </div>
          </div>
          {loading ? (
            <div className="h-8 w-32 bg-gray-700 rounded animate-pulse" />
          ) : (
            <p className="text-2xl font-bold text-white mb-4">
              {formatValue ? formatValue(value) : value.toLocaleString()}
            </p>
          )}
        </div>
        <div className="relative h-10 w-full mt-2">
          {loading ? (
            <div className="h-full w-full bg-gray-800 rounded animate-pulse" />
          ) : (
            <svg width="100%" height="100%" className="absolute bottom-0 left-0 right-0" preserveAspectRatio="none">
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5a8a3a" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#5a8a3a" stopOpacity="0" />
                </linearGradient>
              </defs>
              {(() => {
                const width = 200;
                const height = 40;
                const padding = 4;
                const chartWidth = width - 2 * padding;
                const chartHeight = height - 2 * padding;

                const values = chartData.length > 0 ? chartData : [0, 0];
                const minValue = Math.min(...values);
                const maxValue = Math.max(...values);
                const range = maxValue - minValue || 1;

                const points = values.map((value, index) => {
                  const x = padding + (index / (values.length - 1)) * chartWidth;
                  const y = padding + chartHeight - ((value - minValue) / range) * chartHeight;
                  return `${x},${y}`;
                });

                const pathData = `M ${points.join(' L ')}`;
                const areaPath = `${pathData} L ${padding + chartWidth},${padding + chartHeight} L ${padding},${padding + chartHeight} Z`;

                return (
                  <>
                    <path d={areaPath} fill={`url(#${gradientId})`} />
                    <path d={pathData} fill="none" stroke="#5a8a3a" strokeWidth="1.5" />
                  </>
                );
              })()}
            </svg>
          )}
        </div>
      </div>
    );
  };

  // Transaction type breakdown card
  const TransactionBreakdown = () => {
    if (!stats.breakdown) return null;

    const types = [
      { key: 'swaps', label: 'Swaps', icon: ArrowRightLeft, color: 'text-blue-400' },
      { key: 'supplies', label: 'Supplies', icon: PiggyBank, color: 'text-green-400' },
      { key: 'withdraws', label: 'Withdraws', icon: ArrowUpFromLine, color: 'text-orange-400' },
      { key: 'borrows', label: 'Borrows', icon: Landmark, color: 'text-yellow-400' },
      { key: 'repays', label: 'Repays', icon: Undo2, color: 'text-purple-400' },
      { key: 'claims', label: 'Claims', icon: Gift, color: 'text-pink-400' },
    ];

    return (
      <div className="glass-card p-6 mt-4">
        <h4 className="text-sm font-medium text-gray-400 mb-4">Transaction Breakdown</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {types.map(({ key, label, icon: Icon, color }) => (
            <div key={key} className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#1a1a1a]">
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-lg font-bold text-white">
                  {stats.breakdown[key] || 0}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Manual refresh handler
  const handleRefresh = () => {
    fetchStats(true);
  };

  // Get source label
  const getSourceLabel = () => {
    if (stats.source === 'backend') return 'Live data';
    if (stats.source === 'onchain') return 'On-chain';
    return 'Cached';
  };

  return (
    <div className="mt-6 space-y-4">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-gray-400">Protocol Stats</h3>
          <span className="px-2 py-0.5 text-[10px] font-medium bg-[#5a8a3a]/20 text-[#5cb849] rounded-full">
            {getSourceLabel()}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {fetchError && (
            <span className="text-xs text-yellow-500">⚠️ Using cached data</span>
          )}
          {lastUpdated && (
            <p className="text-xs text-gray-600">
              Updated {lastUpdated.toLocaleTimeString()}
            </p>
          )}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-1.5 rounded-md bg-[#1a1a1a] text-gray-400 hover:text-white hover:bg-[#222222] transition-colors disabled:opacity-50"
            title="Refresh stats"
          >
            <svg 
              className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total TVL"
          subtitle="Lending + AMM Pools"
          value={stats.tvl}
          formatValue={formatUSD}
          chartData={tvlData}
          loading={loading}
        />
        <StatCard
          title="Volume"
          subtitle={stats.breakdown ? `All transaction types` : 'All transactions'}
          value={stats.volume}
          formatValue={formatUSD}
          chartData={volumeData}
          loading={loading}
        />
        <StatCard
          title="Transactions"
          subtitle={stats.breakdown ? 
            `${stats.breakdown.swaps + stats.breakdown.supplies + stats.breakdown.withdraws + stats.breakdown.borrows + stats.breakdown.repays + stats.breakdown.claims} total` : 
            'All types'}
          value={stats.transactions}
          chartData={txData}
          loading={loading}
        />
      </div>

      {/* Transaction Breakdown */}
      {!loading && <TransactionBreakdown />}
    </div>
  );
};

export default ProtocolStats;