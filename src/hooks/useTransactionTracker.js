import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useEthersProvider } from './useEthers';

// Global transaction tracker - shared across components
let transactionListeners = new Set();
let pendingTransactions = new Map();

export function useTransactionTracker() {
  const { address } = useAccount();
  const provider = useEthersProvider();
  const [transactions, setTransactions] = useState([]);

  // Function to add a pending transaction
  const addPendingTransaction = useCallback((txHash, type, data = {}) => {
    if (!txHash) return;
    
    const tx = {
      hash: txHash,
      type,
      status: 'pending',
      timestamp: Date.now(),
      blockNumber: null,
      ...data,
    };
    
    pendingTransactions.set(txHash, tx);
    updateTransactions();
    
    // Listen for transaction confirmation
    if (provider) {
      provider.getTransactionReceipt(txHash).then(receipt => {
        if (receipt) {
          updateTransactionStatus(txHash, 'confirmed', receipt.blockNumber);
        } else {
          // Poll for receipt
          const interval = setInterval(async () => {
            try {
              const receipt = await provider.getTransactionReceipt(txHash);
              if (receipt) {
                clearInterval(interval);
                updateTransactionStatus(txHash, 'confirmed', receipt.blockNumber);
              }
            } catch (error) {
              console.error('Error checking transaction receipt:', error);
            }
          }, 2000);
          
          // Clear after 5 minutes
          setTimeout(() => clearInterval(interval), 5 * 60 * 1000);
        }
      }).catch(error => {
        console.error('Error getting transaction receipt:', error);
      });
    }
  }, [provider]);

  const updateTransactionStatus = useCallback((txHash, status, blockNumber = null) => {
    const tx = pendingTransactions.get(txHash);
    if (tx) {
      tx.status = status;
      if (blockNumber) {
        tx.blockNumber = blockNumber;
      }
      pendingTransactions.set(txHash, tx);
      updateTransactions();
    }
  }, []);

  const updateTransactions = useCallback(() => {
    const txArray = Array.from(pendingTransactions.values());
    // Sort by timestamp (newest first)
    txArray.sort((a, b) => b.timestamp - a.timestamp);
    setTransactions(txArray);
    
    // Notify all listeners
    transactionListeners.forEach(listener => listener(txArray));
  }, []);

  // Function to add a confirmed transaction (from blockchain events)
  const addConfirmedTransaction = useCallback((txHash, type, data = {}) => {
    if (!txHash) return;
    
    // Don't add if already exists
    if (pendingTransactions.has(txHash)) {
      updateTransactionStatus(txHash, 'confirmed', data.blockNumber);
      return;
    }
    
    const tx = {
      hash: txHash,
      type,
      status: 'confirmed',
      timestamp: Date.now(),
      blockNumber: data.blockNumber || null,
      ...data,
    };
    
    pendingTransactions.set(txHash, tx);
    updateTransactions();
  }, [updateTransactionStatus]);

  // Clean up old transactions (older than 24 hours)
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      
      for (const [hash, tx] of pendingTransactions.entries()) {
        if (now - tx.timestamp > oneDay) {
          pendingTransactions.delete(hash);
        }
      }
      updateTransactions();
    }, 60000); // Check every minute
    
    return () => clearInterval(cleanup);
  }, [updateTransactions]);

  return {
    transactions,
    addPendingTransaction,
    addConfirmedTransaction,
    updateTransactionStatus,
  };
}

