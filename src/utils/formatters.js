import { formatUnits, parseUnits } from 'ethers';

export function formatTokenAmount(amount, decimals = 18) {
  if (!amount) return '0.00';
  try {
    const formatted = formatUnits(amount, decimals);
    const num = parseFloat(formatted);
    if (num === 0) return '0.00';
    if (num < 0.01) return '< 0.01';
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
  } catch (error) {
    return '0.00';
  }
}

export function formatUSD(amount) {
  if (!amount) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function parseTokenAmount(amount, decimals = 18) {
  if (!amount || amount === '') return 0n;
  try {
    return parseUnits(amount.toString(), decimals);
  } catch (error) {
    return 0n;
  }
}

export function formatAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function getChainName(chainId) {
  if (chainId === 5042002) return 'Arc Testnet';
  return 'Unknown';
}

// Format large numbers (1M, 100k, 1k)
export function formatCompactNumber(amount) {
  if (!amount || amount === 0) return '0';
  const num = typeof amount === 'bigint' ? Number(amount) : amount;
  
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2).replace(/\.?0+$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(2).replace(/\.?0+$/, '') + 'k';
  }
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

