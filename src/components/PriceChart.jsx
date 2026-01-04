import React, { useState, useEffect, useMemo } from 'react';
import { useEthersProvider } from '../hooks/useEthers';
import { getTokenPrice } from '../services/priceService';
import { formatUSD } from '../utils/formatters';
import { Loader2 } from 'lucide-react';

const PriceChart = ({ token }) => {
  const provider = useEthersProvider();
  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceChange, setPriceChange] = useState(0);
  const [volume24h, setVolume24h] = useState(0);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1H');
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Generate mock chart data based on current price
  const generateChartData = (price, timeframe) => {
    const dataPoints = timeframe === '1H' ? 20 : timeframe === '1D' ? 24 : timeframe === '1W' ? 7 : 30;
    const data = [];
    const basePrice = price || 0.5;
    const volatility = 0.02; // 2% volatility

    for (let i = 0; i < dataPoints; i++) {
      const timeOffset = dataPoints - i - 1;
      const randomVariation = (Math.random() - 0.5) * volatility;
      const priceValue = basePrice * (1 + randomVariation + (timeOffset * 0.001));
      data.push({
        time: timeOffset,
        price: Math.max(0, priceValue),
      });
    }

    // Sort by time (oldest first)
    return data.sort((a, b) => a.time - b.time);
  };

  useEffect(() => {
    if (!token || !provider) {
      setLoading(false);
      return;
    }

    const fetchPrice = async () => {
      setLoading(true);
      try {
        const price = await getTokenPrice(provider, token.address);
        setCurrentPrice(price);
        
        // Generate mock price change (between -5% and +5%)
        const change = (Math.random() - 0.5) * 0.1;
        setPriceChange(change);
        
        // Generate mock 24h volume
        const volume = Math.random() * 100000 + 10000; // Between 10k and 110k
        setVolume24h(volume);
        
        // Generate chart data
        const data = generateChartData(price, selectedTimeframe);
        setChartData(data);
      } catch (error) {
        console.error('Error fetching price:', error);
      } finally {
        // Add small delay to show spinner briefly
        setTimeout(() => {
          setLoading(false);
        }, 300);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 3600000); // Update every 1 hour (if no token change)

    return () => clearInterval(interval);
  }, [token, provider, selectedTimeframe]);

  // Calculate chart dimensions and scaling
  const chartHeight = 200;
  const chartWidth = 400;
  const padding = 40;

  const minPrice = useMemo(() => {
    if (chartData.length === 0) return 0;
    return Math.min(...chartData.map(d => d.price));
  }, [chartData]);

  const maxPrice = useMemo(() => {
    if (chartData.length === 0) return 1;
    return Math.max(...chartData.map(d => d.price));
  }, [chartData]);

  const priceRange = maxPrice - minPrice || 1;
  const chartInnerHeight = chartHeight - padding * 2;
  const chartInnerWidth = chartWidth - padding * 2;

  // Generate path for the line
  const pathData = useMemo(() => {
    if (chartData.length === 0) return '';
    
    const points = chartData.map((point, index) => {
      const x = padding + (index / (chartData.length - 1)) * chartInnerWidth;
      const y = padding + chartInnerHeight - ((point.price - minPrice) / priceRange) * chartInnerHeight;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    });
    
    return points.join(' ');
  }, [chartData, minPrice, priceRange, chartInnerHeight, chartInnerWidth, padding]);

  // Generate area path (for fill)
  const areaPath = useMemo(() => {
    if (chartData.length === 0) return '';
    const firstX = padding;
    const lastX = padding + chartInnerWidth;
    const bottomY = padding + chartInnerHeight;
    return `${pathData} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [pathData, chartInnerHeight, chartInnerWidth, padding]);

  // Format time labels
  const formatTimeLabel = (index, total) => {
    if (selectedTimeframe === '1H') {
      const minutesAgo = total - index - 1;
      const date = new Date();
      date.setMinutes(date.getMinutes() - minutesAgo);
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    return `${index + 1}`;
  };

  const isPositive = priceChange >= 0;

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center justify-center h-[400px]">
          <Loader2 className="w-12 h-12 text-[#5a8a3a] animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-white mb-2">
          {token.symbol} / USDC
        </h2>
        <div className="flex items-baseline gap-3">
          <p className="text-3xl font-bold text-white">
            {formatUSD(currentPrice)}
          </p>
          <p className={`text-sm font-medium ${isPositive ? 'text-[#5a8a3a]' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{(priceChange * 100).toFixed(2)}%
          </p>
        </div>
        <p className="text-sm text-gray-400 mt-1">
          24h Vol: {formatUSD(volume24h)} (updates hourly)
        </p>
      </div>

      {/* Timeframe Selectors */}
      <div className="flex gap-2 mb-4">
        {['1H', '1D', '1W', '1M'].map((timeframe) => (
          <button
            key={timeframe}
            onClick={() => setSelectedTimeframe(timeframe)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              selectedTimeframe === timeframe
                ? 'bg-[#5a8a3a] text-white'
                : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
            }`}
          >
            {timeframe}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="relative">
        <svg
          width={chartWidth}
          height={chartHeight}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full"
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padding + chartInnerHeight - ratio * chartInnerHeight;
            const price = minPrice + ratio * priceRange;
            return (
              <g key={ratio}>
                <line
                  x1={padding}
                  y1={y}
                  x2={padding + chartInnerWidth}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeWidth="1"
                />
                <text
                  x={padding - 10}
                  y={y + 4}
                  fill="rgba(255, 255, 255, 0.4)"
                  fontSize="10"
                  textAnchor="end"
                >
                  {price.toFixed(4)}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path
            d={areaPath}
            fill="url(#gradient)"
            opacity="0.3"
          />
          
          {/* Gradient definition */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#5a8a3a" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#5a8a3a" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Line */}
          <path
            d={pathData}
            fill="none"
            stroke="#5a8a3a"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Current price marker */}
          {chartData.length > 0 && (
            <g>
              <circle
                cx={padding + chartInnerWidth}
                cy={padding + chartInnerHeight - ((currentPrice - minPrice) / priceRange) * chartInnerHeight}
                r="6"
                fill="#5a8a3a"
              />
              <circle
                cx={padding + chartInnerWidth}
                cy={padding + chartInnerHeight - ((currentPrice - minPrice) / priceRange) * chartInnerHeight}
                r="3"
                fill="#000"
              />
              <text
                x={padding + chartInnerWidth + 15}
                y={padding + chartInnerHeight - ((currentPrice - minPrice) / priceRange) * chartInnerHeight + 4}
                fill="#5a8a3a"
                fontSize="12"
                fontWeight="bold"
              >
                {currentPrice.toFixed(4)}
              </text>
            </g>
          )}

          {/* Time labels */}
          {chartData.length > 0 && [0, Math.floor(chartData.length / 2), chartData.length - 1].map((index) => {
            const x = padding + (index / (chartData.length - 1)) * chartInnerWidth;
            return (
              <text
                key={index}
                x={x}
                y={chartHeight - 10}
                fill="rgba(255, 255, 255, 0.4)"
                fontSize="10"
                textAnchor="middle"
              >
                {formatTimeLabel(index, chartData.length)}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default PriceChart;

