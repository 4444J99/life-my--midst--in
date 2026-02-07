import { z } from 'zod';
import { CvEntityTypeSchema } from './base';

/**
 * Enumeration of CV entity verification statuses.
 *
 * Tracks the state of verification for individual claims in a CV.
 *
 * - `pending`: Verification requested but not yet completed
 * - `verified`: Verification completed successfully
 * - `rejected`: Verification failed or was denied
 * - `expired`: Was verified but has since expired
 * - `revoked`: Was verified but has been revoked by the verifier
 *
 * @example
 * const status = VerificationStatusSchema.parse("verified"); // ✓
 */
export const VerificationStatusSchema = z.enum([
  'pending',
  'verified',
  'rejected',
  'expired',
  'revoked',
]);

/**
 * Enumeration of verification sources.
 * Indicates how the verification was performed.
 *
 * - `manual`: Human reviewer verified the claim
 * - `automated`: Automated system verified (e.g., API check, certificate validation)
 * - `external`: Verified by external service (e.g., LinkedIn, GitHub API)
 *
 * @example
 * const source = VerificationSourceSchema.parse("external"); // ✓
 */
export const VerificationSourceSchema = z.enum(['manual', 'automated', 'external']);

/**
 * Schema for a verification log entry.
 *
 * Tracks the verification status of individual entities (e.g., a specific
 * job title, degree, certification). Each entity in a profile can have
 * multiple verification log entries tracking different verification attempts.
 *
 * This is the lightweight verification layer - direct checks without
 * blockchain. For blockchain-style verification, see AttestationBlock.
 *
 * Properties:
 * - `id`: UUID of this verification log
 * - `profileId`: UUID of the profile being verified
 * - `entityType`: Type of entity being verified (e.g., "experience", "education")
 * - `entityId`: UUID of the specific entity
 * - `credentialId`: Optional link to verifiable credential
 * - `status`: Current verification status
 * - `source`: How verification was performed
 * - `verifierLabel`: Human-readable description of verifier (e.g., "LinkedIn API")
 * - `notes`: Additional notes from verification process
 * - `metadata`: Extra data from verification (e.g., LinkedIn company ID)
 * - `createdAt`: ISO 8601 timestamp
 * - `updatedAt`: ISO 8601 timestamp
 *
 * @example
 * const log = VerificationLogSchema.parse({
 *   id: "850e8400-e29b-41d4-a716-446655440003",
 *   profileId: "550e8400-e29b-41d4-a716-446655440000",
 *   entityType: "experience",
 *   entityId: "950e8400-e29b-41d4-a716-446655440004",
 *   status: "verified",
 *   source: "external",
 *   verifierLabel: "LinkedIn API",
 *   createdAt: new Date().toISOString(),
 *   updatedAt: new Date().toISOString()
 * });
 */
