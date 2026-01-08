import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useEthersProvider, useEthersSigner } from '../hooks/useEthers';
import { useBalances } from '../hooks/useBalances';
import { useTokenPrices } from '../hooks/useTokenPrices';
import { useNotifications } from './NotificationProvider';
import { LENDABLE_TOKENS } from '../constants/tokens';
import TokenSelector from './TokenSelector';
import {
  getUserAccountData,
  getUserCollateral,
  getUserDebt,
  supplyCollateral,
  withdrawCollateral,
  borrowTokens,
  repayTokens,
  checkSupplyAllowance,
  approveSupplyToken,
  executeSupply,
  checkRepayAllowance,
  approveRepayToken,
  executeRepay,
} from '../services/lendingService';
import { formatTokenAmount, formatUSD } from '../utils/formatters';
import TransactionModal from './TransactionModal';

const LendBorrow = ({ initialTab = 'supply' }) => {
  const { address, isConnected } = useAccount();
  const provider = useEthersProvider();
  const signer = useEthersSigner();
  const { balances, fetchBalances } = useBalances(provider, address);
  const { prices: tokenPrices } = useTokenPrices(provider);
  const { showTransaction } = useNotifications();

  const [activeTab, setActiveTab] = useState(initialTab);
  
  // Update activeTab when initialTab prop changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [selectedToken, setSelectedToken] = useState(LENDABLE_TOKENS[0]);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [accountData, setAccountData] = useState({
    totalCollateralUSD: 0n,
    totalDebtUSD: 0n,
    availableBorrowsUSD: 0n,
    healthFactor: 0n,
  });
  const [userCollateral, setUserCollateral] = useState({});
  const [userDebt, setUserDebt] = useState({});

  const MINIMUM_SUPPLY_USD = 5;

  useEffect(() => {
    if (provider && address) {
      fetchAccountData();
    }
  }, [provider, address]);

  useEffect(() => {
    const checkApproval = async () => {
      if (provider && address && amount && selectedToken && (activeTab === 'supply' || activeTab === 'repay')) {
        if (activeTab === 'supply') {
          const hasAllowance = await checkSupplyAllowance(provider, address, selectedToken, amount);
          setRequiresApproval(!hasAllowance);
        } else if (activeTab === 'repay') {
          const hasAllowance = await checkRepayAllowance(provider, address, selectedToken, amount);
          setRequiresApproval(!hasAllowance);
        }
      } else {
        setRequiresApproval(false);
      }
    };
    checkApproval();
  }, [provider, address, amount, selectedToken, activeTab]);

  const fetchAccountData = async () => {
    if (!provider || !address) return;

    try {
      const data = await getUserAccountData(provider, address);
      setAccountData(data);

      const collateral = {};
      const debt = {};
      for (const token of LENDABLE_TOKENS) {
        collateral[token.symbol] = await getUserCollateral(provider, address, token.address);
        debt[token.symbol] = await getUserDebt(provider, address, token.address);
      }
      setUserCollateral(collateral);
      setUserDebt(debt);
    } catch (error) {
      console.error('Error fetching account data:', error);
    }
  };

  const handleSupply = async () => {
    if (!signer || !amount) return;
    setShowModal(true);
  };

  const handleApproveSupply = async () => {
    if (!signer || !amount || !selectedToken) return;
    return await approveSupplyToken(signer, selectedToken, amount);
  };

  const handleExecuteSupply = async () => {
    if (!signer || !amount || !selectedToken) return;
    const tx = await executeSupply(signer, selectedToken, amount);
    
    await showTransaction('supply', Promise.resolve(tx), {
      pendingMessage: `Supplying ${amount} ${selectedToken.symbol}...`,
      successMessage: `Successfully supplied ${amount} ${selectedToken.symbol}`,
      transactionData: {
        token: selectedToken.symbol,
        amount: amount,
      },
    });
    
    setAmount('');
    fetchAccountData();
    fetchBalances();
    // Modal will auto-close after 5 seconds showing confirmation
    
    return tx;
  };

  const handleWithdraw = async () => {
    if (!signer || !amount) return;
    setShowModal(true);
  };

  const handleExecuteWithdraw = async () => {
    if (!signer || !amount || !selectedToken) return;
    const tx = await withdrawCollateral(signer, selectedToken, amount);
    
    await showTransaction('withdraw', Promise.resolve(tx), {
      pendingMessage: `Withdrawing ${amount} ${selectedToken.symbol}...`,
      successMessage: `Successfully withdrew ${amount} ${selectedToken.symbol}`,
      transactionData: {
        token: selectedToken.symbol,
        amount: amount,
      },
    });
    
    setAmount('');
    fetchAccountData();
    fetchBalances();
    // Modal will auto-close after 5 seconds showing confirmation
    
    return tx;
  };

  const handleBorrow = async () => {
    if (!signer || !amount) return;
    setShowModal(true);
  };

  const handleExecuteBorrow = async () => {
    if (!signer || !amount || !selectedToken) return;
    const tx = await borrowTokens(signer, selectedToken, amount);
    
    await showTransaction('borrow', Promise.resolve(tx), {
      pendingMessage: `Borrowing ${amount} ${selectedToken.symbol}...`,
      successMessage: `Successfully borrowed ${amount} ${selectedToken.symbol}`,
      transactionData: {
        token: selectedToken.symbol,
        amount: amount,
      },
    });
    
    setAmount('');
    fetchAccountData();
    fetchBalances();
    // Modal will auto-close after 5 seconds showing confirmation
    
    return tx;
  };

  const handleRepay = async () => {
    if (!signer || !amount) return;
    setShowModal(true);
  };

  const handleApproveRepay = async () => {
    if (!signer || !amount || !selectedToken) return;
    return await approveRepayToken(signer, selectedToken, amount);
  };

  const handleExecuteRepay = async () => {
    if (!signer || !amount || !selectedToken) return;
    const tx = await executeRepay(signer, selectedToken, amount);
    
    await showTransaction('repay', Promise.resolve(tx), {
      pendingMessage: `Repaying ${amount} ${selectedToken.symbol}...`,
      successMessage: `Successfully repaid ${amount} ${selectedToken.symbol}`,
      transactionData: {
        token: selectedToken.symbol,
        amount: amount,
      },
    });
    
    setAmount('');
    fetchAccountData();
    fetchBalances();
    // Modal will auto-close after 5 seconds showing confirmation
    
    return tx;
  };

  const setMaxAmount = () => {
    if (activeTab === 'supply') {
      setAmount((balances[selectedToken.symbol] || '0').replace(/,/g, ''));
    } else if (activeTab === 'withdraw') {
      setAmount(formatTokenAmount(userCollateral[selectedToken.symbol] || 0n, selectedToken.decimals).replace(/,/g, ''));
    } else if (activeTab === 'borrow') {
      setAmount(formatTokenAmount(accountData.availableBorrowsUSD || 0n, 18).replace(/,/g, ''));
    } else if (activeTab === 'repay') {
      setAmount(formatTokenAmount(userDebt[selectedToken.symbol] || 0n, selectedToken.decimals).replace(/,/g, ''));
    }
  };

  const isInsufficientBalance = () => {
    if (!isConnected || !amount || !selectedToken || parseFloat(amount) <= 0) return false;
    
    if (activeTab === 'supply' || activeTab === 'repay') {
      return parseFloat(amount) > parseFloat((balances[selectedToken.symbol] || '0').replace(/,/g, ''));
    }
    if (activeTab === 'withdraw') {
      const supplied = formatTokenAmount(userCollateral[selectedToken.symbol] || 0n, selectedToken.decimals);
      return parseFloat(amount) > parseFloat(supplied.replace(/,/g, ''));
    }
    if (activeTab === 'borrow') {
      const availableUSD = Number(accountData.availableBorrowsUSD) / 1e18;
      const amountUSD = parseFloat(amount) * (tokenPrices[selectedToken.symbol] || 0);
      return amountUSD > availableUSD;
    }
    return false;
  };

  const isBelowMinimum = () => {
    if (activeTab !== 'supply') return false; // Only apply to supply
    if (!isConnected || !amount || !selectedToken || !tokenPrices[selectedToken.symbol]) return false;
    const amountUSD = parseFloat(amount) * (tokenPrices[selectedToken.symbol] || 0);
    return amountUSD > 0 && amountUSD < MINIMUM_SUPPLY_USD;
  };

  const getButtonText = () => {
    if (loading) return 'Processing...';
    if (!isConnected) return 'Connect Wallet';
    if (!amount) return 'Enter Amount';
    if (isInsufficientBalance()) return 'Insufficient Balance';
    if (isBelowMinimum()) return `Minimum $${MINIMUM_SUPPLY_USD}`;
    return activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold gradient-text">Lend & Borrow</h1>

      {/* Account Overview */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-4">
          <p className="text-sm text-gray-400 mb-1">Total Collateral</p>
          <p className="text-xl font-bold gradient-text">
            {formatUSD(Number(accountData.totalCollateralUSD) / 1e18)}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-gray-400 mb-1">Total Debt</p>
          <p className="text-xl font-bold text-white">
            {formatUSD(Number(accountData.totalDebtUSD) / 1e18)}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-gray-400 mb-1">Available to Borrow</p>
          <p className="text-xl font-bold text-[#5a8a3a]">
            {formatUSD(Number(accountData.availableBorrowsUSD) / 1e18)}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-gray-400 mb-1">Health Factor</p>
          <p className="text-xl font-bold text-white">
            {accountData.healthFactor > 0
              ? (Number(accountData.healthFactor) / 1e18).toFixed(2)
              : 'N/A'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 glass-card p-1">
        {['supply', 'withdraw', 'borrow', 'repay'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
              activeTab === tab
                ? 'gradient-bg text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Token Prices Display */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-4 text-white">Token Prices</h2>
        <div className="grid grid-cols-4 gap-3">
          {LENDABLE_TOKENS.map(token => (
            <div key={token.symbol} className="flex items-center justify-center gap-3 p-3 glass-card">
              <div className="flex items-center gap-2">
                <img src={token.icon} alt={token.symbol} className="w-5 h-5 rounded-full" />
                <span className="text-sm font-medium text-white">{token.symbol}</span>
              </div>
              <span className="text-sm font-semibold gradient-text">
                {formatUSD(tokenPrices[token.symbol] || 0)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Action Form */}
      <div className="glass-card p-6 space-y-4">
        <div>
          <label className="text-sm text-gray-400 mb-2 block">Token</label>
          <TokenSelector
            tokens={LENDABLE_TOKENS}
            selectedToken={selectedToken}
            onSelect={(token) => setSelectedToken(token)}
            className="w-full"
            balances={
              activeTab === 'supply' || activeTab === 'repay' 
                ? balances  // Show wallet balances for supply/repay
                : activeTab === 'withdraw'
                ? Object.fromEntries(
                    LENDABLE_TOKENS.map(token => [
                      token.symbol,
                      formatTokenAmount(userCollateral[token.symbol] || 0n, token.decimals)
                    ])
                  )  // Show collateral balances for withdraw
                : {}  // No balances for borrow
            }
          />
          {tokenPrices[selectedToken.symbol] > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Current Price: {formatUSD(tokenPrices[selectedToken.symbol])}
            </p>
          )}
        </div>

        <div>
          <label className="text-sm text-gray-400 mb-2 block">Amount</label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className={`w-full bg-[#1a1a1a] border ${isInsufficientBalance() || isBelowMinimum() ? 'border-red-500/50 focus:border-red-500' : 'border-[#2a2a2a]'} rounded-lg px-4 py-3 text-white pr-16`}
            />
            <button
              onClick={setMaxAmount}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs gradient-text font-medium"
            >
              MAX
            </button>
          </div>
          <p className={`text-xs mt-1 ${isInsufficientBalance() || isBelowMinimum() ? 'text-red-400' : 'text-gray-500'}`}>
            {activeTab === 'supply' && `Balance: ${balances[selectedToken.symbol] || '0.00'}`}
            {activeTab === 'withdraw' && `Supplied: ${formatTokenAmount(userCollateral[selectedToken.symbol] || 0n, selectedToken.decimals)}`}
            {activeTab === 'borrow' && `Available: ${formatUSD(Number(accountData.availableBorrowsUSD) / 1e18)}`}
            {activeTab === 'repay' && `Borrowed: ${formatTokenAmount(userDebt[selectedToken.symbol] || 0n, selectedToken.decimals)}`}
            {isBelowMinimum() && tokenPrices[selectedToken.symbol] && (
              <span className="block mt-1">Minimum supply: ${MINIMUM_SUPPLY_USD} USD</span>
            )}
          </p>
        </div>

        <button
          onClick={
            activeTab === 'supply' ? handleSupply :
            activeTab === 'withdraw' ? handleWithdraw :
            activeTab === 'borrow' ? handleBorrow :
            handleRepay
          }
          disabled={!isConnected || !amount || loading || isInsufficientBalance() || isBelowMinimum()}
          className="w-full gradient-bg text-white py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity shadow-md"
        >
          {getButtonText()}
        </button>
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        transactionType={activeTab}
        fromToken={selectedToken}
        toToken={selectedToken}
        fromAmount={amount}
        toAmount={amount}
        onApprove={
          activeTab === 'supply' ? handleApproveSupply :
          activeTab === 'repay' ? handleApproveRepay :
          undefined
        }
        onExecute={
          activeTab === 'supply' ? handleExecuteSupply :
          activeTab === 'withdraw' ? handleExecuteWithdraw :
          activeTab === 'borrow' ? handleExecuteBorrow :
          handleExecuteRepay
        }
        requiresApproval={requiresApproval && (activeTab === 'supply' || activeTab === 'repay')}
        transactionParams={{}}
      />
    </div>
  );
};

export default LendBorrow;

