import { describe, expect, it } from 'vitest';
import {
  SBTService,
  deriveTokenId,
  toAttestationHash,
  createEVMClient,
  getChainInfo,
  SBT_ABI,
} from '../src/evm';

describe('deriveTokenId', () => {
  it('returns a bigint from a UUID', () => {
    const id = deriveTokenId('550e8400-e29b-41d4-a716-446655440000');
    expect(typeof id).toBe('bigint');
    expect(id > 0n).toBe(true);
  });

  it('is deterministic', () => {
    const a = deriveTokenId('550e8400-e29b-41d4-a716-446655440000');
    const b = deriveTokenId('550e8400-e29b-41d4-a716-446655440000');
    expect(a).toBe(b);
  });

  it('produces different IDs for different inputs', () => {
    const a = deriveTokenId('550e8400-e29b-41d4-a716-446655440000');
    const b = deriveTokenId('660e8400-e29b-41d4-a716-446655440001');
    expect(a).not.toBe(b);
  });
});

describe('toAttestationHash', () => {
  it('passes through valid 0x-prefixed hex', () => {
    const hex = '0x' + 'ab'.repeat(32);
    const result = toAttestationHash(hex);
    expect(result).toBe(hex);
  });

  it('hashes non-hex strings to bytes32', () => {
    const result = toAttestationHash('some-attestation-data');
    expect(result).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });

  it('is deterministic for the same input', () => {
    const a = toAttestationHash('test-data');
    const b = toAttestationHash('test-data');
    expect(a).toBe(b);
  });
});

describe('SBTService', () => {
  const contractAddress = '0x1234567890abcdef1234567890abcdef12345678';
  const sbt = new SBTService({ contractAddress: contractAddress as `0x${string}` });

  it('exposes contract address', () => {
    // getAddress checksums the address
    expect(sbt.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it('defaults to Sepolia chain ID', () => {
    expect(sbt.chainId).toBe(11155111);
  });

  it('respects custom chain ID', () => {
    const mainnetSbt = new SBTService({
      contractAddress: contractAddress as `0x${string}`,
      chainId: 1,
    });
    expect(mainnetSbt.chainId).toBe(1);
  });

  describe('mint', () => {
    const to = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
    const tokenId = 42n;
    const attestationHash = ('0x' + 'ff'.repeat(32)) as `0x${string}`;

    it('returns success with encoded data (dry-run)', () => {
      const result = sbt.mint({
        to: to as `0x${string}`,
        tokenId,
        attestationHash,
        dryRun: true,
      });
      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(result.encodedData).toMatch(/^0x/);
      expect(result.tokenId).toBe('42');
      expect(result.txHash).toBeUndefined();
    });

    it('returns success in live mode (still encoded-only)', () => {
      const result = sbt.mint({
        to: to as `0x${string}`,
        tokenId,
        attestationHash,
        dryRun: false,
      });
      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(false);
      expect(result.encodedData).toMatch(/^0x/);
    });

    it('returns failure for invalid address', () => {
      const result = sbt.mint({
        to: '0xinvalid' as `0x${string}`,
        tokenId,
        attestationHash,
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('encodeBurn', () => {
    it('returns encoded burn calldata', () => {
      const data = sbt.encodeBurn(42n);
      expect(data).toMatch(/^0x/);
    });
  });
});

describe('createEVMClient', () => {
  it('creates a client for Sepolia', () => {
    const client = createEVMClient(11155111);
    expect(client).toBeDefined();
    expect(client.chain?.id).toBe(11155111);
  });

  it('creates a client for mainnet', () => {
    const client = createEVMClient(1);
    expect(client).toBeDefined();
    expect(client.chain?.id).toBe(1);
  });

  it('throws for unsupported chain', () => {
    expect(() => createEVMClient(999999)).toThrow(/Unsupported chain/);
  });
});

describe('getChainInfo', () => {
  it('returns Sepolia info', () => {
    const info = getChainInfo(11155111);
    expect(info.name).toContain('Sepolia');
    expect(info.isTestnet).toBe(true);
    expect(info.explorerUrl).toContain('sepolia');
  });

  it('returns mainnet info', () => {
    const info = getChainInfo(1);
    expect(info.name).toContain('Mainnet');
    expect(info.isTestnet).toBe(false);
  });
});

describe('SBT_ABI', () => {
  it('includes mint, burn, locked, ownerOf, attestationHash', () => {
    const names = SBT_ABI.filter((e) => e.type === 'function').map((e) => e.name);
    expect(names).toContain('mint');
    expect(names).toContain('burn');
    expect(names).toContain('locked');
    expect(names).toContain('ownerOf');
    expect(names).toContain('attestationHash');
  });
});
