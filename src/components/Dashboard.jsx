import React, { useState, useEffect, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useEthersProvider } from '../hooks/useEthers';
import { useBalances } from '../hooks/useBalances';
import { getUserCollateral, getUserAccountData, getUserDebt } from '../services/lendingService';
import { formatTokenAmount, formatUSD, formatCompactNumber } from '../utils/formatters';
import { TOKENS, LENDABLE_TOKENS } from '../constants/tokens';
import { formatUnits } from 'ethers';
import { Eye, EyeOff, Wallet, ArrowUpRight, TrendingUp } from 'lucide-react';

const Dashboard = ({ setLendBorrowInitialTab, setActiveTab }) => {
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
    CAT: 0.015,
    DARC: 0.04,
    PANDA: 0.02,
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
    if (usdcValue > 0) holdings.push({ symbol: 'USDC', value: usdcValue, color: '#10B981' });
    if (darcValue > 0) holdings.push({ symbol: 'DARC', value: darcValue, color: '#F59E0B' });
    if (catValue > 0) holdings.push({ symbol: 'CAT', value: catValue, color: '#EF4444' });
    if (pandaValue > 0) holdings.push({ symbol: 'PANDA', value: pandaValue, color: '#8B5CF6' });

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
        const timeOffset = (points - 1 - i) / points;
        const variation = 0.95 + (timeOffset * 0.1) + (Math.random() * 0.05);
        data.push({
          time: now - (i * 3600000),
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

  // Calculate total borrowed value
  const totalBorrowedValue = useMemo(() => {
    let total = 0;
    for (const token of LENDABLE_TOKENS) {
      const borrowed = borrowedTokens[token.symbol] || 0n;
      const amount = parseFloat(formatUnits(borrowed, token.decimals));
      total += amount * (tokenPrices[token.symbol] || 0);
    }
    return total;
  }, [borrowedTokens]);

  // Total portfolio value (wallet + supplied - borrowed)
  const totalPortfolioValue = totalWalletBalance + totalSuppliedValue - totalBorrowedValue;

  // Handle navigation to lend/borrow tab
  const handleDeposit = () => {
    if (setLendBorrowInitialTab) setLendBorrowInitialTab('supply');
    if (setActiveTab) setActiveTab('lend-borrow');
  };

  const handleWithdraw = () => {
    if (setLendBorrowInitialTab) setLendBorrowInitialTab('withdraw');
    if (setActiveTab) setActiveTab('lend-borrow');
  };

  // Donut chart component with total value in center
  const DonutChart = ({ data, size = 180, totalValue }) => {
    const radius = (size / 2) - 20;
    const center = size / 2;
    const circumference = 2 * Math.PI * radius;

    // If no holdings, show placeholder donut (gray ring)
    const showPlaceholder = data.length === 0;

    if (showPlaceholder) {
      return (
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="transform -rotate-90">
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="#2a2a2a"
              strokeWidth="24"
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">Total</p>
              <p className="text-xl font-bold text-white">$0.00</p>
            </div>
          </div>
        </div>
      );
    }

    let cumulativeOffset = 0;

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {data.map((item, index) => {
            const strokeDasharray = (item.percentage / 100) * circumference;
            const strokeDashoffset = -cumulativeOffset;
            cumulativeOffset += strokeDasharray;

            return (
              <circle
                key={item.symbol}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth="24"
                strokeDasharray={`${strokeDasharray} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-500"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Total</p>
            <p className="text-xl font-bold text-white">${formatCompactNumber(totalValue)}</p>
          </div>
        </div>
      </div>
    );
  };


  // Performance chart component
  const PerformanceChart = ({ data, height = 200 }) => {
    // Use placeholder data (flat line at $0) when no real data exists
    const chartData = data.length > 0 ? data : Array.from({ length: 24 }, (_, i) => ({
      time: Date.now() - ((23 - i) * 3600000),
      value: 0,
    }));

    const minValue = Math.min(...chartData.map(d => d.value));
    const maxValue = Math.max(...chartData.map(d => d.value));
    const range = maxValue - minValue || 1;

    const width = 600;
    const padding = { left: 50, right: 20, top: 20, bottom: 30 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const points = chartData.map((d, i) => {
      const x = padding.left + (i / (chartData.length - 1)) * chartWidth;
      const y = padding.top + chartHeight - ((d.value - minValue) / range) * chartHeight;
      return `${x},${y}`;
    }).join(' ');

    // Y-axis labels
    const yLabels = [];
    for (let i = 0; i <= 4; i++) {
      const value = minValue + (range * i / 4);
      yLabels.push({
        value: `$${formatCompactNumber(value)}`,
        y: padding.top + chartHeight - (i / 4) * chartHeight,
      });
    }

    // X-axis time labels
    const xLabels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:59'];

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="performanceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5a8a3a" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#5a8a3a" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y-axis labels */}
        {yLabels.map((label, i) => (
          <text
            key={`y-${i}`}
            x={padding.left - 8}
            y={label.y + 4}
            textAnchor="end"
            className="fill-gray-600 text-[10px]"
          >
            {label.value}
          </text>
        ))}

        {/* Grid lines */}
        {yLabels.map((label, i) => (
          <line
            key={`grid-${i}`}
            x1={padding.left}
            y1={label.y}
            x2={width - padding.right}
            y2={label.y}
            stroke="#2a2a2a"
            strokeWidth="1"
          />
        ))}

        {/* X-axis labels */}
        {xLabels.map((label, i) => (
          <text
            key={`x-${i}`}
            x={padding.left + (i / (xLabels.length - 1)) * chartWidth}
            y={height - 8}
            textAnchor="middle"
            className="fill-gray-600 text-[10px]"
          >
            {label}
          </text>
        ))}

        {/* Chart area fill */}
        <polygon
          points={`${padding.left},${padding.top + chartHeight} ${points} ${width - padding.right},${padding.top + chartHeight}`}
          fill="url(#performanceGradient)"
        />

        {/* Chart line */}
        <polyline
          points={points}
          fill="none"
          stroke="#5cb849"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  // Check if user has any borrowed tokens
  const hasBorrowedTokens = useMemo(() => {
    return LENDABLE_TOKENS.some(token => {
      const borrowed = borrowedTokens[token.symbol] || 0n;
      return borrowed > 0n;
    });
  }, [borrowedTokens]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold gradient-text">Dashboard</h1>

      {/* Top Card: Total Portfolio Balance */}
      <div className="glass-card p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-gray-400 text-sm">Total Portfolio Balance</p>
              <button
                onClick={() => setShowBalance(!showBalance)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-3xl sm:text-4xl md:text-5xl font-bold text-white break-words">
                {showBalance ? formatUSD(totalWalletBalance) : '••••••'}
              </p>
              {totalWalletBalance > 0 && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#5a8a3a]/20 text-[#5cb849] text-sm font-medium">
                  <TrendingUp className="w-3.5 h-3.5" />
                  +2.4%
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleDeposit}
              className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl gradient-bg text-white font-medium hover:opacity-90 transition-opacity min-h-[44px] text-sm sm:text-base"
            >
              <Wallet className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">Deposit</span>
            </button>
            <button
              onClick={handleWithdraw}
              className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl border border-[#2a2a2a] bg-[#111] text-white font-medium hover:bg-[#1a1a1a] transition-colors min-h-[44px] text-sm sm:text-base"
            >
              <ArrowUpRight className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">Withdraw</span>
            </button>
          </div>
        </div>
      </div>

      {/* Middle Section: Portfolio Performance + Portfolio Holdings */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Portfolio Performance Card */}
        <div className="lg:col-span-3 glass-card p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-base sm:text-lg font-semibold text-white">Portfolio Performance</h2>
            <div className="flex gap-1 bg-[#1a1a1a] rounded-lg p-1 flex-wrap">
              {['24H', '7D', '1M', '3M', '1Y'].map(period => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-2 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-colors min-h-[32px] ${selectedPeriod === period
                    ? 'bg-[#5a8a3a] text-white'
                    : 'text-gray-400 hover:text-white'
                    }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[200px]">
            <PerformanceChart data={performanceData} height={200} />
          </div>
        </div>

        {/* Portfolio Holdings Card */}
        <div className="lg:col-span-2 glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Portfolio Holdings</h2>
          <div className="flex flex-col items-center">
            <DonutChart data={portfolioHoldings} size={180} totalValue={totalPortfolioValue} />
            <div className="w-full mt-4 space-y-2">
              {portfolioHoldings.map((holding) => (
                <div key={holding.symbol} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: holding.color }}
                    />
                    <span className="text-gray-400 text-sm">{holding.symbol}</span>
                  </div>
                  <span className="text-white text-sm font-medium">
                    {holding.percentage.toFixed(2)}%
                  </span>
                </div>
              ))}
              {portfolioHoldings.length === 0 && (
                <>
                  {[{ symbol: 'USDC', color: '#10B981' }, { symbol: 'DARC', color: '#F59E0B' }, { symbol: 'CAT', color: '#EF4444' }, { symbol: 'PANDA', color: '#8B5CF6' }].map((token) => (
                    <div key={token.symbol} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full opacity-50"
                          style={{ backgroundColor: token.color }}
                        />
                        <span className="text-gray-500 text-sm">{token.symbol}</span>
                      </div>
                      <span className="text-gray-500 text-sm font-medium">0.00%</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Supplied Tokens + Borrowed Tokens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Supplied Tokens Card */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Supplied Tokens</h2>
          <div className="space-y-3">
            {LENDABLE_TOKENS.map((token) => {
              const supplied = suppliedTokens[token.symbol] || 0n;
              const amount = parseFloat(formatUnits(supplied, token.decimals));
              const formattedAmount = formatCompactNumber(amount);
              const usdValue = amount * (tokenPrices[token.symbol] || 0);

              return (
                <div key={token.symbol} className="flex items-center justify-between py-3 border-b border-[#1a1a1a] last:border-b-0 gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <img src={token.icon} alt={token.symbol} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full shrink-0" />
                    <span className="text-white font-medium truncate">{token.symbol}</span>
                  </div>
                  <div className="text-right min-w-0 flex-shrink-0">
                    <p className="text-white font-semibold text-sm sm:text-base truncate">
                      {formattedAmount} {token.symbol}
                    </p>
                    <p className="text-gray-500 text-xs sm:text-sm truncate">
                      {formatUSD(usdValue)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Borrowed Tokens Card */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Borrowed Tokens</h2>
          <div className="space-y-3">
            {LENDABLE_TOKENS.map((token) => {
              const borrowed = borrowedTokens[token.symbol] || 0n;
              const amount = parseFloat(formatUnits(borrowed, token.decimals));
              const formattedAmount = formatCompactNumber(amount);

              return (
                <div key={token.symbol} className="flex items-center justify-between py-3 border-b border-[#1a1a1a] last:border-b-0 gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <img src={token.icon} alt={token.symbol} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full shrink-0" />
                    <span className="text-white font-medium truncate">{token.symbol}</span>
                  </div>
                  <div className="text-right min-w-0 flex-shrink-0">
                    <p className="text-white font-semibold text-sm sm:text-base truncate">
                      {formattedAmount} {token.symbol}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
