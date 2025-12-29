import React, { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle2, Clock, ChevronRight, Gift } from 'lucide-react';
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
  const [gasEstimate, setGasEstimate] = useState('< $0.01');
  const [estimatedTime, setEstimatedTime] = useState('~12s');

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setStepStatus({ approve: 'pending', execute: 'pending' });
      setTransactionHash(null);
    }
  }, [isOpen]);

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

  const handleApprove = async () => {
    if (!onApprove) return;
    
    setStepStatus({ ...stepStatus, approve: 'processing' });
    try {
      const tx = await onApprove();
      if (tx?.hash) {
        setTransactionHash(tx.hash);
      }
      if (tx?.wait) {
        await tx.wait();
      }
      setStepStatus({ ...stepStatus, approve: 'completed' });
      setCurrentStep(1);
    } catch (error) {
      console.error('Approval error:', error);
      setStepStatus({ ...stepStatus, approve: 'error' });
    }
  };

  const handleExecute = async () => {
    if (!onExecute) return;
    
    setStepStatus({ ...stepStatus, execute: 'processing' });
    try {
      const tx = await onExecute();
      if (tx?.hash) {
        setTransactionHash(tx.hash);
      }
      if (tx?.wait) {
        await tx.wait();
      }
      setStepStatus({ ...stepStatus, execute: 'completed' });
      
      // Close modal after short delay on success
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Execution error:', error);
      setStepStatus({ ...stepStatus, execute: 'error' });
    }
  };

  const handleCombined = async () => {
    if (requiresApproval && currentStep === 0 && stepStatus.approve === 'pending') {
      await handleApprove();
    } else if (currentStep === (requiresApproval ? 1 : 0) && stepStatus.execute === 'pending') {
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

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="glass-card p-6 max-w-md w-full mx-4 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <h2 className="text-xl font-bold text-white mb-6">Transaction Details</h2>

        {/* Transaction Overview */}
        {transactionType !== 'faucet' && (
          <div className="mb-6">
            {/* For Swap: Show two tokens with arrow */}
            {transactionType === 'swap' ? (
              <div className="flex items-center justify-between mb-4">
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
                  <p className="text-xs text-gray-400 mb-1">Arc Testnet</p>
                  <p className="text-sm font-semibold text-white">
                    {fromAmount} {fromToken?.symbol || 'Token'}
                  </p>
                </div>

                <ChevronRight className="w-5 h-5 text-gray-400 mx-2" />

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
                  <p className="text-xs text-gray-400 mb-1">Arc Testnet</p>
                  <p className="text-sm font-semibold text-white">
                    {toAmount || '0'} {toToken?.symbol || 'Token'}
                  </p>
                </div>
              </div>
            ) : (
              // For Supply/Withdraw/Borrow/Repay: Show only ONE token centered
              <div className="mb-4">
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
                  <p className="text-xs text-gray-400 mb-1">Arc Testnet</p>
                  <p className="text-sm font-semibold text-white">
                    {fromAmount} {fromToken?.symbol || 'Token'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Faucet Overview */}
        {transactionType === 'faucet' && (
          <div className="mb-6">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <div className="w-12 h-12 rounded-full bg-[#5a8a3a]/20 flex items-center justify-center">
                  <Gift className="w-8 h-8 text-[#5a8a3a]" />
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-1">Arc Testnet</p>
              <p className="text-sm font-semibold text-white">{fromAmount}</p>
            </div>
          </div>
        )}

        {/* Transaction Steps */}
        {shouldShowSteps && (
          <div className="mb-6 space-y-4">
            {steps.map((step, index) => (
              <div key={step.key} className="flex items-center gap-3">
                {getStepIcon(index)}
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{step.label}</p>
                  {index === currentStep && stepStatus[step.key] === 'processing' && (
                    <p className="text-xs text-gray-400 mt-1">Processing in wallet...</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Transaction Parameters */}
        <div className="mb-6 space-y-3">
          {transactionParams.slippage !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Max Slippage</span>
              <span className="text-xs text-white">Auto {transactionParams.slippage}%</span>
            </div>
          )}
          {transactionParams.exchangeRate && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Exchange Rate</span>
              <span className="text-xs text-white">{transactionParams.exchangeRate}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-400">Est. Time</span>
            </div>
            <span className="text-xs text-white">{estimatedTime}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Est. Gas Fee</span>
            <span className="text-xs text-white">{gasEstimate}</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleCombined}
          disabled={!canProceed() || stepStatus.approve === 'processing' || stepStatus.execute === 'processing'}
          className="w-full bg-[#1a1a1a] hover:bg-[#222222] text-white py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

