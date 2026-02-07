/**
 * EVM Chain Client Factory.
 *
 * Creates viem public clients for supported chains. Each client is configured
 * with the chain's default RPC endpoint. For production use, replace with
 * authenticated RPC URLs (Alchemy, Infura) via environment variables.
 */
import { createPublicClient, http, type PublicClient, type Chain } from 'viem';
import { sepolia, mainnet } from 'viem/chains';

const CHAIN_MAP: Record<number, Chain> = {
  1: mainnet,
  11155111: sepolia,
};

export interface EVMClientOptions {
  /** Override the default RPC URL for this chain */
  rpcUrl?: string;
}

/**
 * Create a viem PublicClient for the given chain ID.
 *
 * @throws Error if chainId is not supported
 */
export function createEVMClient(chainId: number, options?: EVMClientOptions): PublicClient {
  const chain = CHAIN_MAP[chainId];
  if (!chain) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  return createPublicClient({
    chain,
    transport: http(options?.rpcUrl),
  });
}

/**
 * Resolve chain info for display purposes.
 */
export function getChainInfo(chainId: number): {
  name: string;
  explorerUrl: string;
  isTestnet: boolean;
} {
  switch (chainId) {
    case 1:
      return { name: 'Ethereum Mainnet', explorerUrl: 'https://etherscan.io', isTestnet: false };
    case 11155111:
      return {
        name: 'Sepolia Testnet',
        explorerUrl: 'https://sepolia.etherscan.io',
        isTestnet: true,
      };
    default:
      return { name: `Chain ${chainId}`, explorerUrl: '', isTestnet: false };
  }
}
