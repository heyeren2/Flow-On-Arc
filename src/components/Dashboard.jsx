import React, { useState, useEffect, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useEthersProvider } from '../hooks/useEthers';
import { useBalances } from '../hooks/useBalances';
import { getUserCollateral, getUserAccountData, getUserDebt } from '../services/lendingService';
import { formatTokenAmount, formatUSD, formatCompactNumber } from '../utils/formatters';
import { TOKENS, LENDABLE_TOKENS } from '../constants/tokens';
import { formatUnits } from 'ethers';
import { Eye, EyeOff } from 'lucide-react';

const Dashboard = () => {
  const { address, isConnected } = useAccount();
  const provider = useEthersProvider();
  const { balances, rawBalances, fetchBalances } = useBalances(provider, address);
  
  const [showBalance, setShowBalance] = useState(true);
  const [suppliedTokens, setSuppliedTokens] = useState({});
  const [borrowedTokens, setBorrowedTokens] = useState({});
  const [accountData, setAccountData] = useState({
    totalCollateralUSD: 0n,
    totalDebtUSD: 0n,
    availableBorrowsUSD: 0n,
    healthFactor: 0n,
  });
  const [performanceData, setPerformanceData] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('24H');

  // Fixed token prices
  const tokenPrices = {
    CAT: 0.5,
    DARC: 1.0,
    PANDA: 0.67,
    USDC: 1.0,
  };

  // Fetch supplied and borrowed tokens
  useEffect(() => {
    if (provider && address) {
      const fetchData = async () => {
        const supplied = {};
        const borrowed = {};
        for (const token of LENDABLE_TOKENS) {
          const collateral = await getUserCollateral(provider, address, token.address);
          const debt = await getUserDebt(provider, address, token.address);
          supplied[token.symbol] = collateral;
          borrowed[token.symbol] = debt;
        }
        setSuppliedTokens(supplied);
        setBorrowedTokens(borrowed);
        
        const data = await getUserAccountData(provider, address);
        setAccountData(data);
      };
      fetchData();
      const interval = setInterval(fetchData, 10000);
      return () => clearInterval(interval);
    }
  }, [provider, address]);

  // Calculate total wallet balance
  const safeRawBalances = rawBalances || { CAT: 0n, DARC: 0n, PANDA: 0n, USDC: 0n };
  const calculateTokenValue = (rawBalance, decimals, price) => {
    if (!rawBalance || rawBalance === 0n || !decimals || !price) return 0;
    try {
      const balanceNumber = parseFloat(formatUnits(rawBalance, decimals));
      if (isNaN(balanceNumber)) return 0;
      return balanceNumber * price;
    } catch (error) {
      return 0;
    }
  };

  const catValue = calculateTokenValue(safeRawBalances.CAT, TOKENS.CAT.decimals, tokenPrices.CAT);
  const darcValue = calculateTokenValue(safeRawBalances.DARC, TOKENS.DARC.decimals, tokenPrices.DARC);
  const pandaValue = calculateTokenValue(safeRawBalances.PANDA, TOKENS.PANDA.decimals, tokenPrices.PANDA);
  const usdcValue = calculateTokenValue(safeRawBalances.USDC, TOKENS.USDC.decimals, tokenPrices.USDC);
  const totalWalletBalance = isConnected ? catValue + darcValue + pandaValue + usdcValue : 0;

  // Calculate portfolio holdings for donut chart
  const portfolioHoldings = useMemo(() => {
    const holdings = [];
    if (catValue > 0) holdings.push({ symbol: 'CAT', value: catValue, color: '#EF4444' });
    if (darcValue > 0) holdings.push({ symbol: 'DARC', value: darcValue, color: '#F59E0B' });
    if (pandaValue > 0) holdings.push({ symbol: 'PANDA', value: pandaValue, color: '#8B5CF6' });
    if (usdcValue > 0) holdings.push({ symbol: 'USDC', value: usdcValue, color: '#10B981' });
    
    const total = holdings.reduce((sum, h) => sum + h.value, 0);
    return holdings.map(h => ({
      ...h,
      percentage: total > 0 ? (h.value / total) * 100 : 0,
    }));
  }, [catValue, darcValue, pandaValue, usdcValue]);

  // Generate performance chart data (updates when balance changes)
  useEffect(() => {
    const generateData = () => {
      const data = [];
      const now = Date.now();
      const points = 24;
      const baseValue = totalWalletBalance;
      
      for (let i = points - 1; i >= 0; i--) {
        // Create a trend that reflects recent changes
        const timeOffset = (points - 1 - i) / points;
        const variation = 0.95 + (timeOffset * 0.1) + (Math.random() * 0.05);
        data.push({
          time: now - (i * 3600000), // hourly
          value: baseValue * variation,
        });
      }
      setPerformanceData(data);
    };
    
    if (totalWalletBalance > 0) {
      generateData();
    }
    const interval = setInterval(() => {
      if (totalWalletBalance > 0) {
        generateData();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [totalWalletBalance]);

  // Calculate total supplied value
  const totalSuppliedValue = useMemo(() => {
    let total = 0;
    for (const token of LENDABLE_TOKENS) {
      const supplied = suppliedTokens[token.symbol] || 0n;
      const amount = parseFloat(formatUnits(supplied, token.decimals));
      total += amount * (tokenPrices[token.symbol] || 0);
    }
    return total;
  }, [suppliedTokens]);

  // Donut chart component
  const DonutChart = ({ data, size = 160 }) => {
    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center w-[160px] h-[160px]">
          <p className="text-gray-400 text-sm">No holdings</p>
        </div>
      );
    }

    let currentAngle = -90;
    const radius = size / 2 - 10;
    const center = size / 2;
    const circumference = 2 * Math.PI * radius;
    let cumulativePercentage = 0;

    return (
      <svg width={size} height={size} className="transform -rotate-90">
        {data.map((item, index) => {
          const strokeDasharray = (item.percentage / 100) * circumference;
          const strokeDashoffset = cumulativePercentage > 0 
            ? -((cumulativePercentage / 100) * circumference)
            : 0;
          
          cumulativePercentage += item.percentage;
          
          return (
            <circle
              key={item.symbol}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth="20"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-300"
            />
          );
        })}
      </svg>
    );
  };

  // Performance chart component
  const PerformanceChart = ({ data, width = 600, height = 160 }) => {
    if (data.length === 0) return null;
    
    const minValue = Math.min(...data.map(d => d.value));
    const maxValue = Math.max(...data.map(d => d.value));
    const range = maxValue - minValue || 1;
    const currentValue = data.length > 0 ? data[data.length - 1].value : 0;
    
    // Add small padding on left and right sides, chart uses more width (40% wider than before)
    const horizontalPadding = 8; // Minimal padding to keep chart within card
    const chartWidth = width - (horizontalPadding * 2); // Chart uses most of available width
    const startX = horizontalPadding;
    const endX = startX + chartWidth;
    
    const points = data.map((d, i) => {
      const x = startX + (i / (data.length - 1)) * chartWidth;
      const y = height - ((d.value - minValue) / range) * height;
      return `${x},${y}`;
    }).join(' ');

    // Generate grid lines
    const gridLines = 5;
    const gridLinePositions = [];
    for (let i = 0; i <= gridLines; i++) {
      const yRatio = i / gridLines;
      const yPos = yRatio * height;
      gridLinePositions.push(yPos);
    }

    return (
      <svg width={width} height={height} className="w-full h-full" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5a8a3a" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#5a8a3a" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Grid lines */}
        {gridLinePositions.map((yPos, i) => (
          <line
            key={`grid-${i}`}
            x1={startX}
            y1={yPos}
            x2={endX}
            y2={yPos}
            stroke="#2a2a2a"
            strokeWidth="0.5"
            opacity="0.5"
          />
        ))}
        
        {/* Reference line at current value */}
        {data.length > 0 && (
          <line
            x1={startX}
            y1={height - ((currentValue - minValue) / range) * height}
            x2={endX}
            y2={height - ((currentValue - minValue) / range) * height}
            stroke="#5a8a3a"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            opacity="0.6"
          />
        )}
        
        {/* Chart area fill */}
        <polygon
          points={`${startX},${height} ${points} ${endX},${height}`}
          fill="url(#chartGradient)"
        />
        
        {/* Chart line */}
        <polyline
          points={points}
          fill="none"
          stroke="#5a8a3a"
          strokeWidth="2"
        />
      </svg>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold gradient-text">Dashboard</h1>
      </div>

      {/* Portfolio Balance Card */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-gray-400 text-sm">Portfolio Balance</p>
          <button
            onClick={() => setShowBalance(!showBalance)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {showBalance ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-4xl font-bold gradient-text">
          {showBalance ? formatUSD(totalWalletBalance) : '••••••'}
        </p>
      </div>

      {/* Portfolio Performance Card */}
      <div className="glass-card p-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold text-white">Portfolio Performance</h2>
          <span className="text-xs text-gray-400">fixed data!!</span>
        </div>
        <div className="h-[160px] mb-2">
          <PerformanceChart data={performanceData} />
        </div>
        <div className="flex gap-2">
          {['24H', '7D', '1M', '3M', '1Y'].map(period => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedPeriod === period
                  ? 'gradient-bg text-white'
                  : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Portfolio Holdings Card - Full Height */}
        <div className="glass-card p-5 pb-1">
          <h2 className="text-xl font-semibold mb-3 text-white">Portfolio Holdings</h2>
          <div className="flex items-center justify-center mb-3">
            <DonutChart data={portfolioHoldings} size={160} />
          </div>
          <div className="space-y-2">
            {portfolioHoldings.map((holding) => (
              <div key={holding.symbol} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: holding.color }}
                  />
                  <span className="text-white font-medium">{holding.symbol}</span>
                </div>
                <span className="text-white font-semibold">
                  {holding.percentage.toFixed(2)}%
                </span>
              </div>
            ))}
            {portfolioHoldings.length === 0 && (
              <p className="text-gray-400 text-sm text-center">No holdings yet</p>
            )}
          </div>
        </div>

        {/* Right Side: Two Cards Stacked */}
        <div className="flex flex-col gap-5">
          {/* Supplied Tokens Card */}
          <div className="glass-card p-5 pb-1 flex-1">
            <h2 className="text-xl font-semibold mb-3 text-white">Supplied Tokens</h2>
            <div className="space-y-2">
              {LENDABLE_TOKENS.map((token) => {
                const supplied = suppliedTokens[token.symbol] || 0n;
                const amount = parseFloat(formatUnits(supplied, token.decimals));
                const formattedAmount = formatCompactNumber(amount);
                
                return (
                  <div key={token.symbol} className="flex items-center justify-between p-2 glass-card">
                    <div className="flex items-center gap-3">
                      <img src={token.icon} alt={token.symbol} className="w-8 h-8 rounded-full" />
                      <span className="text-white font-medium">{token.symbol}</span>
                    </div>
                    <span className="text-white font-semibold">
                      {formattedAmount} {token.symbol}
                    </span>
                  </div>
                );
              })}
              {totalSuppliedValue === 0 && (
                <p className="text-gray-400 text-sm text-center">No tokens supplied yet</p>
              )}
            </div>
          </div>

          {/* Borrowed Tokens Card */}
          <div className="glass-card p-5 pb-1 flex-1">
            <h2 className="text-xl font-semibold mb-3 text-white">Borrowed Tokens</h2>
            <div className="space-y-2">
              {LENDABLE_TOKENS.map((token) => {
                const borrowed = borrowedTokens[token.symbol] || 0n;
                const amount = parseFloat(formatUnits(borrowed, token.decimals));
                const formattedAmount = formatCompactNumber(amount);
                
                return (
                  <div key={token.symbol} className="flex items-center justify-between p-2 glass-card">
                    <div className="flex items-center gap-3">
                      <img src={token.icon} alt={token.symbol} className="w-8 h-8 rounded-full" />
                      <span className="text-white font-medium">{token.symbol}</span>
                    </div>
                    <span className="text-white font-semibold">
                      {formattedAmount} {token.symbol}
                    </span>
                  </div>
                );
              })}
              {Object.values(borrowedTokens).every(v => v === 0n || !v) && (
                <p className="text-gray-400 text-sm text-center">No tokens borrowed yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
