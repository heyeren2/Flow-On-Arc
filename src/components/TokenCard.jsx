import React from 'react';
import { formatUSD } from '../utils/formatters';
import { formatUnits } from 'ethers';

const TokenCard = ({ token, balance, rawBalance, decimals, price }) => {
  // Calculate value using rawBalance to avoid parsing issues with formatted strings
  let value = 0;
  if (rawBalance && rawBalance !== 0n && decimals && price) {
    try {
      const balanceNumber = parseFloat(formatUnits(rawBalance, decimals));
      if (!isNaN(balanceNumber)) {
        value = balanceNumber * price;
      }
    } catch (error) {
      console.error('Error calculating token card value:', error);
      value = 0;
    }
  }

  return (
    <div className="glass-card p-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <img 
          src={token.icon} 
          alt={token.symbol} 
          className="w-8 h-8 rounded-full"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
        <div>
          <p className="font-semibold text-white">{token.symbol}</p>
          <p className="text-sm text-gray-400">{balance}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-semibold text-white">{formatUSD(value)}</p>
      </div>
    </div>
  );
};

export default TokenCard;

