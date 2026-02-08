import { useState, useEffect } from 'react';
import { getAllTokenPrices } from '../services/priceService';

export function useTokenPrices(provider) {
  const [prices, setPrices] = useState({
    CAT: 0,
    DARC: 0,
    PANDA: 0,
    USDC: 1.0,
  });

  const fetchPrices = async () => {
    if (!provider) {
      setPrices({
        CAT: 0,
        DARC: 0,
        PANDA: 0,
        USDC: 1.0,
      });
      return;
    }

    try {
      const tokenPrices = await getAllTokenPrices(provider);
      setPrices(tokenPrices);
    } catch (error) {
      console.error('Error fetching token prices:', error);
    }
  };

  useEffect(() => {
    fetchPrices();
    // Refresh prices every 2 minutes (reduced for bandwidth - prices don't change that fast)
    const interval = setInterval(fetchPrices, 120000);
    return () => clearInterval(interval);
  }, [provider]);

  return { prices, fetchPrices };
}

