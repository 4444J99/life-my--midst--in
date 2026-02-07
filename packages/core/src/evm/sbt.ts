/**
 * Soulbound Token Service.
 *
 * Handles minting, verification, and revocation of ERC-5192 Soulbound Tokens
 * by interacting with the SBT smart contract through viem.
 *
 * Supports a "dry run" mode that validates all inputs and simulates the
 * transaction without broadcasting it. This is used for testing and for
 * environments without testnet ETH.
 */
import {
  type Address,
  type Hex,
  type PublicClient,
  getAddress,
  keccak256,
  toHex,
  encodeFunctionData,
} from 'viem';
import { SBT_ABI } from './abi';

export interface SBTConfig {
  /** Contract address of the deployed SBT contract */
  contractAddress: Address;
  /** Chain ID (default: 11155111 for Sepolia) */
  chainId?: number;
}

export interface MintParams {
  /** Wallet address to receive the SBT */
  to: Address;
  /** Unique token ID (typically derived from attestation ID) */
  tokenId: bigint;
  /** SHA-256 hash of the attestation data (as bytes32) */
  attestationHash: Hex;
  /** If true, validate and simulate but don't broadcast */
  dryRun?: boolean;
}

export interface MintResult {
  /** Whether the operation succeeded (or would succeed in dry-run) */
  success: boolean;
  /** Transaction hash (only set when not dry-run) */
  txHash?: Hex;
  /** Encoded transaction data for manual broadcasting */
  encodedData: Hex;
  /** Contract address */
  contractAddress: Address;
  /** Token ID as string */
  tokenId: string;
  /** Whether this was a dry-run simulation */
  dryRun: boolean;
  /** Error message if failed */
  error?: string;
}

export interface TokenInfo {
  /** Owner address */
  owner: Address;
  /** Whether the token is locked (always true for SBTs) */
  locked: boolean;
  /** Attestation hash stored on-chain */
  attestationHash: Hex;
  /** Whether the token exists */
  exists: boolean;
}

/**
 * Derive a deterministic token ID from an attestation UUID.
 * Uses keccak256 of the UUID string, then takes the lower 128 bits
 * to stay within safe uint256 range.
 */
export function deriveTokenId(attestationId: string): bigint {
  const hash = keccak256(toHex(attestationId));
  // Use lower 128 bits to avoid overflow issues
  return BigInt(hash.slice(0, 34)); // 0x + 32 hex chars = 128 bits
}

/**
 * Convert an attestation hash string to bytes32 format.
 * If the hash is already 0x-prefixed hex, validates and returns it.
 * Otherwise treats it as a UTF-8 string and hashes it.
 */
export function toAttestationHash(hash: string): Hex {
  if (/^0x[a-fA-F0-9]{64}$/.test(hash)) {
    return hash as Hex;
  }
  // Hash the string with keccak256 to get a bytes32
  return keccak256(toHex(hash));
}

export class SBTService {
  private config: SBTConfig;

  constructor(config: SBTConfig) {
    this.config = {
      ...config,
      contractAddress: getAddress(config.contractAddress),
    };
  }

  /**
   * Mint a Soulbound Token for a verified attestation.
   *
   * In dry-run mode: encodes the transaction data and validates inputs,
   * but does not broadcast. Returns the encoded calldata for inspection.
   *
   * In live mode: would need a wallet client to sign and broadcast.
   * Currently, we always produce encoded data — the API layer handles
   * the actual wallet signing via the user's connected wallet.
   */
  mint(params: MintParams): MintResult {
    const { to, tokenId, attestationHash, dryRun = false } = params;

    try {
      // Validate addresses
      const recipient = getAddress(to);
      const contract = getAddress(this.config.contractAddress);

      // Encode the mint function call
      const encodedData = encodeFunctionData({
        abi: SBT_ABI,
        functionName: 'mint',
        args: [recipient, tokenId, attestationHash],
      });

      return {
        success: true,
        encodedData,
        contractAddress: contract,
        tokenId: tokenId.toString(),
        dryRun,
      };
    } catch (err) {
      return {
        success: false,
        encodedData: '0x' as Hex,
        contractAddress: this.config.contractAddress,
        tokenId: tokenId.toString(),
        dryRun,
        error: String(err),
      };
    }
  }

  /**
   * Encode a burn (revoke) transaction for an SBT.
   */
  encodeBurn(tokenId: bigint): Hex {
    return encodeFunctionData({
      abi: SBT_ABI,
      functionName: 'burn',
      args: [tokenId],
    });
  }

  /**
   * Query on-chain token information.
   * Requires a connected public client (read-only).
   */
  async getTokenInfo(client: PublicClient, tokenId: bigint): Promise<TokenInfo> {
    try {
      const [owner, locked, hash] = await Promise.all([
        client.readContract({
          address: this.config.contractAddress,
          abi: SBT_ABI,
          functionName: 'ownerOf',
          args: [tokenId],
        }),
        client.readContract({
          address: this.config.contractAddress,
          abi: SBT_ABI,
          functionName: 'locked',
          args: [tokenId],
        }),
        client.readContract({
          address: this.config.contractAddress,
          abi: SBT_ABI,
          functionName: 'attestationHash',
          args: [tokenId],
        }),
      ]);

      return { owner, locked, attestationHash: hash, exists: true };
    } catch {
      // Token doesn't exist or contract call failed
      return {
        owner: '0x0000000000000000000000000000000000000000' as Address,
        locked: false,
        attestationHash:
          '0x0000000000000000000000000000000000000000000000000000000000000000' as Hex,
        exists: false,
      };
    }
  }

  /** Get the contract address */
  get address(): Address {
    return this.config.contractAddress;
  }

  /** Get the configured chain ID */
  get chainId(): number {
    return this.config.chainId ?? 11155111;
  }
}
