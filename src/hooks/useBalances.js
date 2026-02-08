import { useState, useEffect } from 'react';
import { getAllBalances } from '../services/tokenService';
import { formatTokenAmount } from '../utils/formatters';
import { TOKENS } from '../constants/tokens';

export function useBalances(provider, address) {
  const [balances, setBalances] = useState({
    CAT: '0.00',
    DARC: '0.00',
    PANDA: '0.00',
    USDC: '0.00',
    LP_USDC_CAT: '0.00',
    LP_USDC_DARC: '0.00',
    LP_USDC_PANDA: '0.00',
  });

  const [rawBalances, setRawBalances] = useState({
    CAT: 0n,
    DARC: 0n,
    PANDA: 0n,
    USDC: 0n,
  });

  const fetchBalances = async () => {
    if (!provider || !address) {
      setBalances({
        CAT: '0.00',
        DARC: '0.00',
        PANDA: '0.00',
        USDC: '0.00',
        LP_USDC_CAT: '0.00',
        LP_USDC_DARC: '0.00',
        LP_USDC_PANDA: '0.00',
      });
      setRawBalances({
        CAT: 0n,
        DARC: 0n,
        PANDA: 0n,
        USDC: 0n,
      });
      return;
    }

    try {
      const raw = await getAllBalances(provider, address);
      setRawBalances(raw);

      setBalances({
        CAT: formatTokenAmount(raw.CAT, TOKENS.CAT.decimals),
        DARC: formatTokenAmount(raw.DARC, TOKENS.DARC.decimals),
        PANDA: formatTokenAmount(raw.PANDA, TOKENS.PANDA.decimals),
        USDC: formatTokenAmount(raw.USDC, TOKENS.USDC.decimals),
        LP_USDC_CAT: formatTokenAmount(raw.LP_USDC_CAT, 18),
        LP_USDC_DARC: formatTokenAmount(raw.LP_USDC_DARC, 18),
        LP_USDC_PANDA: formatTokenAmount(raw.LP_USDC_PANDA, 18),
      });
    } catch (error) {
      console.error('Error fetching balances in hook:', error);
      // Don't reset balances on error, keep previous values
    }
  };

  useEffect(() => {
    if (provider && address) {
      // Fetch immediately
      fetchBalances();
      // Then set up interval
      const interval = setInterval(fetchBalances, 60000); // Refresh every 60 seconds (reduced for bandwidth)
      return () => clearInterval(interval);
    } else {
      // Reset balances if no provider or address
      setBalances({
        CAT: '0.00',
        DARC: '0.00',
        PANDA: '0.00',
        USDC: '0.00',
        LP_USDC_CAT: '0.00',
        LP_USDC_DARC: '0.00',
        LP_USDC_PANDA: '0.00',
      });
      setRawBalances({
        CAT: 0n,
        DARC: 0n,
        PANDA: 0n,
        USDC: 0n,
      });
    }
  }, [provider, address]);

  return { balances, rawBalances, fetchBalances };
}

