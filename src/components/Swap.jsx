import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useEthersProvider, useEthersSigner } from '../hooks/useEthers';
import { useBalances } from '../hooks/useBalances';
import { useTokenPrices } from '../hooks/useTokenPrices';
import { useNotifications } from './NotificationProvider';
import { SWAPPABLE_TOKENS } from '../constants/tokens';
import { getSwapAmountsOut, swapTokens, checkSwapAllowance, approveSwapToken, executeSwap, calculatePriceImpact, getSpotExchangeRate } from '../services/swapService';
import { formatTokenAmount, formatUSD } from '../utils/formatters';
import { ArrowDownUp, AlertTriangle, TrendingUp } from 'lucide-react';
import TokenSelector from './TokenSelector';
import PriceChart from './PriceChart';
import TransactionModal from './TransactionModal';
import ProtocolStats from './ProtocolStats';

const Swap = () => {
  const { address, isConnected } = useAccount();
  const provider = useEthersProvider();
  const signer = useEthersSigner();
  const { balances, fetchBalances } = useBalances(provider, address);
  const { prices: tokenPrices } = useTokenPrices(provider);
  const { showTransaction, setIsBlurActive } = useNotifications();

  const [fromToken, setFromToken] = useState(SWAPPABLE_TOKENS[0]);
  const [toToken, setToToken] = useState(SWAPPABLE_TOKENS[1]);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [priceImpact, setPriceImpact] = useState(null);
  const [loadingPriceImpact, setLoadingPriceImpact] = useState(false);
  const [spotExchangeRate, setSpotExchangeRate] = useState(null);
  const [slippageTolerance, setSlippageTolerance] = useState(1); // Default 1% slippage

  // Calculate spot exchange rate when tokens change (not when amount changes)
  useEffect(() => {
    if (fromToken && toToken && provider) {
      const fetchSpotRate = async () => {
        try {
          const rate = await getSpotExchangeRate(provider, fromToken, toToken);
          setSpotExchangeRate(rate);
        } catch (error) {
          console.error('Error fetching spot rate:', error);
          setSpotExchangeRate(null);
        }
      };
      fetchSpotRate();
    } else {
      setSpotExchangeRate(null);
    }
  }, [fromToken, toToken, provider]); // Only recalculate when tokens change

  useEffect(() => {
    if (fromAmount && fromToken && toToken && provider) {
      const updateAmounts = async () => {
        try {
          setLoadingPriceImpact(true);

          // Calculate output amount
          const amountOut = await getSwapAmountsOut(
            provider,
            fromAmount,
            fromToken,
            toToken
          );
          setToAmount(formatTokenAmount(amountOut, toToken.decimals));

          // Calculate price impact based on pool reserves
          const impact = await calculatePriceImpact(
            provider,
            fromAmount,
            fromToken,
            toToken
          );
          setPriceImpact(impact);
        } catch (error) {
          console.error('Error calculating swap:', error);
          setToAmount('0.00');
          setPriceImpact(null);
        } finally {
          setLoadingPriceImpact(false);
        }
      };
      updateAmounts();
    } else {
      setToAmount('');
      setPriceImpact(null);
    }
  }, [fromAmount, fromToken, toToken, provider]);

  useEffect(() => {
    const checkApproval = async () => {
      if (provider && address && fromAmount && fromToken) {
        const hasAllowance = await checkSwapAllowance(provider, address, fromToken, fromAmount);
        setRequiresApproval(!hasAllowance);
      }
    };
    checkApproval();
  }, [provider, address, fromAmount, fromToken]);

  const handleSwap = async () => {
    if (!isConnected || !signer || !fromAmount || !toAmount) return;
    setShowModal(true);
    setIsBlurActive(true);
  };

  const handleApprove = async () => {
    if (!signer || !fromAmount || !fromToken) return;
    return await approveSwapToken(signer, fromToken, fromAmount);
  };

  const handleExecuteSwap = async () => {
    if (!signer || !fromAmount || !toAmount || !fromToken || !toToken) return;
    // Calculate minimum output amount based on slippage tolerance
    const slippageMultiplier = 1 - (slippageTolerance / 100);
    const amountOutMin = (parseFloat(toAmount) * slippageMultiplier).toString();
    const tx = await executeSwap(signer, fromAmount, fromToken, toToken, amountOutMin);

    // Show notification
    await showTransaction('swap', Promise.resolve(tx), {
      pendingMessage: `Swapping ${fromAmount} ${fromToken.symbol} for ${toToken.symbol}...`,
      successMessage: `Successfully swapped ${fromAmount} ${fromToken.symbol} for ${toAmount} ${toToken.symbol}`,
      transactionData: {
        token: `${fromToken.symbol} → ${toToken.symbol}`,
        amount: `${fromAmount} → ${toAmount}`,
      },
    });

    setFromAmount('');
    setToAmount('');
    fetchBalances();

    // Delay refresh to allow RPC to catch up
    setTimeout(() => {
      fetchBalances();
    }, 2000);
    // Modal will auto-close after 5 seconds showing confirmation

    return tx;
  };

  const switchTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  const setMaxAmount = () => {
    setFromAmount((balances[fromToken.symbol] || '0').replace(/,/g, ''));
  };

  const setPercentageAmount = (percentage) => {
    if (!fromToken) return;

    // Get wallet balance for fromToken
    const balanceStr = (balances[fromToken.symbol] || '0').replace(/,/g, '');
    const balance = parseFloat(balanceStr);

    if (balance <= 0) return;

    // Calculate percentage amount
    const percentageAmount = (balance * percentage) / 100;

    // Format to appropriate decimal places based on token decimals
    const decimals = fromToken.decimals;
    const formattedAmount = percentageAmount.toFixed(decimals === 6 ? 2 : 6).replace(/\.?0+$/, '');

    setFromAmount(formattedAmount);
  };

  const MINIMUM_SWAP_USD = 5;

  const isInsufficientBalance = isConnected && fromAmount && fromToken && parseFloat(fromAmount) > parseFloat((balances[fromToken.symbol] || '0').replace(/,/g, ''));

  const isBelowMinimum = () => {
    if (!isConnected || !fromAmount || !fromToken || !tokenPrices[fromToken.symbol]) return false;
    const amountUSD = parseFloat(fromAmount) * (tokenPrices[fromToken.symbol] || 0);
    return amountUSD > 0 && amountUSD < MINIMUM_SWAP_USD;
  };

  const getButtonText = () => {
    if (swapping) return 'Swapping...';
    if (!isConnected) return 'Connect Wallet';
    if (!fromAmount || !toAmount) return 'Enter Amount';
    if (isInsufficientBalance) return 'Insufficient Balance';
    if (isBelowMinimum()) return `Minimum $${MINIMUM_SWAP_USD}`;
    if (loadingPriceImpact) return 'Calculating...';
    return 'Swap';
  };

  // Helper function to get price impact display info
  const getPriceImpactDisplay = () => {
    if (!priceImpact || priceImpact.error || priceImpact.priceImpact === null || priceImpact.priceImpact === undefined) {
      return null;
    }

    const impact = priceImpact.priceImpact;

    if (impact < 0.1) {
      return { color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30', label: 'Very Low', value: impact };
    } else if (impact < 0.5) {
      return { color: 'text-green-300', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30', label: 'Low', value: impact };
    } else if (impact < 1) {
      return { color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/30', label: 'Medium', value: impact };
    } else if (impact < 3) {
      return { color: 'text-orange-400', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30', label: 'High', value: impact };
    } else {
      return { color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30', label: 'Very High', value: impact };
    }
  };

  const priceImpactDisplay = getPriceImpactDisplay();

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-4 sm:mb-6">Swap</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Swap Form */}
        <div className="glass-card p-4 sm:p-6 space-y-4">
          {/* From Token */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">From</label>
            <div className="flex gap-2">
              <TokenSelector
                tokens={SWAPPABLE_TOKENS.filter(t => t.symbol !== toToken.symbol)}
                selectedToken={fromToken}
                onSelect={(token) => setFromToken(token)}
                className="w-40"
                balances={balances}
              />
              <div className="flex-1 relative">
                <input
                  type="number"
                  value={fromAmount}
                  onChange={(e) => {
                    // Remove any commas and ensure only numbers and decimal point
                    const cleaned = e.target.value.replace(/,/g, '').replace(/[^0-9.]/g, '');
                    setFromAmount(cleaned);
                  }}
                  placeholder="0.00"
                  className={`w-full bg-[#1a1a1a] border ${isInsufficientBalance || isBelowMinimum() ? 'border-red-500/50 focus:border-red-500' : 'border-[#2a2a2a]'} rounded-xl px-4 py-3 text-white pr-16`}
                />
                <button
                  onClick={setMaxAmount}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs gradient-text font-medium"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Percentage Buttons */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-500">Quick:</span>
              {[20, 50, 100].map((percent) => (
                <button
                  key={percent}
                  onClick={() => setPercentageAmount(percent)}
                  className="px-3 py-1 text-xs font-medium rounded-xl bg-[#1a1a1a] hover:bg-[#252525] text-gray-400 hover:text-white transition-colors border border-[#2a2a2a] hover:border-[#5a8a3a]/30 min-h-[28px]"
                >
                  {percent === 100 ? 'MAX' : `${percent}%`}
                </button>
              ))}
            </div>

            <p className={`text-xs mt-2 ${isInsufficientBalance || isBelowMinimum() ? 'text-red-400' : 'text-gray-500'}`}>
              Balance: {balances[fromToken.symbol] || '0.00'}
              {isBelowMinimum() && tokenPrices[fromToken.symbol] && (
                <span className="block mt-1">Minimum swap: ${MINIMUM_SWAP_USD} USD</span>
              )}
            </p>
          </div>

          {/* Switch Button */}
          <div className="flex justify-center">
            <button
              onClick={switchTokens}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-full p-2 hover:bg-[#222222] transition-colors"
            >
              <ArrowDownUp className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* To Token */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">To</label>
            <div className="flex gap-2">
              <TokenSelector
                tokens={SWAPPABLE_TOKENS.filter(t => t.symbol !== fromToken.symbol)}
                selectedToken={toToken}
                onSelect={(token) => setToToken(token)}
                className="w-40"
                balances={balances}
              />
              <input
                type="text"
                value={toAmount}
                readOnly
                placeholder="0.00"
                className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Balance: {balances[toToken.symbol] || '0.00'}
            </p>
          </div>

          {/* Price Impact & Liquidity Info */}
          {fromAmount && parseFloat(fromAmount) > 0 && (
            <div className="space-y-3">
              {/* Price Impact Display */}
              {loadingPriceImpact ? (
                <div className="p-3 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a]">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#5a8a3a] border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs text-gray-400">Calculating price impact...</span>
                  </div>
                </div>
              ) : priceImpactDisplay ? (
                <div className={`p-3 rounded-xl border ${priceImpactDisplay.bgColor} ${priceImpactDisplay.borderColor}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle
                        className={`w-4 h-4 ${priceImpactDisplay.value > 1 ? 'text-red-400' : priceImpactDisplay.value > 0.5 ? 'text-orange-400' : 'text-green-400'
                          }`}
                      />
                      <span className="text-xs text-gray-400">Price Impact</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${priceImpactDisplay.color}`}>
                        {priceImpactDisplay.value.toFixed(2)}%
                      </span>
                      <span className="text-xs text-gray-500">({priceImpactDisplay.label})</span>
                    </div>
                  </div>

                  {/* Warnings for high impact */}
                  {priceImpactDisplay.value > 3 && (
                    <p className="text-xs text-red-400 mt-2 flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>Very high price impact. Consider splitting your swap into smaller transactions or adding liquidity to reduce impact.</span>
                    </p>
                  )}
                  {priceImpactDisplay.value > 1 && priceImpactDisplay.value <= 3 && (
                    <p className="text-xs text-orange-400 mt-2 flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>High price impact. You may want to split this swap or wait for more liquidity.</span>
                    </p>
                  )}
                </div>
              ) : null}



              {/* Exchange Rate - Show stable spot rate */}
              {spotExchangeRate !== null && spotExchangeRate !== undefined ? (
                <div className="p-3 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Exchange Rate</span>
                    <span className="text-white font-medium">
                      1 {fromToken.symbol} = {spotExchangeRate.toFixed(6)} {toToken.symbol}
                    </span>
                  </div>
                </div>
              ) : fromAmount && toAmount && parseFloat(fromAmount) > 0 && parseFloat(toAmount) > 0 ? (
                <div className="p-3 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Exchange Rate</span>
                    <span className="text-xs text-gray-500">Calculating...</span>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Swap Button */}
          <button
            onClick={handleSwap}
            disabled={!isConnected || !fromAmount || !toAmount || swapping || isInsufficientBalance || isBelowMinimum() || loadingPriceImpact}
            className="w-full gradient-bg text-white py-3 rounded-2xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity shadow-md min-h-[44px]"
          >
            {getButtonText()}
          </button>

          {/* Add Liquidity CTA for low liquidity pools */}
          {priceImpact && priceImpact.liquidityDepth !== undefined && priceImpact.liquidityDepth > 0 && priceImpact.liquidityDepth < 1000 && (
            <div className="p-3 rounded-xl bg-[#5a8a3a]/10 border border-[#5a8a3a]/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#5cb849] font-medium mb-1">💡 Help Improve Liquidity</p>
                  <p className="text-xs text-gray-400">Add liquidity to this pool to reduce price impact and earn fees from swaps.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  // TODO: Navigate to liquidity page or open liquidity modal
                  alert('Liquidity provision feature coming soon! Add liquidity to reduce price impact.');
                }}
                className="mt-2 w-full text-xs px-3 py-2 rounded-xl bg-[#5a8a3a]/20 hover:bg-[#5a8a3a]/30 text-[#5cb849] font-medium transition-colors border border-[#5a8a3a]/30"
              >
                Add Liquidity →
              </button>
            </div>
          )}
        </div>

        {/* Price Chart */}
        <div>
          <PriceChart token={fromToken} />
        </div>
      </div>

      {/* Protocol Statistics */}
      <ProtocolStats />

      {/* Transaction Modal */}
      {showModal && (
        <TransactionModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setIsBlurActive(false);
          }}
          transactionType="swap"
          fromToken={fromToken}
          toToken={toToken}
          fromAmount={fromAmount}
          toAmount={toAmount}
          onApprove={handleApprove}
          onExecute={handleExecuteSwap}
          requiresApproval={requiresApproval}
          transactionParams={{
            slippage: slippageTolerance,
            exchangeRate: `1 ${fromToken?.symbol} = ${toAmount && fromAmount ? (parseFloat(toAmount) / parseFloat(fromAmount)).toFixed(6) : '0'} ${toToken?.symbol}`,
          }}
        />
      )}
    </div>
  );
};

export default Swap;

