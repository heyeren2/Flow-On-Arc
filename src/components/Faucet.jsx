import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useEthersProvider, useEthersSigner } from '../hooks/useEthers';
import { useBalances } from '../hooks/useBalances';
import { useNotifications } from './NotificationProvider';
import { getClaimableAmounts, claimTokens } from '../services/faucetService';
import { formatTokenAmount } from '../utils/formatters';
import { TIER_INFO } from '../constants/tierInfo';
import { TOKENS } from '../constants/tokens';
import { Gift, Clock } from 'lucide-react';
import TransactionModal from './TransactionModal';

const Faucet = () => {
  const { address, isConnected } = useAccount();
  const provider = useEthersProvider();
  const signer = useEthersSigner();
  const { balances, fetchBalances } = useBalances(provider, address);
  const { showTransaction } = useNotifications();

  const [claimable, setClaimable] = useState({
    catAmount: 0n,
    darcAmount: 0n,
    pandaAmount: 0n,
    tier: 0,
    nextClaimTime: 0,
    canClaim: false,
  });
  const [claiming, setClaiming] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (provider && address) {
      fetchClaimable();
      const interval = setInterval(fetchClaimable, 10000); // Refresh every 10 seconds
      return () => clearInterval(interval);
    } else {
      setClaimable({
        catAmount: 0n,
        darcAmount: 0n,
        pandaAmount: 0n,
        tier: 0,
        nextClaimTime: 0,
        canClaim: false,
      });
    }
  }, [provider, address]);

  useEffect(() => {
    if (claimable.nextClaimTime > 0) {
      const interval = setInterval(() => {
        const now = Math.floor(Date.now() / 1000);
        const remaining = claimable.nextClaimTime - now;
        if (remaining <= 0) {
          setTimeRemaining('');
          fetchClaimable();
        } else {
          const hours = Math.floor(remaining / 3600);
          const minutes = Math.floor((remaining % 3600) / 60);
          const seconds = remaining % 60;
          setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [claimable.nextClaimTime]);

  const fetchClaimable = async () => {
    if (!provider || !address) return;
    const data = await getClaimableAmounts(provider, address);
    setClaimable(data);
  };

  const handleClaim = async () => {
    if (!signer || !claimable.canClaim) return;
    setShowModal(true);
  };

  const handleExecuteClaim = async () => {
    if (!signer || !claimable.canClaim) return;
    const tx = await claimTokens(signer);
    
    const totalAmount = formatTokenAmount(claimable.catAmount, TOKENS.CAT.decimals) + ' CAT, ' +
                      formatTokenAmount(claimable.darcAmount, TOKENS.DARC.decimals) + ' DARC, ' +
                      formatTokenAmount(claimable.pandaAmount, TOKENS.PANDA.decimals) + ' PANDA';
    
    await showTransaction('claim', Promise.resolve(tx), {
      pendingMessage: 'Claiming tokens from faucet...',
      successMessage: `Successfully claimed ${totalAmount}`,
      transactionData: {
        token: 'Multiple',
        amount: totalAmount,
        tier: claimable.tier,
      },
    });
    
    fetchClaimable();
    fetchBalances();
    setShowModal(false);
    
    return tx;
  };

  const tierInfo = TIER_INFO[claimable.tier] || TIER_INFO[0];
  const usdcBalance = parseFloat(balances.USDC || '0');

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold gradient-text">Faucet</h1>

      {/* Tier Info */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Your Tier</h2>
          <div
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: `${tierInfo.color}20`, color: tierInfo.color }}
          >
            {tierInfo.name}
          </div>
        </div>
        <p className="text-gray-400 text-sm mb-2">
          USDC Balance: {balances.USDC || '0.00'} USDC
        </p>
        <p className="text-gray-400 text-sm">
          Required for next tier: {TIER_INFO[Math.min(claimable.tier + 1, 3)].threshold} USDC
        </p>
      </div>

      {/* Claimable Amounts */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-xl font-semibold mb-4 text-white">Claimable Tokens</h2>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={TOKENS.CAT.icon} alt="CAT" className="w-8 h-8" />
              <span className="font-medium text-white">CAT</span>
            </div>
            <span className="font-semibold text-white">
              {formatTokenAmount(claimable.catAmount, TOKENS.CAT.decimals)}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={TOKENS.DARC.icon} alt="DARC" className="w-8 h-8" />
              <span className="font-medium text-white">DARC</span>
            </div>
            <span className="font-semibold text-white">
              {formatTokenAmount(claimable.darcAmount, TOKENS.DARC.decimals)}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={TOKENS.PANDA.icon} alt="PANDA" className="w-8 h-8" />
              <span className="font-medium text-white">PANDA</span>
            </div>
            <span className="font-semibold text-white">
              {formatTokenAmount(claimable.pandaAmount, TOKENS.PANDA.decimals)}
            </span>
          </div>
        </div>

        {timeRemaining && (
          <div className="flex items-center gap-2 text-sm text-gray-400 mt-4">
            <Clock className="w-4 h-4" />
            <span>Next claim in: {timeRemaining}</span>
          </div>
        )}

        <button
          onClick={handleClaim}
          disabled={!isConnected || !claimable.canClaim || claiming}
          className="w-full gradient-bg text-white py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-md"
        >
          <Gift className="w-5 h-5" />
          {claiming
            ? 'Claiming...'
            : !isConnected
            ? 'Connect Wallet'
            : !claimable.canClaim
            ? timeRemaining ? `Cooldown: ${timeRemaining}` : 'Cannot Claim'
            : 'Claim Tokens'}
        </button>
      </div>

      {/* Tier Information */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-semibold mb-4 text-white">Tier Information</h2>
        <div className="space-y-3">
          {Object.values(TIER_INFO).map((tier, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg glass-card"
            >
              <div>
                <p className="font-medium" style={{ color: tier.color }}>
                  {tier.name}
                </p>
                <p className="text-sm text-gray-400">
                  {tier.threshold} USDC • {tier.reward.toLocaleString()} tokens
                </p>
              </div>
              <p className="text-sm text-gray-400">
                {tier.cooldown / 3600}h cooldown
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        transactionType="faucet"
        fromToken={null}
        toToken={null}
        fromAmount={formatTokenAmount(claimable.catAmount, TOKENS.CAT.decimals) + ' CAT, ' +
                   formatTokenAmount(claimable.darcAmount, TOKENS.DARC.decimals) + ' DARC, ' +
                   formatTokenAmount(claimable.pandaAmount, TOKENS.PANDA.decimals) + ' PANDA'}
        toAmount=""
        onApprove={undefined}
        onExecute={handleExecuteClaim}
        requiresApproval={false}
        transactionParams={{}}
      />
    </div>
  );
};

export default Faucet;

