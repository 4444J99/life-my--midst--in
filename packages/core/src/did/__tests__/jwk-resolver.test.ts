import { describe, it, expect } from 'vitest';
import { DidJwkResolver } from '../resolvers/jwk';
import * as jose from 'jose';

describe('DidJwkResolver', () => {
  const resolver = new DidJwkResolver();

  /** Helper to create a did:jwk from a JWK object */
  function toDid(jwk: Record<string, unknown>): string {
    return `did:jwk:${Buffer.from(JSON.stringify(jwk)).toString('base64url')}`;
  }

  it('resolves an Ed25519 (OKP) key', async () => {
    const { publicKey } = await jose.generateKeyPair('EdDSA', { extractable: true });
    const jwk = (await jose.exportJWK(publicKey)) as Record<string, unknown>;
    const did = toDid(jwk);

    const result = await resolver.resolve(did);

    expect(result.didResolutionMetadata.error).toBeUndefined();
    expect(result.didDocument).not.toBeNull();
    expect(result.didDocument!.id).toBe(did);
    expect(result.didDocument!.verificationMethod).toHaveLength(1);
    expect(result.didDocument!.verificationMethod![0]!.type).toBe('JsonWebKey2020');
    expect(result.didDocument!.verificationMethod![0]!.publicKeyJwk).toEqual(jwk);
    expect(result.didDocument!.authentication).toEqual([`${did}#0`]);
    expect(result.didDocument!.assertionMethod).toEqual([`${did}#0`]);
  });

  it('resolves an EC P-256 key with keyAgreement', async () => {
    const { publicKey } = await jose.generateKeyPair('ES256', { extractable: true });
    const jwk = (await jose.exportJWK(publicKey)) as Record<string, unknown>;
    const did = toDid(jwk);

    const result = await resolver.resolve(did);

    expect(result.didResolutionMetadata.error).toBeUndefined();
    expect(result.didDocument).not.toBeNull();
    // EC keys support key agreement
    expect(result.didDocument!.keyAgreement).toEqual([`${did}#0`]);
  });

  it('rejects malformed base64url', async () => {
    const result = await resolver.resolve('did:jwk:!!!not-base64url!!!');
    expect(result.didDocument).toBeNull();
    expect(result.didResolutionMetadata.error).toBe('invalidDid');
  });

  it('rejects JWK missing kty', async () => {
    const did = toDid({ x: 'abc', crv: 'Ed25519' });
    const result = await resolver.resolve(did);
    expect(result.didDocument).toBeNull();
    expect(result.didResolutionMetadata.error).toBe('invalidDid');
    expect(result.didResolutionMetadata.message).toContain('kty');
  });

  it('rejects unsupported key type', async () => {
    const did = toDid({ kty: 'oct', k: 'base64secret' });
    const result = await resolver.resolve(did);
    expect(result.didDocument).toBeNull();
    expect(result.didResolutionMetadata.error).toBe('invalidDid');
    expect(result.didResolutionMetadata.message).toContain('oct');
  });

  it('rejects non-did:jwk identifiers', async () => {
    const result = await resolver.resolve('did:web:example.com');
    expect(result.didDocument).toBeNull();
    expect(result.didResolutionMetadata.error).toBe('invalidDid');
  });

  it('rejects empty method-specific identifier', async () => {
    const result = await resolver.resolve('did:jwk:');
    expect(result.didDocument).toBeNull();
    expect(result.didResolutionMetadata.error).toBe('invalidDid');
  });

  it('round-trips: generated key resolves to same JWK', async () => {
    const { publicKey } = await jose.generateKeyPair('EdDSA', { extractable: true });
    const jwk = (await jose.exportJWK(publicKey)) as Record<string, unknown>;
    const did = toDid(jwk);

    const result = await resolver.resolve(did);
    const resolvedJwk = result.didDocument!.verificationMethod![0]!.publicKeyJwk;
    expect(resolvedJwk).toEqual(jwk);
  });
});
