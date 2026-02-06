import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DidWebResolver, didWebToUrl } from '../resolvers/web';

describe('didWebToUrl', () => {
  it('resolves a simple domain to .well-known/did.json', () => {
    expect(didWebToUrl('did:web:example.com')).toBe('https://example.com/.well-known/did.json');
  });

  it('resolves a domain with path segments', () => {
    expect(didWebToUrl('did:web:example.com:user:alice')).toBe(
      'https://example.com/user/alice/did.json',
    );
  });

  it('resolves a domain with percent-encoded port', () => {
    expect(didWebToUrl('did:web:example.com%3A3000')).toBe(
      'https://example.com:3000/.well-known/did.json',
    );
  });

  it('returns null for non-did:web identifiers', () => {
    expect(didWebToUrl('did:key:z6MkhaXg')).toBeNull();
  });

  it('returns null for empty method-specific id', () => {
    expect(didWebToUrl('did:web:')).toBeNull();
  });
});

describe('DidWebResolver', () => {
  const mockFetch = vi.fn();
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    mockFetch.mockReset();
  });

  it('resolves a valid did:web document', async () => {
    const didDoc = {
      '@context': 'https://www.w3.org/ns/did/v1',
      id: 'did:web:example.com',
      verificationMethod: [],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(didDoc),
    });

    const resolver = new DidWebResolver();
    const result = await resolver.resolve('did:web:example.com');

    expect(result.didDocument).toEqual(didDoc);
    expect(result.didResolutionMetadata.error).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com/.well-known/did.json',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('returns error for non-matching document id', async () => {
    const didDoc = {
      '@context': 'https://www.w3.org/ns/did/v1',
      id: 'did:web:wrong.com',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(didDoc),
    });

    const resolver = new DidWebResolver();
    const result = await resolver.resolve('did:web:example.com');

    expect(result.didDocument).toBeNull();
    expect(result.didResolutionMetadata.error).toBe('invalidDidDocument');
  });

  it('returns error for HTTP failures', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

    const resolver = new DidWebResolver();
    const result = await resolver.resolve('did:web:missing.com');

    expect(result.didDocument).toBeNull();
    expect(result.didResolutionMetadata.error).toBe('notFound');
  });

  it('returns error for network failures', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const resolver = new DidWebResolver();
    const result = await resolver.resolve('did:web:down.com');

    expect(result.didDocument).toBeNull();
    expect(result.didResolutionMetadata.error).toBe('networkError');
  });

  it('caches successful resolutions', async () => {
    const didDoc = {
      '@context': 'https://www.w3.org/ns/did/v1',
      id: 'did:web:cached.com',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(didDoc),
    });

    const resolver = new DidWebResolver({ cacheTtlMs: 60_000 });

    await resolver.resolve('did:web:cached.com');
    await resolver.resolve('did:web:cached.com');

    // Should only have fetched once due to caching
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('evicts cache entries', async () => {
    const didDoc = {
      '@context': 'https://www.w3.org/ns/did/v1',
      id: 'did:web:evicted.com',
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(didDoc),
    });

    const resolver = new DidWebResolver({ cacheTtlMs: 60_000 });

    await resolver.resolve('did:web:evicted.com');
    resolver.evict('did:web:evicted.com');
    await resolver.resolve('did:web:evicted.com');

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
