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
  const LTV = 0.8; // 80% Loan-to-Value ratio

  useEffect(() => {
    if (provider && address) {
      fetchAccountData();
    }
  }, [provider, address]);

  useEffect(() => {
    const checkApproval = async () => {
      if (provider && address && amount && selectedToken && (activeTab === 'supply' || activeTab === 'repay')) {
        const cleanedAmount = amount.toString().replace(/,/g, '').trim();
        if (activeTab === 'supply') {
          const hasAllowance = await checkSupplyAllowance(provider, address, selectedToken, cleanedAmount);
          setRequiresApproval(!hasAllowance);
        } else if (activeTab === 'repay') {
          const hasAllowance = await checkRepayAllowance(provider, address, selectedToken, cleanedAmount);
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

  // Calculate max withdrawable amount per token based on free collateral
  const getMaxWithdrawable = (token) => {
    if (!accountData || !userCollateral || !tokenPrices[token.symbol]) {
      return 0n;
    }

    const totalCollateralUSD = Number(accountData.totalCollateralUSD) / 1e18;
    const totalDebtUSD = Number(accountData.totalDebtUSD) / 1e18;
    
    // If no debt, can withdraw everything
    if (totalDebtUSD === 0) {
      return userCollateral[token.symbol] || 0n;
    }

    // Calculate free collateral in USD
    // LTV is 80%, so we need: Debt / 0.8 = collateral needed
    // Free collateral = Total Collateral - (Debt / 0.8)
    const requiredCollateralUSD = totalDebtUSD / LTV;
    const freeCollateralUSD = Math.max(0, totalCollateralUSD - requiredCollateralUSD);

    // If no free collateral, return 0
    if (freeCollateralUSD <= 0) {
      return 0n;
    }

    // Get this token's collateral value in USD
    const tokenCollateral = userCollateral[token.symbol] || 0n;
    const tokenCollateralAmount = Number(tokenCollateral) / (10 ** token.decimals);
    const tokenCollateralUSD = tokenCollateralAmount * (tokenPrices[token.symbol] || 0);

    // Calculate this token's share of total collateral
    const tokenShare = totalCollateralUSD > 0 ? tokenCollateralUSD / totalCollateralUSD : 0;
    
    // Calculate free collateral for this token
    const tokenFreeCollateralUSD = freeCollateralUSD * tokenShare;
    
    // Convert back to token amount
    const tokenPrice = tokenPrices[token.symbol] || 0;
    if (tokenPrice === 0) return 0n;
    
    const tokenFreeAmount = tokenFreeCollateralUSD / tokenPrice;
    const maxWithdrawable = BigInt(Math.floor(tokenFreeAmount * (10 ** token.decimals)));

    // Don't exceed actual collateral
    return maxWithdrawable > tokenCollateral ? tokenCollateral : maxWithdrawable;
  };

  // Get available borrow amount in selected token
  const getAvailableBorrowInToken = () => {
    if (!accountData || !selectedToken || !tokenPrices[selectedToken.symbol]) {
      return '0.00';
    }
    
    const availableBorrowUSD = Number(accountData.availableBorrowsUSD) / 1e18;
    const tokenPrice = tokenPrices[selectedToken.symbol] || 0;
    
    if (tokenPrice === 0) return '0.00';
    
    const availableInToken = availableBorrowUSD / tokenPrice;
    return formatTokenAmount(
      BigInt(Math.floor(availableInToken * (10 ** selectedToken.decimals))),
      selectedToken.decimals
    );
  };

  const handleSupply = async () => {
    if (!signer || !amount) return;
    setShowModal(true);
  };

  const handleApproveSupply = async () => {
    if (!signer || !amount || !selectedToken) return;
    const cleanedAmount = amount.toString().replace(/,/g, '').trim();
    return await approveSupplyToken(signer, selectedToken, cleanedAmount);
  };

  const handleExecuteSupply = async () => {
    if (!signer || !amount || !selectedToken) return;
    
    // Clean the amount: remove commas and ensure it's a valid number
    const cleanedAmount = amount.toString().replace(/,/g, '').trim();
    if (!cleanedAmount || isNaN(parseFloat(cleanedAmount)) || parseFloat(cleanedAmount) <= 0) {
      throw new Error('Invalid amount');
    }
    
    try {
      const tx = await executeSupply(signer, selectedToken, cleanedAmount);
      
      await showTransaction('supply', Promise.resolve(tx), {
        pendingMessage: `Supplying ${cleanedAmount} ${selectedToken.symbol}...`,
        successMessage: `Successfully supplied ${cleanedAmount} ${selectedToken.symbol}`,
        transactionData: {
          token: selectedToken.symbol,
          amount: cleanedAmount,
        },
      });
      
      setAmount('');
      fetchAccountData();
      fetchBalances();
      // Modal will auto-close after 5 seconds showing confirmation
      
      return tx;
    } catch (error) {
      console.error('Supply error:', error);
      throw error;
    }
  };

  const handleWithdraw = async () => {
    if (!signer || !amount) return;
    setShowModal(true);
  };

  const handleExecuteWithdraw = async () => {
    if (!signer || !amount || !selectedToken) return;
    
    // Clean the amount: remove commas and ensure it's a valid number
    const cleanedAmount = amount.toString().replace(/,/g, '').trim();
    if (!cleanedAmount || isNaN(parseFloat(cleanedAmount)) || parseFloat(cleanedAmount) <= 0) {
      throw new Error('Invalid amount');
    }
    
    try {
      const tx = await withdrawCollateral(signer, selectedToken, cleanedAmount);
      
      await showTransaction('withdraw', Promise.resolve(tx), {
        pendingMessage: `Withdrawing ${cleanedAmount} ${selectedToken.symbol}...`,
        successMessage: `Successfully withdrew ${cleanedAmount} ${selectedToken.symbol}`,
        transactionData: {
          token: selectedToken.symbol,
          amount: cleanedAmount,
        },
      });
      
      setAmount('');
      fetchAccountData();
      fetchBalances();
      // Modal will auto-close after 5 seconds showing confirmation
      
      return tx;
    } catch (error) {
      console.error('Withdraw error:', error);
      // Re-throw with a user-friendly message
      if (error.message?.includes('liquidation') || error.message?.includes('health factor')) {
        throw new Error('Withdrawal would cause liquidation. Please reduce the amount.');
      } else if (error.message?.includes('Insufficient collateral')) {
        throw new Error('Insufficient collateral available for withdrawal.');
      }
      throw error;
    }
  };

  const handleBorrow = async () => {
    if (!signer || !amount) return;
    setShowModal(true);
  };

  const handleExecuteBorrow = async () => {
    if (!signer || !amount || !selectedToken) return;
    
    // Clean the amount: remove commas and ensure it's a valid number
    const cleanedAmount = amount.toString().replace(/,/g, '').trim();
    if (!cleanedAmount || isNaN(parseFloat(cleanedAmount)) || parseFloat(cleanedAmount) <= 0) {
      throw new Error('Invalid amount');
    }
    
    try {
      const tx = await borrowTokens(signer, selectedToken, cleanedAmount);
      
      await showTransaction('borrow', Promise.resolve(tx), {
        pendingMessage: `Borrowing ${cleanedAmount} ${selectedToken.symbol}...`,
        successMessage: `Successfully borrowed ${cleanedAmount} ${selectedToken.symbol}`,
        transactionData: {
          token: selectedToken.symbol,
          amount: cleanedAmount,
        },
      });
      
      setAmount('');
      fetchAccountData();
      fetchBalances();
      // Modal will auto-close after 5 seconds showing confirmation
      
      return tx;
    } catch (error) {
      console.error('Borrow error:', error);
      // Re-throw with a user-friendly message
      if (error.message?.includes('Insufficient collateral')) {
        throw new Error('Insufficient collateral available for borrowing.');
      } else if (error.message?.includes('availableBorrowsUSD')) {
        throw new Error('Amount exceeds available borrowing capacity.');
      }
      throw error;
    }
  };

  const handleRepay = async () => {
    if (!signer || !amount) return;
    setShowModal(true);
  };

  const handleApproveRepay = async () => {
    if (!signer || !amount || !selectedToken) return;
    const cleanedAmount = amount.toString().replace(/,/g, '').trim();
    return await approveRepayToken(signer, selectedToken, cleanedAmount);
  };

  const handleExecuteRepay = async () => {
    if (!signer || !amount || !selectedToken) return;
    
    // Clean the amount: remove commas and ensure it's a valid number
    const cleanedAmount = amount.toString().replace(/,/g, '').trim();
    if (!cleanedAmount || isNaN(parseFloat(cleanedAmount)) || parseFloat(cleanedAmount) <= 0) {
      throw new Error('Invalid amount');
    }
    
    try {
      const tx = await executeRepay(signer, selectedToken, cleanedAmount);
      
      await showTransaction('repay', Promise.resolve(tx), {
        pendingMessage: `Repaying ${cleanedAmount} ${selectedToken.symbol}...`,
        successMessage: `Successfully repaid ${cleanedAmount} ${selectedToken.symbol}`,
        transactionData: {
          token: selectedToken.symbol,
          amount: cleanedAmount,
        },
      });
      
      setAmount('');
      fetchAccountData();
      fetchBalances();
      // Modal will auto-close after 5 seconds showing confirmation
      
      return tx;
    } catch (error) {
      console.error('Repay error:', error);
      // Re-throw with a user-friendly message
      if (error.message?.includes('Repay exceeds debt')) {
        throw new Error('Repayment amount exceeds your debt.');
      }
      throw error;
    }
  };

  const setMaxAmount = () => {
    if (activeTab === 'supply') {
      const balance = (balances[selectedToken.symbol] || '0').replace(/,/g, '');
      setAmount(balance);
    } else if (activeTab === 'withdraw') {
      const maxWithdrawable = getMaxWithdrawable(selectedToken);
      const formatted = formatTokenAmount(maxWithdrawable, selectedToken.decimals);
      // Remove commas when setting amount
      setAmount(formatted.replace(/,/g, ''));
    } else if (activeTab === 'borrow') {
      // Show available borrow in selected token, not USD
      const available = getAvailableBorrowInToken();
      setAmount(available.replace(/,/g, ''));
    } else if (activeTab === 'repay') {
      const debt = formatTokenAmount(userDebt[selectedToken.symbol] || 0n, selectedToken.decimals);
      setAmount(debt.replace(/,/g, ''));
    }
  };

  const setPercentageAmount = (percentage) => {
    if (!selectedToken) return;
    
    let maxAmount = 0;
    let maxAmountFormatted = '0';
    
    if (activeTab === 'supply') {
      // Use wallet balance
      maxAmountFormatted = (balances[selectedToken.symbol] || '0').replace(/,/g, '');
      maxAmount = parseFloat(maxAmountFormatted);
    } else if (activeTab === 'withdraw') {
      // Use max withdrawable
      const maxWithdrawable = getMaxWithdrawable(selectedToken);
      maxAmountFormatted = formatTokenAmount(maxWithdrawable, selectedToken.decimals);
      maxAmount = parseFloat(maxAmountFormatted.replace(/,/g, ''));
    } else if (activeTab === 'borrow') {
      // Use available borrow in token
      const available = getAvailableBorrowInToken();
      maxAmountFormatted = available.replace(/,/g, '');
      maxAmount = parseFloat(maxAmountFormatted);
    } else if (activeTab === 'repay') {
      // Use debt amount
      maxAmountFormatted = formatTokenAmount(userDebt[selectedToken.symbol] || 0n, selectedToken.decimals);
      maxAmount = parseFloat(maxAmountFormatted.replace(/,/g, ''));
    }
    
    if (maxAmount <= 0) return;
    
    // Calculate percentage amount
    const percentageAmount = (maxAmount * percentage) / 100;
    
    // Format to appropriate decimal places based on token decimals
    const decimals = selectedToken.decimals;
    const formattedAmount = percentageAmount.toFixed(decimals === 6 ? 2 : 6).replace(/\.?0+$/, '');
    
    setAmount(formattedAmount);
  };

  const isInsufficientBalance = () => {
    if (!isConnected || !amount || !selectedToken || parseFloat(amount) <= 0) return false;
    
    if (activeTab === 'supply' || activeTab === 'repay') {
      return parseFloat(amount) > parseFloat((balances[selectedToken.symbol] || '0').replace(/,/g, ''));
    }
    if (activeTab === 'withdraw') {
      const maxWithdrawable = getMaxWithdrawable(selectedToken);
      const maxWithdrawableFormatted = formatTokenAmount(maxWithdrawable, selectedToken.decimals);
      return parseFloat(amount) > parseFloat(maxWithdrawableFormatted.replace(/,/g, ''));
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
      <h1 className="text-2xl sm:text-3xl font-bold gradient-text">Lend & Borrow</h1>

      {/* Account Overview */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
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
      <div className="flex gap-1 sm:gap-2 glass-card p-1 overflow-x-auto scrollbar-hide">
        {['supply', 'withdraw', 'borrow', 'repay'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-2 sm:px-4 rounded-md font-medium transition-all text-sm sm:text-base min-h-[40px] whitespace-nowrap ${
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
      <div className="glass-card p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold mb-4 text-white">Token Prices</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
      <div className="glass-card p-4 sm:p-6 space-y-4">
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
                    LENDABLE_TOKENS.map(token => {
                      const maxWithdrawable = getMaxWithdrawable(token);
                      return [
                        token.symbol,
                        formatTokenAmount(maxWithdrawable, token.decimals)
                      ];
                    })
                  )  // Show available withdrawable amounts (not full collateral)
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
              onChange={(e) => {
                // Remove any commas and ensure only numbers and decimal point
                const cleaned = e.target.value.replace(/,/g, '').replace(/[^0-9.]/g, '');
                setAmount(cleaned);
              }}
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
          
          {/* Percentage Buttons */}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-500">Quick:</span>
            {[20, 50, 100].map((percent) => (
              <button
                key={percent}
                onClick={() => setPercentageAmount(percent)}
                className="px-3 py-1 text-xs font-medium rounded-lg bg-[#1a1a1a] hover:bg-[#252525] text-gray-400 hover:text-white transition-colors border border-[#2a2a2a] hover:border-[#5a8a3a]/30 min-h-[28px]"
              >
                {percent === 100 ? 'MAX' : `${percent}%`}
              </button>
            ))}
          </div>
          
          <p className={`text-xs mt-2 ${isInsufficientBalance() || isBelowMinimum() ? 'text-red-400' : 'text-gray-500'}`}>
            {activeTab === 'supply' && `Balance: ${balances[selectedToken.symbol] || '0.00'}`}
            {activeTab === 'withdraw' && (
              <>
                <span className="block">
                  Supplied: {formatTokenAmount(userCollateral[selectedToken.symbol] || 0n, selectedToken.decimals)} {selectedToken.symbol}
                </span>
                <span className="block text-[#5a8a3a]">
                  Available to withdraw: {formatTokenAmount(getMaxWithdrawable(selectedToken), selectedToken.decimals)} {selectedToken.symbol}
                </span>
              </>
            )}
            {activeTab === 'borrow' && (
              <>
                <span className="block">
                  Available: {formatUSD(Number(accountData.availableBorrowsUSD) / 1e18)} USD
                </span>
                <span className="block text-[#5a8a3a]">
                  ≈ {getAvailableBorrowInToken()} {selectedToken.symbol}
                </span>
              </>
            )}
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
          className="w-full gradient-bg text-white py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity shadow-md min-h-[44px] text-sm sm:text-base"
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

