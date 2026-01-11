import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Search } from 'lucide-react';

const TokenSelector = ({ 
  tokens, 
  selectedToken, 
  onSelect, 
  disabled = false, 
  className = '',
  balances = {} 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [imageErrors, setImageErrors] = useState(new Set());
  const modalRef = useRef(null);
  const inputRef = useRef(null);

  // Smart ordering: Balance first, then Alphabetical
  const sortedTokens = [...tokens].sort((a, b) => {
    const balA = parseFloat(balances[a.symbol] || '0');
    const balB = parseFloat(balances[b.symbol] || '0');
    if (balB !== balA) return balB - balA; 
    return a.symbol.localeCompare(b.symbol);
  });

  // Filter tokens based on search
  const filteredTokens = sortedTokens.filter(token => 
    token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    token.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Tokens with balances for quick select tabs
  const tokensWithBalances = tokens.filter(token => 
    balances[token.symbol] && parseFloat(balances[token.symbol]) > 0
  );

  // Open modal with animation
  const openModal = () => {
    if (disabled) return;
    setIsOpen(true);
    // Trigger animation after mount
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    });
  };

  // Close modal with animation
  const closeModal = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsOpen(false);
      setSearchQuery('');
    }, 250);
  };

  // Handle click outside modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        closeModal();
      }
    };

    // Handle escape key
    const handleEscape = (event) => {
      if (event.key === 'Escape') closeModal();
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      // Focus search input
      setTimeout(() => inputRef.current?.focus(), 100);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Handle token selection
  const handleSelect = (token) => {
    onSelect(token);
    closeModal();
  };

  // Format balance for display
  const formatBalance = (balance) => {
    if (!balance || balance === '0') return '0.00';
    
    // Remove commas and convert to number
    const num = parseFloat(String(balance).replace(/,/g, ''));
    
    if (isNaN(num) || num === 0) return '0.00';
    
    // Very small numbers
    if (num < 0.01) return num.toFixed(6);
    if (num < 1) return num.toFixed(4);
    
    // Billions (1,000,000,000+)
    if (num >= 1_000_000_000) {
      const val = num / 1_000_000_000;
      return (val % 1 === 0 ? val.toFixed(0) : val.toFixed(2)) + 'B';
    }
    
    // Millions (1,000,000+)
    if (num >= 1_000_000) {
      const val = num / 1_000_000;
      return (val % 1 === 0 ? val.toFixed(0) : val.toFixed(2)) + 'M';
    }
    
    // Thousands (10,000+) - show as "90k" format
    if (num >= 10_000) {
      const val = num / 1_000;
      return (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)) + 'k';
    }
    
    // Less than 10,000 - show full number with commas (e.g., 1,000)
    return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════
          TRIGGER BUTTON
          ═══════════════════════════════════════════════════════════════════ */}
      <div className={`relative ${className}`}>
        <button
          type="button"
          onClick={openModal}
          disabled={disabled}
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white flex items-center justify-between hover:bg-[#222222] hover:border-[#3a3a3a] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-2">
            {selectedToken ? (
              <>
                <img 
                  src={selectedToken.icon} 
                  alt={selectedToken.symbol} 
                  className="w-6 h-6 rounded-full"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <span className="font-semibold">{selectedToken.symbol}</span>
              </>
            ) : (
              <span className="text-gray-400">Select Token</span>
            )}
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL OVERLAY + DIALOG
          ═══════════════════════════════════════════════════════════════════ */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{
            // Overlay: rgba(0, 0, 0, 0.7) with backdrop blur
            backgroundColor: isAnimating ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0)',
            backdropFilter: isAnimating ? 'blur(8px)' : 'blur(0px)',
            WebkitBackdropFilter: isAnimating ? 'blur(8px)' : 'blur(0px)',
            transition: 'all 250ms ease-out',
          }}
        >
          {/* ═══════════════════════════════════════════════════════════════
              MODAL DIALOG
              - Centered modal (max-width: 460px)
              - Dark background (#1a1a1a)
              - Rounded corners (border-radius: 16px)
              - Padding: 24px
              - Box shadow for depth
              ═══════════════════════════════════════════════════════════════ */}
          <div 
            ref={modalRef}
            style={{
              opacity: isAnimating ? 1 : 0,
              transform: isAnimating 
                ? 'scale(1) translateY(0px)' 
                : 'scale(0.96) translateY(12px)',
              transition: 'all 250ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            className="w-full max-w-[460px] bg-[#1a1a1a] rounded-2xl p-6 border border-[#2a2a2a] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.05)]"
          >
            {/* ═══════════════════════════════════════════════════════════════
                HEADER
                - "Select Token" title (white, bold, 20px)
                - X close button on the right
                ═══════════════════════════════════════════════════════════════ */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-white">Select Token</h2>
              <button
                onClick={closeModal}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#2a2a2a] hover:bg-[#3a3a3a] text-gray-400 hover:text-white transition-all duration-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                SEARCH INPUT
                - Dark input field (#111111)
                - Placeholder: "Search Tokens"
                - Rounded corners (border-radius: 12px)
                - Padding: 12px 16px
                ═══════════════════════════════════════════════════════════════ */}
            <div className="relative mb-5">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Tokens"
                className="w-full bg-[#111111] border border-[#2a2a2a] rounded-xl pl-11 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#3a3a3a] focus:bg-[#151515] transition-all duration-200"
              />
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                TOKEN TABS SECTION ("YOUR TOKENS")
                - Gray uppercase label (12px)
                - Horizontal flex container for token tabs
                - Active: Green background (#5a8a3a), white text
                - Inactive: Dark gray (#3a3a3a), gray text
                - Pill shape (border-radius: 20px)
                ═══════════════════════════════════════════════════════════════ */}
            {tokensWithBalances.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  YOUR TOKENS
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {tokensWithBalances.map((token) => {
                    const isActive = selectedToken?.symbol === token.symbol;
                    return (
                      <button
                        key={token.symbol}
                        onClick={() => handleSelect(token)}
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-full font-medium transition-all duration-200 ${
                          isActive
                            ? 'bg-[#5a8a3a] text-white shadow-lg shadow-[#5a8a3a]/20'
                            : 'bg-[#3a3a3a] text-[#9ca3af] hover:bg-[#454545] hover:text-white'
                        }`}
                      >
                        <img 
                          src={token.icon} 
                          alt={token.symbol} 
                          className={`w-4 h-4 rounded-full ${isActive ? '' : 'opacity-70'}`}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <span className="text-[13px]">{token.symbol}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                TOKEN LIST
                - Scrollable container (max-height: 400px)
                - Each token card with dark background, rounded corners
                - Hover effect with subtle glow
                ═══════════════════════════════════════════════════════════════ */}
            <div className="max-h-[400px] overflow-y-auto pr-1 -mr-1 custom-scrollbar">
              <div className="space-y-3">
                {filteredTokens.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No tokens found</p>
                  </div>
                ) : (
                  filteredTokens.map((token) => {
                    const balance = balances[token.symbol] || '0';
                    const isSelected = selectedToken?.symbol === token.symbol;

                    return (
                      <button
                        key={token.symbol}
                        onClick={() => handleSelect(token)}
                        className={`w-full flex items-center justify-between p-4 rounded-xl transition-all duration-200 cursor-pointer group ${
                          isSelected 
                            ? 'bg-[#2a2a2a] border border-[#5a8a3a]/40 shadow-lg shadow-[#5a8a3a]/10' 
                            : 'bg-[#2a2a2a] border border-transparent hover:bg-[#353535] hover:border-[#3a3a3a]'
                        }`}
                      >
                        {/* Left side: Icon + Name */}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-[#3a3a3a] flex items-center justify-center flex-shrink-0">
                            {imageErrors.has(token.symbol) ? (
                              <span className="text-white font-bold text-lg">
                                {token.symbol[0] || '?'}
                              </span>
                            ) : (
                              <img 
                                src={token.icon} 
                                alt={token.symbol} 
                                className="w-full h-full object-cover"
                                onError={() => {
                                  setImageErrors(prev => new Set([...prev, token.symbol]));
                                }}
                              />
                            )}
                          </div>
                          <div className="text-left">
                            <div className="font-bold text-white text-base group-hover:text-[#5a8a3a] transition-colors duration-200">
                              {token.symbol}
                            </div>
                            <div className="text-sm text-gray-500">
                              {token.name}
                            </div>
                          </div>
                        </div>

                        {/* Right side: Balance */}
                        <div className="text-right">
                          <div className="font-bold text-white text-lg">
                            {formatBalance(balance)}
                          </div>
                          <div className="text-xs text-gray-500">
                            balance
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TokenSelector;
