import { usePublicClient, useWalletClient } from 'wagmi';
import { publicClientToProvider, walletClientToSigner } from '../utils/ethers';
import { useMemo } from 'react';
import { ethers } from 'ethers';

export function useEthersProvider() {
  const publicClient = usePublicClient();
  return useMemo(() => {
    // Try to get provider from publicClient first
    const provider = publicClientToProvider(publicClient);
    if (provider) return provider;
    
    // Fallback: create provider directly from RPC URL if publicClient is not available
    // This ensures we always have a provider to read blockchain data
    const rpcUrl = 'https://rpc.testnet.arc.network';
    return new ethers.JsonRpcProvider(rpcUrl);
  }, [publicClient]);
}

export function useEthersSigner() {
  const { data: walletClient } = useWalletClient();
  const provider = useEthersProvider();
  
  return useMemo(() => {
    if (!walletClient || !provider) return null;
    return walletClientToSigner(walletClient, provider);
  }, [walletClient, provider]);
}

