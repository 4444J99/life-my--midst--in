import { describe, it, expect, beforeEach } from 'vitest';
import { DIDResolverRegistry, parseDID, resetResolverRegistry } from '../resolver-registry';
import { MemoryDIDRegistry } from '../registry';

describe('parseDID', () => {
  it('parses a did:key', () => {
    expect(parseDID('did:key:z6MkhaXg')).toEqual({ method: 'key', id: 'z6MkhaXg' });
  });

  it('parses a did:web with path', () => {
    expect(parseDID('did:web:example.com:user:alice')).toEqual({
      method: 'web',
      id: 'example.com:user:alice',
    });
  });

  it('returns null for malformed DIDs', () => {
    expect(parseDID('notadid')).toBeNull();
    expect(parseDID('did:')).toBeNull();
    expect(parseDID('did:key')).toBeNull();
  });
});

describe('DIDResolverRegistry', () => {
  let localRegistry: MemoryDIDRegistry;
  let resolverRegistry: DIDResolverRegistry;

  beforeEach(() => {
    resetResolverRegistry();
    localRegistry = new MemoryDIDRegistry();
    resolverRegistry = new DIDResolverRegistry({ localRegistry });
  });

  it('lists built-in methods', () => {
    const methods = resolverRegistry.listMethods();
    expect(methods).toContain('key');
    expect(methods).toContain('web');
  });

  it('resolves did:key through local registry', async () => {
    const did = 'did:key:z6MkTest';
    await localRegistry.register(did, {
      '@context': 'https://www.w3.org/ns/did/v1',
      id: did,
    });

    const result = await resolverRegistry.resolve(did);
    expect(result.didDocument?.id).toBe(did);
    expect(result.didResolutionMetadata.error).toBeUndefined();
  });

  it('returns notFound for unregistered did:key', async () => {
    const result = await resolverRegistry.resolve('did:key:z6MkUnknown');
    expect(result.didDocument).toBeNull();
    expect(result.didResolutionMetadata.error).toBe('notFound');
  });

  it('returns error for malformed DID', async () => {
    const result = await resolverRegistry.resolve('garbage');
    expect(result.didDocument).toBeNull();
    expect(result.didResolutionMetadata.error).toBe('invalidDid');
  });

  it('falls back to local registry for unknown methods', async () => {
    const did = 'did:custom:abc123';
    await localRegistry.register(did, {
      '@context': 'https://www.w3.org/ns/did/v1',
      id: did,
    });

    const result = await resolverRegistry.resolve(did);
    expect(result.didDocument?.id).toBe(did);
  });

  it('supports registering custom method resolvers', async () => {
    resolverRegistry.registerMethod('test', {
      resolve: (did: string) =>
        Promise.resolve({
          didDocument: { '@context': 'https://www.w3.org/ns/did/v1', id: did },
          didDocumentMetadata: {},
          didResolutionMetadata: {},
        }),
    });

    const result = await resolverRegistry.resolve('did:test:hello');
    expect(result.didDocument?.id).toBe('did:test:hello');
  });
});
