import React, { useEffect } from 'react';
import { X, Coins, Clock } from 'lucide-react';

const FaucetClaimedModal = ({ isOpen, onClose }) => {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[8px] transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-[440px] bg-[#0a0a0a] border border-[#1a1a1a] rounded-[40px] shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col transition-all duration-300 scale-100 opacity-100">

        {/* Header/Close button only */}
        <div className="flex justify-end p-4 absolute right-2 top-2 z-20">
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-500 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 pt-12 text-center flex flex-col items-center relative z-10">
          {/* Faucet Icon */}
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-3xl bg-[#1a1a1a] border border-[#1a1a1a] flex items-center justify-center relative z-10 shadow-lg shadow-black/50">
              <Coins className="w-10 h-10 text-[#5cb849]" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-[#111] border border-[#1a1a1a] p-1.5 rounded-full z-20">
              <Clock className="w-4 h-4 text-[#5cb849]" />
            </div>
          </div>

          {/* Modal Titles */}
          <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">
            Faucet Refilling
          </h2>

          <p className="text-gray-400 text-sm leading-relaxed max-w-sm mb-8">
            The Faucet has all been claimed, come back later when the Faucet has been refilled for claiming.
          </p>

          {/* Close / Action Button */}
          <button
            onClick={onClose}
            className="w-full py-4 rounded-2xl font-semibold bg-[#5cb849] hover:bg-[#6bc956] text-white transition-all duration-200 shadow-lg shadow-[#5cb849]/20 active:scale-[0.98]"
          >
            Got it, thanks!
          </button>
        </div>

        {/* Footer info line */}
        <div className="p-4 border-t border-[#1a1a1a] bg-[#111111]/30 text-center shrink-0">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">
            Flow Faucet
          </p>
        </div>
      </div>
    </div>
  );
};

export default FaucetClaimedModal;
