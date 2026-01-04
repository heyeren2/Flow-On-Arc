import React, { useEffect, useState } from 'react';
import { X, Bell, Rocket, Shield, Zap, ChevronDown, ChevronUp } from 'lucide-react';

const ChangelogModal = ({ isOpen, onClose }) => {
  const [expandedVersion, setExpandedVersion] = useState('v1.3.0');

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const updates = [
    {
      version: "v1.3.0",
      date: "January 4, 2026",
      changes: [
        { type: 'feature', text: 'Live Protocol Stats: TVL, Volume, and Transaction Count now track real blockchain data from smart contract events.' },
        { type: 'feature', text: 'AMM Pool TVL: Total Value Locked now includes liquidity from all AMM pools (CAT/USDC, DARC/USDC, PANDA/USDC).' },
        { type: 'feature', text: 'Manual Refresh: Added a refresh button for instant stats updates in Protocol Stats section.' },
        { type: 'improvement', text: 'Reliable Data Fetching: Implemented retry logic with caching to ensure consistent and accurate stats display.' },
        { type: 'improvement', text: 'Transaction Modal: Enhanced with Relay Link-style cards showing transaction steps and token amounts.' },
        { type: 'improvement', text: 'Feedback Form: Migrated to Tally.so for a better feedback experience.' },
        { type: 'fix', text: 'Fixed event queries to use proper block ranges, resolving volume and transaction tracking issues.' },
        { type: 'fix', text: 'Fixed balance parsing for large amounts with comma formatting (e.g., 1,000+ tokens).' }
      ]
    },
    {
      version: "v1.2.0",
      date: "January 2, 2026",
      changes: [
        { type: 'feature', text: 'Full USDC Integration: Swapping, Lending, and Borrowing now support USDC (6 decimals) as a core asset.' },
        { type: 'improvement', text: 'Real-time Account Health: Lending Pool now calculates real Collateral, Debt, and Health Factor based on asset prices.' },
        { type: 'improvement', text: 'Official Testnet Pricing: Synchronized all platform math with target prices ($0.015 CAT, $0.04 DARC, $0.02 PANDA).' },
        { type: 'improvement', text: 'Contract Infrastructure: Migrated all systems to new optimized smart contract addresses.' }
      ]
    },
    {
      version: "v1.1.0",
      date: "December 31, 2025",
      changes: [
        { type: 'improvement', text: 'Enhanced Token Selector modal with forest green theme and smoother animations.' },
        { type: 'improvement', text: 'Implemented compact balance formatting (k, M, B) for better readability.' },
        { type: 'improvement', text: 'Added loading spinners to Price Charts and Activity tab.' },
        { type: 'fix', text: 'Fixed balance parsing errors for tokens with comma-formatted balances.' }
      ]
    },
    {
      version: "v1.0.0",
      date: "December 20, 2025",
      changes: [
        { type: 'feature', text: 'Initial launch of Flow On Arc on Testnet.' },
        { type: 'feature', text: 'Full support for Swap, Lend/Borrow, and Faucet functionality.' },
        { type: 'improvement', text: 'Integrated RainbowKit for seamless wallet connections.' },
        { type: 'improvement', text: 'Real-time price feeds for all supported assets.' }
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md" 
        onClick={onClose} 
      />
      
      {/* Modal */}
      <div className="relative z-10 w-full max-w-[552px] bg-[#0a0a0a] border border-[#1a1a1a] rounded-[40px] shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#5a8a3a] p-5 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
          <div className="flex items-center gap-3 text-white relative z-10">
            <div className="p-2 bg-white/20 rounded-xl">
              <Bell className="w-5 h-5 fill-white" />
            </div>
            <div>
              <h2 className="font-bold text-xl leading-tight">Changelog</h2>
              <p className="text-white/70 text-xs">Latest updates and improvements</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white/20 rounded-full transition-all relative z-10 group"
          >
            <X className="w-5 h-5 text-white group-hover:rotate-90 transition-transform" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar bg-gradient-to-b from-[#0a0a0a] to-[#121212] min-h-[575px]">
          <div className="space-y-4">
            {updates.map((update, idx) => (
              <div 
                key={update.version}
                className={`border border-[#1a1a1a] rounded-2xl overflow-hidden transition-all duration-300 ${
                  expandedVersion === update.version ? 'bg-[#1a1a1a]/40 ring-1 ring-[#5a8a3a]/30' : 'bg-[#111111]'
                }`}
              >
                <button
                  onClick={() => setExpandedVersion(expandedVersion === update.version ? null : update.version)}
                  className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold px-2 py-1 rounded-md ${
                      idx === 0 ? 'bg-[#5a8a3a]/20 text-[#5cb849]' : 'bg-gray-800 text-gray-400'
                    }`}>
                      {update.version}
                    </span>
                    <span className="text-xs text-gray-500">{update.date}</span>
                  </div>
                  {expandedVersion === update.version ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </button>

                {expandedVersion === update.version && (
                  <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="h-px bg-[#1a1a1a] mb-4" />
                    <ul className="space-y-4">
                      {update.changes.map((change, cIdx) => (
                        <li key={cIdx} className="flex gap-3 text-sm">
                          <div className="mt-0.5 shrink-0">
                            {change.type === 'feature' && (
                              <div className="p-1.5 bg-blue-500/10 rounded-lg">
                                <Rocket className="w-3.5 h-3.5 text-blue-400" />
                              </div>
                            )}
                            {change.type === 'improvement' && (
                              <div className="p-1.5 bg-yellow-500/10 rounded-lg">
                                <Zap className="w-3.5 h-3.5 text-yellow-400" />
                              </div>
                            )}
                            {change.type === 'fix' && (
                              <div className="p-1.5 bg-[#5a8a3a]/10 rounded-lg">
                                <Shield className="w-3.5 h-3.5 text-[#5cb849]" />
                              </div>
                            )}
                          </div>
                          <span className="text-gray-400 leading-relaxed">{change.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1a1a1a] bg-[#0a0a0a] text-center">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">
            Stay updated for more features
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChangelogModal;
