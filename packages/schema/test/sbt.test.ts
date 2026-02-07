import { describe, expect, it } from 'vitest';
import {
  SoulboundTokenSchema,
  WalletConnectionSchema,
  SBTMintRequestSchema,
  SBTStatusSchema,
  SBTChainIdSchema,
} from '../src/verification';

describe('SBTChainIdSchema', () => {
  it('accepts Sepolia (11155111)', () => {
    expect(SBTChainIdSchema.parse(11155111)).toBe(11155111);
  });

  it('accepts mainnet (1)', () => {
    expect(SBTChainIdSchema.parse(1)).toBe(1);
  });

  it('rejects unsupported chain IDs', () => {
    expect(() => SBTChainIdSchema.parse(42)).toThrow();
    expect(() => SBTChainIdSchema.parse(0)).toThrow();
  });
});

describe('SBTStatusSchema', () => {
  it('accepts valid statuses', () => {
    expect(SBTStatusSchema.parse('pending')).toBe('pending');
    expect(SBTStatusSchema.parse('minted')).toBe('minted');
    expect(SBTStatusSchema.parse('revoked')).toBe('revoked');
    expect(SBTStatusSchema.parse('failed')).toBe('failed');
  });

  it('rejects invalid status', () => {
    expect(() => SBTStatusSchema.parse('burning')).toThrow();
  });
});

describe('SoulboundTokenSchema', () => {
  const validToken = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    profileId: '660e8400-e29b-41d4-a716-446655440001',
    attestationId: '770e8400-e29b-41d4-a716-446655440002',
    contractAddress: '0x1234567890abcdef1234567890abcdef12345678',
    tokenId: '42',
    chainId: 11155111,
    walletAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    status: 'minted' as const,
    mintedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('accepts a valid SBT record', () => {
    const result = SoulboundTokenSchema.parse(validToken);
    expect(result.tokenId).toBe('42');
    expect(result.chainId).toBe(11155111);
  });

  it('rejects invalid Ethereum address', () => {
    expect(() =>
      SoulboundTokenSchema.parse({ ...validToken, contractAddress: '0xinvalid' }),
    ).toThrow(/Invalid Ethereum address/);
  });

  it('rejects invalid wallet address', () => {
    expect(() =>
      SoulboundTokenSchema.parse({ ...validToken, walletAddress: 'not-an-address' }),
    ).toThrow(/Invalid Ethereum address/);
  });

  it('validates txHash format', () => {
    const withTx = {
      ...validToken,
      txHash: '0x' + 'ab'.repeat(32),
    };
    const result = SoulboundTokenSchema.parse(withTx);
    expect(result.txHash).toBeDefined();
  });

  it('rejects invalid txHash', () => {
    expect(() => SoulboundTokenSchema.parse({ ...validToken, txHash: '0xshort' })).toThrow(
      /Invalid transaction hash/,
    );
  });
});

describe('WalletConnectionSchema', () => {
  it('accepts a valid connection', () => {
    const result = WalletConnectionSchema.parse({
      profileId: '550e8400-e29b-41d4-a716-446655440000',
      walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: 11155111,
      signature: 'sig_abc123',
      message: 'Connect wallet to profile',
    });
    expect(result.walletAddress).toMatch(/^0x/);
  });

  it('rejects missing signature', () => {
    expect(() =>
      WalletConnectionSchema.parse({
        profileId: '550e8400-e29b-41d4-a716-446655440000',
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        chainId: 11155111,
        signature: '',
        message: 'msg',
      }),
    ).toThrow();
  });
});

describe('SBTMintRequestSchema', () => {
  it('defaults chainId to Sepolia', () => {
    const result = SBTMintRequestSchema.parse({
      attestationId: '550e8400-e29b-41d4-a716-446655440000',
      walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
    });
    expect(result.chainId).toBe(11155111);
    expect(result.dryRun).toBe(false);
  });

  it('accepts explicit dry-run flag', () => {
    const result = SBTMintRequestSchema.parse({
      attestationId: '550e8400-e29b-41d4-a716-446655440000',
      walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
      dryRun: true,
    });
    expect(result.dryRun).toBe(true);
  });
});
