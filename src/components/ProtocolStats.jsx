import React, { useState } from 'react';
import { formatUSD } from '../utils/formatters';

const ProtocolStats = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  // Fixed values - permanent, don't update
  const [stats] = useState({
    tvl: 1000000, // $1M
    volume: 100000, // $100k
    transactions: 1000, // 1k
    historicalTVL: [],
    historicalVolume: [],
    historicalTransactions: [],
  });
  const [loading] = useState(false);

  const periods = [
    { label: 'All Time', value: 'all', days: null },
    { label: '7d', value: '7d', days: 7 },
    { label: '30d', value: '30d', days: 30 },
    { label: '90d', value: '90d', days: 90 },
  ];

  const currentPeriod = periods.find(p => p.value === selectedPeriod) || periods[0];

  // No longer fetching stats - using fixed values
  // useEffect removed - stats are now permanent fixed values

  // Generate chart data for the green line based on fixed values
  const generateChartData = (baseValue) => {
    const dataPoints = 20;
    const data = [];
    const volatility = 0.03; // 3% volatility for smoother lines

    for (let i = 0; i < dataPoints; i++) {
      const randomVariation = (Math.random() - 0.5) * volatility;
      const timeOffset = (dataPoints - i - 1) / dataPoints;
      const trendValue = baseValue * (0.85 + timeOffset * 0.15);
      const value = trendValue * (1 + randomVariation);
      data.push(Math.max(0, value));
    }

    return data;
  };

  const tvlData = generateChartData(stats.tvl);
  const volumeData = generateChartData(stats.volume);
  const txData = generateChartData(stats.transactions);

  const StatCard = ({ title, value, formatValue, chartData, loading }) => {
    const gradientId = `gradient-${title.replace(/\s+/g, '-').toLowerCase()}`;
    
    return (
      <div className="glass-card p-6 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-2">
            <p className="text-sm text-gray-400">{title}</p>
            <p className="text-xs text-gray-500">fixed data</p>
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

              const values = chartData;
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
        </div>
      </div>
    );
  };

  return (
    <div className="mt-6 space-y-4">
      {/* Period Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">Period:</span>
        {periods.map((period) => (
          <button
            key={period.value}
            onClick={() => setSelectedPeriod(period.value)}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              selectedPeriod === period.value
                ? 'bg-[#5a8a3a] text-white'
                : 'bg-[#1a1a1a] text-gray-400 hover:text-white hover:bg-[#222222]'
            }`}
          >
            {period.label}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total TVL"
          value={stats.tvl}
          formatValue={formatUSD}
          chartData={tvlData}
          loading={loading}
        />
        <StatCard
          title="Volume"
          value={stats.volume}
          formatValue={formatUSD}
          chartData={volumeData}
          loading={loading}
        />
        <StatCard
          title="Transactions"
          value={stats.transactions}
          chartData={txData}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default ProtocolStats;

