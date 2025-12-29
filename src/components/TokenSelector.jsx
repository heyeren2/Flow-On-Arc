import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const TokenSelector = ({ tokens, selectedToken, onSelect, disabled = false, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (token) => {
    onSelect(token);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white flex items-center justify-between hover:bg-[#222222] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-2">
          {selectedToken && (
            <>
              <img 
                src={selectedToken.icon} 
                alt={selectedToken.symbol} 
                className="w-6 h-6 rounded-full"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <span className="font-medium">{selectedToken.symbol}</span>
            </>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-lg max-h-60 overflow-auto">
          {tokens.map((token) => (
            <button
              key={token.symbol}
              type="button"
              onClick={() => handleSelect(token)}
              className="w-full px-4 py-3 flex items-center gap-2 hover:bg-[#222222] transition-colors text-left"
            >
              <img 
                src={token.icon} 
                alt={token.symbol} 
                className="w-6 h-6 rounded-full"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <span className="font-medium text-white">{token.symbol}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TokenSelector;

