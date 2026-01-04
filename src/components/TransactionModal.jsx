import React, { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle2, Clock, ChevronRight, Gift, Rocket, ExternalLink } from 'lucide-react';
import { ARC_TESTNET } from '../constants/contracts';
import { formatUSD } from '../utils/formatters';

const TransactionModal = ({
  isOpen,
  onClose,
  transactionType,
  fromToken,
  toToken,
  fromAmount,
  toAmount,
  onApprove,
  onExecute,
  requiresApproval = true,
  transactionParams = {},
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepStatus, setStepStatus] = useState({
    approve: 'pending', // pending, processing, completed, error
    execute: 'pending',
  });
  const [transactionHash, setTransactionHash] = useState(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [gasEstimate, setGasEstimate] = useState('< $0.01');
  const [estimatedTime, setEstimatedTime] = useState('~12s');
  // Save amounts when modal opens so they persist after parent clears them
  const [savedFromAmount, setSavedFromAmount] = useState('');
  const [savedToAmount, setSavedToAmount] = useState('');

  // Reset state and save amounts ONLY when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setStepStatus({ approve: 'pending', execute: 'pending' });
      setTransactionHash(null);
      setIsConfirmed(false);
      // Save amounts immediately when modal opens
      setSavedFromAmount(fromAmount || '');
      setSavedToAmount(toAmount || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // Only depend on isOpen - ignore amount changes

  const getTransactionLabel = () => {
    switch (transactionType) {
      case 'swap':
        return 'Swap';
      case 'supply':
        return 'Supply Collateral';
      case 'withdraw':
        return 'Withdraw Collateral';
      case 'borrow':
        return 'Borrow';
      case 'repay':
        return 'Repay';
      case 'faucet':
        return 'Claim Tokens';
      default:
        return 'Transaction';
    }
  };

  const getStepLabels = () => {
    if (!requiresApproval) {
      return [{ label: getTransactionLabel(), key: 'execute' }];
    }

    switch (transactionType) {
      case 'swap':
        return [
          { label: `Approve ${fromToken?.symbol || 'Token'} for swap`, key: 'approve' },
          { label: 'Swap tokens', key: 'execute' },
        ];
      case 'supply':
        return [
          { label: `Approve ${fromToken?.symbol || 'Token'} for supply`, key: 'approve' },
          { label: 'Supply collateral', key: 'execute' },
        ];
      case 'withdraw':
        return [{ label: 'Withdraw collateral', key: 'execute' }];
      case 'borrow':
        return [{ label: 'Borrow tokens', key: 'execute' }];
      case 'repay':
        return [
          { label: `Approve ${fromToken?.symbol || 'Token'} for repay`, key: 'approve' },
          { label: 'Repay tokens', key: 'execute' },
        ];
      case 'faucet':
        return [{ label: 'Claim tokens', key: 'execute' }];
      default:
        return [{ label: getTransactionLabel(), key: 'execute' }];
    }
  };

  const steps = getStepLabels();
  const shouldShowSteps = steps.length > 1;

  const handleExecute = async () => {
    if (!onExecute) return;
    
    setStepStatus(prev => ({ ...prev, execute: 'processing' }));
    try {
      const tx = await onExecute();
      if (tx?.hash) {
        setTransactionHash(tx.hash);
      }
      
      // onExecute handles the tx.wait() and notification through showTransaction
      // so when it returns, the transaction is already confirmed.
      
      setStepStatus(prev => ({ ...prev, execute: 'completed' }));
      setIsConfirmed(true);
      
      // Close modal after 15 seconds
      setTimeout(() => {
        onClose();
      }, 15000);
    } catch (error) {
      console.error('Execution error:', error);
      setStepStatus(prev => ({ ...prev, execute: 'error' }));
    }
  };

  const handleApprove = async () => {
    if (!onApprove) return;
    
    setStepStatus(prev => ({ ...prev, approve: 'processing' }));
    try {
      const tx = await onApprove();
      if (tx?.hash) {
        setTransactionHash(tx.hash);
      }
      if (tx?.wait) {
        await tx.wait();
      }
      setStepStatus(prev => ({ ...prev, approve: 'completed' }));
      setCurrentStep(1);
      
      // Automatically proceed to execute after approval
      await handleExecute();
    } catch (error) {
      console.error('Approval error:', error);
      setStepStatus(prev => ({ ...prev, approve: 'error' }));
    }
  };

  const handleCombined = async () => {
    if (requiresApproval && currentStep === 0 && stepStatus.approve === 'pending') {
      await handleApprove();
    } else if (stepStatus.execute === 'pending') {
      await handleExecute();
    }
  };

  const getStepIcon = (stepIndex) => {
    const step = steps[stepIndex];
    const status = stepStatus[step.key];
    
    if (stepIndex < currentStep) {
      return <CheckCircle2 className="w-5 h-5 text-[#5a8a3a]" />;
    }
    if (stepIndex === currentStep) {
      if (status === 'processing') {
        return <Loader2 className="w-5 h-5 text-[#5a8a3a] animate-spin" />;
      }
      if (status === 'completed') {
        return <CheckCircle2 className="w-5 h-5 text-[#5a8a3a]" />;
      }
      if (status === 'error') {
        return <X className="w-5 h-5 text-red-400" />;
      }
    }
    return <div className="w-5 h-5 rounded-full border-2 border-gray-600" />;
  };

  const canProceed = () => {
    if (!requiresApproval) {
      return stepStatus.execute === 'pending';
    }
    if (currentStep === 0) {
      return stepStatus.approve === 'pending';
    }
    return stepStatus.execute === 'pending' && stepStatus.approve === 'completed';
  };

  const getButtonText = () => {
    if (!requiresApproval) {
      if (stepStatus.execute === 'processing') {
        return 'Processing...';
      }
      return getTransactionLabel();
    }

    if (currentStep === 0) {
      if (stepStatus.approve === 'processing') {
        return 'Approving...';
      }
      return `Approve ${fromToken?.symbol || 'Token'} & ${getTransactionLabel()}`;
    }

    if (stepStatus.execute === 'processing') {
      return 'Processing...';
    }
    return getTransactionLabel();
  };

  if (!isOpen) return null;

  // Transaction Confirmed Screen (Relay Style)
  if (isConfirmed) {
    return (
      <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/90 backdrop-blur-md">
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-8 max-w-md w-full mx-4 relative rounded-[32px] shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in duration-300">
          
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-white">Transaction Details</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              <div className="w-20 h-20 bg-[#5a8a3a] rounded-2xl flex items-center justify-center transform rotate-12 shadow-lg shadow-[#5a8a3a]/20">
                <Rocket className="w-10 h-10 text-white -rotate-12" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#10B981] rounded-full border-4 border-[#0a0a0a] flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white">Transaction Completed</h3>
          </div>

          {/* Asset Summary Box (Relay Style) */}
          <div className="bg-[#111111] border border-[#1a1a1a] rounded-2xl p-5 mb-8 text-left space-y-4">
            {transactionType === 'swap' ? (
              <>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Sent</p>
                  <div className="flex items-center gap-3">
                    {fromToken?.icon ? (
                      <img src={fromToken.icon} alt="" className="w-6 h-6 rounded-full" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-[#5a8a3a]/20 flex items-center justify-center">
                        <Gift className="w-3.5 h-3.5 text-[#5a8a3a]" />
                      </div>
                    )}
                    <span className="text-lg font-bold text-white">{savedFromAmount} {fromToken?.symbol}</span>
                  </div>
                </div>
                
                <div className="h-px bg-[#1a1a1a] w-full" />

                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Received</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {toToken?.icon ? (
                        <img src={toToken.icon} alt="" className="w-6 h-6 rounded-full" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-[#5a8a3a]/20 flex items-center justify-center">
                          <Gift className="w-3.5 h-3.5 text-[#5a8a3a]" />
                        </div>
                      )}
                      <span className="text-lg font-bold text-white">
                        {savedToAmount} {toToken?.symbol}
                      </span>
                    </div>
                    {transactionHash && (
                      <span className="text-[10px] font-mono text-[#5a8a3a] bg-[#5a8a3a]/10 px-2 py-1 rounded-md">
                        {transactionHash.slice(0, 6)}...{transactionHash.slice(-4)}
                      </span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                  {transactionType === 'supply' ? 'Supplied' :
                   transactionType === 'borrow' ? 'Borrowed' :
                   transactionType === 'repay' ? 'Repaid' :
                   transactionType === 'withdraw' ? 'Withdrawn' :
                   transactionType === 'faucet' ? 'Claimed' : 'Amount'}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {fromToken?.icon ? (
                      <img src={fromToken.icon} alt="" className="w-6 h-6 rounded-full" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-[#5a8a3a]/20 flex items-center justify-center">
                        {transactionType === 'faucet' ? (
                          <Gift className="w-3.5 h-3.5 text-[#5a8a3a]" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full bg-[#5a8a3a]" />
                        )}
                      </div>
                    )}
                    <span className="text-lg font-bold text-white">
                      {savedFromAmount} {fromToken?.symbol || ''}
                    </span>
                  </div>
                  {transactionHash && (
                    <span className="text-[10px] font-mono text-[#5a8a3a] bg-[#5a8a3a]/10 px-2 py-1 rounded-md">
                      {transactionHash.slice(0, 6)}...{transactionHash.slice(-4)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <a
              href={`${ARC_TESTNET.blockExplorers.default.url}/tx/${transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-[#1a1a1a] hover:bg-[#222222] text-white py-4 rounded-2xl font-bold text-sm transition-all border border-[#2a2a2a] uppercase tracking-wider"
            >
              View Details
            </a>
            
            <button
              onClick={onClose}
              className="w-full bg-[#5a8a3a] hover:bg-[#6b9a4a] text-white py-4 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-[#5a8a3a]/20 uppercase tracking-wider"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/90 backdrop-blur-md">
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-6 max-w-md w-full mx-4 relative rounded-[32px] shadow-[0_0_50px_rgba(0,0,0,0.8)]">
        {/* Header with Close Button */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Transaction Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Transaction Overview - Wrapped in bordered card like Relay */}
        {transactionType !== 'faucet' && (
          <div className="mb-6 bg-[#111111] border border-[#2a2a2a] rounded-2xl p-4">
            {/* For Swap: Show two tokens with arrow */}
            {transactionType === 'swap' ? (
              <div className="flex items-center justify-between">
                <div className="flex-1 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <div className="w-12 h-12 rounded-full bg-[#5a8a3a]/20 flex items-center justify-center">
                      {fromToken?.icon ? (
                        <img src={fromToken.icon} alt={fromToken.symbol} className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#5a8a3a]" />
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">Arc Testnet</p>
                  <p className="text-base font-bold text-white">
                    {fromAmount} {fromToken?.symbol || 'Token'}
                  </p>
                </div>

                <div className="mx-3 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>

                <div className="flex-1 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <div className="w-12 h-12 rounded-full bg-[#5a8a3a]/20 flex items-center justify-center">
                      {toToken?.icon ? (
                        <img src={toToken.icon} alt={toToken.symbol} className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#5a8a3a]" />
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">Arc Testnet</p>
                  <p className="text-base font-bold text-white">
                    {toAmount || '0'} {toToken?.symbol || 'Token'}
                  </p>
                </div>
              </div>
            ) : (
              // For Supply/Withdraw/Borrow/Repay: Show only ONE token centered
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <div className="w-12 h-12 rounded-full bg-[#5a8a3a]/20 flex items-center justify-center">
                    {fromToken?.icon ? (
                      <img src={fromToken.icon} alt={fromToken.symbol} className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#5a8a3a]" />
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mb-1">Arc Testnet</p>
                <p className="text-base font-bold text-white">
                  {fromAmount} {fromToken?.symbol || 'Token'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Faucet Overview - Wrapped in bordered card */}
        {transactionType === 'faucet' && (
          <div className="mb-6 bg-[#111111] border border-[#2a2a2a] rounded-2xl p-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <div className="w-12 h-12 rounded-full bg-[#5a8a3a]/20 flex items-center justify-center">
                  <Gift className="w-8 h-8 text-[#5a8a3a]" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-1">Arc Testnet</p>
              <p className="text-base font-bold text-white">{fromAmount}</p>
            </div>
          </div>
        )}

        {/* Transaction Steps - Wrapped in bordered card like Relay */}
        {shouldShowSteps && (
          <div className="mb-6 bg-[#111111] border border-[#2a2a2a] rounded-2xl p-4">
            <div className="relative">
              {/* Vertical connecting line */}
              <div className="absolute left-[10px] top-6 bottom-6 w-[2px] bg-[#2a2a2a]" />
              
              <div className="space-y-4">
                {steps.map((step, index) => (
                  <div key={step.key} className="flex items-center gap-3 relative">
                    <div className="z-10 bg-[#111111]">
                      {getStepIcon(index)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{step.label}</p>
                      {index === currentStep && stepStatus[step.key] === 'processing' && (
                        <p className="text-xs text-[#5a8a3a] mt-1">Confirm in wallet...</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Single Step Transaction - For transactions without approval */}
        {!shouldShowSteps && (
          <div className="mb-6 bg-[#111111] border border-[#2a2a2a] rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="z-10">
                {stepStatus.execute === 'processing' ? (
                  <Loader2 className="w-5 h-5 text-[#5a8a3a] animate-spin" />
                ) : stepStatus.execute === 'completed' ? (
                  <CheckCircle2 className="w-5 h-5 text-[#5a8a3a]" />
                ) : stepStatus.execute === 'error' ? (
                  <X className="w-5 h-5 text-red-400" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-600" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{getTransactionLabel()}</p>
                {stepStatus.execute === 'processing' && (
                  <p className="text-xs text-[#5a8a3a] mt-1">Confirm in wallet...</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Transaction Parameters - Wrapped in bordered card */}
        <div className="mb-6 bg-[#111111] border border-[#2a2a2a] rounded-2xl p-4 space-y-3">
          {transactionParams.slippage !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Max Slippage</span>
              <span className="text-xs text-white font-medium">Auto {transactionParams.slippage}%</span>
            </div>
          )}
          {transactionParams.exchangeRate && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Exchange Rate</span>
              <span className="text-xs text-white font-medium">{transactionParams.exchangeRate}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-500">Est. Time</span>
            </div>
            <span className="text-xs text-white font-medium">{estimatedTime}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Est. Gas Fee</span>
            <span className="text-xs text-white font-medium">{gasEstimate}</span>
          </div>
        </div>

        {/* Action Button - Relay Style */}
        <button
          onClick={handleCombined}
          disabled={!canProceed() || stepStatus.approve === 'processing' || stepStatus.execute === 'processing'}
          className="w-full bg-[#5a8a3a] hover:bg-[#6b9a4a] text-white py-4 rounded-2xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#5a8a3a]/20 uppercase tracking-wider"
        >
          {getButtonText()}
        </button>

        {/* Transaction Hash Link */}
        {transactionHash && (
          <a
            href={`${ARC_TESTNET.blockExplorers.default.url}/tx/${transactionHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-xs text-[#5a8a3a] hover:text-[#6b9a4a] mt-4 transition-colors"
          >
            View on Explorer
          </a>
        )}
      </div>
    </div>
  );
};

export default TransactionModal;