export const VerificationLogSchema = z.object({
  id: z.string().uuid(),
  profileId: z.string().uuid(),
  entityType: CvEntityTypeSchema,
  entityId: z.string().uuid(),
  credentialId: z.string().uuid().optional(),
  status: VerificationStatusSchema,
  source: VerificationSourceSchema,
  verifierLabel: z.string().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Type representation of a verification log entry.
 */
export type VerificationLog = z.infer<typeof VerificationLogSchema>;

/**
 * Enumeration of attestation statuses.
 * For blockchain-style verification where cryptographic proofs are needed.
 *
 * - `self_attested`: User attested to their own claim
 * - `verified`: Third party has cryptographically verified the claim
 * - `revoked`: Was verified but has since been revoked
 *
 * @example
 * const status = AttestationStatusSchema.parse("verified"); // ✓
 */
export const AttestationStatusSchema = z.enum(['self_attested', 'verified', 'revoked']);

/**
 * Schema for a cryptographically signed attestation.
 *
 * Attestations are blockchain-inspired cryptographic proofs that a specific
 * claim in a CV is true. Unlike VerificationLog (lightweight, centralized),
 * Attestations use digital signatures and are suitable for immutable ledgers.
 *
 * An attestation answers: "Is it cryptographically provable that this person
 * made this claim and a specific verifier signed off on it?"
 *
 * Properties:
 * - `id`: UUID of this attestation
 * - `profileId`: UUID of the profile
 * - `entityType`: Type of entity being attested
 * - `entityId`: UUID of specific entity
 * - `signerDid`: W3C DID of the person/org who signed this attestation
 * - `signerLabel`: Human-readable name of signer (e.g., "Acme Corp HR")
 * - `status`: Attestation status (self_attested/verified/revoked)
 * - `hash`: Cryptographic hash of the claim
 * - `signature`: Digital signature (typically Ed25519 or similar)
 * - `payload`: Original claim data that was signed
 * - `timestamp`: ISO 8601 timestamp of signature
 * - `context`: Context for the attestation (e.g., "employment_verification")
 * - `expiresAt`: Optional expiration timestamp
 *
 * @example
 * const attestation = AttestationBlockSchema.parse({
 *   id: "950e8400-e29b-41d4-a716-446655440005",
 *   profileId: "550e8400-e29b-41d4-a716-446655440000",
 *   entityType: "experience",
 *   entityId: "950e8400-e29b-41d4-a716-446655440004",
 *   signerDid: "did:web:acme.com:hr-team",
 *   signerLabel: "Acme Corp HR",
 *   status: "verified",
 *   hash: "sha256:abc123...",
 *   signature: "sig_xyz...",
 *   timestamp: new Date().toISOString(),
 *   context: "employment_verification"
 * });
 */
export const AttestationBlockSchema = z.object({
  id: z.string().uuid(),
  profileId: z.string().uuid(),
  entityType: CvEntityTypeSchema,
  entityId: z.string().uuid(),
  signerDid: z.string(),
  signerLabel: z.string().optional(),
  status: AttestationStatusSchema.default('self_attested'),
  hash: z.string(),
  signature: z.string(),
  payload: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime(),
  context: z.string().optional(), // e.g., "employment_verification"
  expiresAt: z.string().datetime().optional(),
});

/**
 * Type representation of a cryptographic attestation.
 * Blockchain-inspired verified claims suitable for immutable ledgers.
 */
export type AttestationBlock = z.infer<typeof AttestationBlockSchema>;

// ─── Soulbound Token (SBT) Schemas ──────────────────────────────────────

/**
 * Supported EVM chain IDs for SBT operations.
 *
 * - `11155111`: Ethereum Sepolia testnet (primary target)
 * - `1`: Ethereum mainnet (future)
 */
export const SBTChainIdSchema = z.union([
  z.literal(11155111), // Sepolia
  z.literal(1), // Mainnet
]);

/**
 * SBT status lifecycle.
 *
 * - `pending`: Mint transaction submitted but not yet confirmed
 * - `minted`: Token exists on-chain and is bound to the wallet
 * - `revoked`: Token burned or invalidated by the issuer
 * - `failed`: Mint transaction failed (out of gas, revert, etc.)
 */
export const SBTStatusSchema = z.enum(['pending', 'minted', 'revoked', 'failed']);

/**
 * Schema for a Soulbound Token record.
 *
 * Links an off-chain AttestationBlock to an on-chain ERC-5192 token.
 * The token is non-transferable ("soulbound") and represents a verified
 * credential anchored to the holder's wallet address.
 *
 * Properties:
 * - `id`: UUID of this SBT record
 * - `profileId`: UUID of the profile that owns the attestation
 * - `attestationId`: UUID of the underlying AttestationBlock
 * - `contractAddress`: Ethereum address of the SBT contract
 * - `tokenId`: On-chain token ID (uint256 as string for precision)
 * - `chainId`: EVM chain where the token lives
 * - `walletAddress`: Ethereum address that holds the token
 * - `txHash`: Transaction hash of the mint/burn operation
 * - `status`: Current lifecycle status
 * - `mintedAt`: ISO 8601 timestamp of successful mint
 * - `burnedAt`: ISO 8601 timestamp of revocation/burn
 * - `metadata`: Extra on-chain or off-chain metadata (tokenURI contents, etc.)
 * - `createdAt`: Record creation timestamp
 * - `updatedAt`: Record update timestamp
 */
export const SoulboundTokenSchema = z.object({
  id: z.string().uuid(),
  profileId: z.string().uuid(),
  attestationId: z.string().uuid(),
  contractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  tokenId: z.string().min(1), // uint256 as string
  chainId: SBTChainIdSchema,
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  txHash: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash')
    .optional(),
  status: SBTStatusSchema,
  mintedAt: z.string().datetime().optional(),
  burnedAt: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Type representation of a Soulbound Token record.
 */
export type SoulboundToken = z.infer<typeof SoulboundTokenSchema>;

/**
 * Schema for wallet connection requests.
 *
 * Used when a user connects their Ethereum wallet to bind it to their profile.
 * The `signature` proves the user controls the wallet by signing a challenge.
 */
export const WalletConnectionSchema = z.object({
  profileId: z.string().uuid(),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  chainId: SBTChainIdSchema,
  signature: z.string().min(1, 'Signature is required'),
  message: z.string().min(1, 'Signed message is required'),
});

/**
 * Type representation of a wallet connection request.
 */
export type WalletConnection = z.infer<typeof WalletConnectionSchema>;

/**
 * Schema for SBT mint requests.
 *
 * Initiates the minting of a Soulbound Token for a verified attestation.
 * The attestation must already be in "verified" status.
 */
export const SBTMintRequestSchema = z.object({
  attestationId: z.string().uuid(),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  chainId: SBTChainIdSchema.default(11155111), // Default to Sepolia
  dryRun: z.boolean().default(false),
});
