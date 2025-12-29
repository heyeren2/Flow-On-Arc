import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useEthersProvider, useEthersSigner } from '../hooks/useEthers';
import { useBalances } from '../hooks/useBalances';
import { useNotifications } from './NotificationProvider';
import { SWAPPABLE_TOKENS } from '../constants/tokens';
import { getSwapAmountsOut, swapTokens, checkSwapAllowance, approveSwapToken, executeSwap } from '../services/swapService';
import { formatTokenAmount } from '../utils/formatters';
import { ArrowDownUp } from 'lucide-react';
import TokenSelector from './TokenSelector';
import PriceChart from './PriceChart';
import TransactionModal from './TransactionModal';
import ProtocolStats from './ProtocolStats';

const Swap = () => {
  const { address, isConnected } = useAccount();
  const provider = useEthersProvider();
  const signer = useEthersSigner();
  const { balances, fetchBalances } = useBalances(provider, address);
  const { showTransaction } = useNotifications();

  const [fromToken, setFromToken] = useState(SWAPPABLE_TOKENS[0]);
  const [toToken, setToToken] = useState(SWAPPABLE_TOKENS[1]);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(true);

  useEffect(() => {
    if (fromAmount && fromToken && toToken && provider) {
      const updateAmounts = async () => {
        try {
          const amountOut = await getSwapAmountsOut(
            provider,
            fromAmount,
            fromToken,
            toToken
          );
          setToAmount(formatTokenAmount(amountOut, toToken.decimals));
        } catch (error) {
          console.error('Error calculating swap:', error);
          setToAmount('0.00');
        }
      };
      updateAmounts();
    } else {
      setToAmount('');
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
  };

  const handleApprove = async () => {
    if (!signer || !fromAmount || !fromToken) return;
    return await approveSwapToken(signer, fromToken, fromAmount);
  };

  const handleExecuteSwap = async () => {
    if (!signer || !fromAmount || !toAmount || !fromToken || !toToken) return;
    const amountOutMin = (parseFloat(toAmount) * 0.99).toString();
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
    setShowModal(false);
    
    return tx;
  };

  const switchTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  const setMaxAmount = () => {
    setFromAmount(balances[fromToken.symbol] || '0');
  };

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold gradient-text mb-6">Swap</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Swap Form */}
        <div className="glass-card p-6 space-y-4">
        {/* From Token */}
        <div>
          <label className="text-sm text-gray-400 mb-2 block">From</label>
          <div className="flex gap-2">
            <TokenSelector
              tokens={SWAPPABLE_TOKENS.filter(t => t.symbol !== toToken.symbol)}
              selectedToken={fromToken}
              onSelect={(token) => setFromToken(token)}
              className="w-40"
            />
            <div className="flex-1 relative">
              <input
                type="number"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white pr-16"
              />
              <button
                onClick={setMaxAmount}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs gradient-text font-medium"
              >
                MAX
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Balance: {balances[fromToken.symbol] || '0.00'}
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
            />
            <input
              type="text"
              value={toAmount}
              readOnly
              placeholder="0.00"
              className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Balance: {balances[toToken.symbol] || '0.00'}
          </p>
        </div>

        {/* Swap Button */}
        <button
          onClick={handleSwap}
          disabled={!isConnected || !fromAmount || !toAmount || swapping}
          className="w-full gradient-bg text-white py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity shadow-md"
        >
          {swapping ? 'Swapping...' : isConnected ? 'Swap' : 'Connect Wallet'}
        </button>
        </div>

        {/* Price Chart */}
        <div>
          <PriceChart token={fromToken} />
        </div>
      </div>

      {/* Protocol Statistics */}
      <ProtocolStats />

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        transactionType="swap"
        fromToken={fromToken}
        toToken={toToken}
        fromAmount={fromAmount}
        toAmount={toAmount}
        onApprove={handleApprove}
        onExecute={handleExecuteSwap}
        requiresApproval={requiresApproval}
        transactionParams={{
          slippage: 1,
          exchangeRate: `1 ${fromToken?.symbol} = ${toAmount && fromAmount ? (parseFloat(toAmount) / parseFloat(fromAmount)).toFixed(6) : '0'} ${toToken?.symbol}`,
        }}
      />
    </div>
  );
};

export default Swap;

