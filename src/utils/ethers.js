import { ethers } from 'ethers';

// Convert viem PublicClient to ethers Provider
export function publicClientToProvider(publicClient) {
  if (!publicClient) return null;
  
  // Use the publicClient's transport if available, otherwise fallback to RPC URL
  try {
    // Try to get the RPC URL from the publicClient chain config
    const chain = publicClient.chain;
    if (chain && chain.rpcUrls && chain.rpcUrls.default && chain.rpcUrls.default.http) {
      const rpcUrl = Array.isArray(chain.rpcUrls.default.http) 
        ? chain.rpcUrls.default.http[0] 
        : chain.rpcUrls.default.http;
      return new ethers.JsonRpcProvider(rpcUrl);
    }
  } catch (error) {
    console.warn('Could not get RPC URL from publicClient, using fallback:', error);
  }
  
  // Fallback to Arc testnet RPC
  const rpcUrl = 'https://rpc.testnet.arc.network';
  return new ethers.JsonRpcProvider(rpcUrl);
}

// Custom Signer class that wraps walletClient
class WalletClientSigner {
  constructor(walletClient, provider) {
    this.walletClient = walletClient;
    this.provider = provider;
    this.account = walletClient.account;
  }

  getAddress() {
    return Promise.resolve(this.account.address);
  }

  async signMessage(message) {
    const messageBytes = typeof message === 'string' 
      ? ethers.toUtf8Bytes(message) 
      : message;
    return await this.walletClient.signMessage({
      account: this.account,
      message: messageBytes,
    });
  }

  async signTransaction(transaction) {
    // For wallet extensions, we typically don't sign transactions directly
    // Instead, we send them and let the wallet sign
    throw new Error('signTransaction not supported - use sendTransaction');
  }

  async sendTransaction(transaction) {
    const hash = await this.walletClient.sendTransaction({
      account: this.account,
      to: transaction.to,
      value: transaction.value ? BigInt(transaction.value.toString()) : 0n,
      data: transaction.data,
      gas: transaction.gasLimit ? BigInt(transaction.gasLimit.toString()) : undefined,
      gasPrice: transaction.gasPrice ? BigInt(transaction.gasPrice.toString()) : undefined,
    });

    // Return transaction response compatible with ethers
    return {
      hash,
      from: this.account.address,
      to: transaction.to,
      value: transaction.value || 0n,
      data: transaction.data,
      wait: async () => {
        const receipt = await this.walletClient.waitForTransactionReceipt({ hash });
        return {
          ...receipt,
          status: receipt.status === 'success' ? 1 : 0,
          blockNumber: receipt.blockNumber,
          blockHash: receipt.blockHash,
          transactionHash: receipt.transactionHash,
          from: receipt.from,
          to: receipt.to,
          gasUsed: receipt.gasUsed,
          effectiveGasPrice: receipt.gasPrice || 0n,
        };
      },
    };
  }

  connect(provider) {
    return new WalletClientSigner(this.walletClient, provider);
  }
}

// Convert viem WalletClient to ethers Signer
export function walletClientToSigner(walletClient, provider) {
  if (!walletClient || !provider || !walletClient.account) return null;
  return new WalletClientSigner(walletClient, provider);
}

