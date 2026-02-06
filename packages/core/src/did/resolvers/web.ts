/**
 * did:web DID Method Resolver
 *
 * Resolves `did:web:example.com` by fetching `https://example.com/.well-known/did.json`
 * Resolves `did:web:example.com:path:to:resource` by fetching `https://example.com/path/to/resource/did.json`
 *
 * @see https://w3c-ccg.github.io/did-method-web/
 */

import type { DIDDocument, DIDResolutionResult } from '../registry';

export interface DidWebResolverOptions {
  /** Cache TTL in milliseconds. Default: 5 minutes. */
  cacheTtlMs?: number;
  /** Fetch timeout in milliseconds. Default: 10 seconds. */
  timeoutMs?: number;
}

interface CacheEntry {
  result: DIDResolutionResult;
  expiresAt: number;
}

/**
 * Convert a did:web identifier to the HTTPS URL where the DID document lives.
 *
 * did:web:example.com              → https://example.com/.well-known/did.json
 * did:web:example.com:user:alice   → https://example.com/user/alice/did.json
 * did:web:example.com%3A3000       → https://example.com:3000/.well-known/did.json
 */
export function didWebToUrl(did: string): string | null {
  if (!did.startsWith('did:web:')) return null;

  const methodSpecific = did.slice('did:web:'.length);
  if (!methodSpecific) return null;

  const parts = methodSpecific.split(':');
  const domain = decodeURIComponent(parts[0] ?? '');
  if (!domain) return null;

  if (parts.length === 1) {
    return `https://${domain}/.well-known/did.json`;
  }

  const pathSegments = parts.slice(1).map(decodeURIComponent);
  return `https://${domain}/${pathSegments.join('/')}/did.json`;
}

export class DidWebResolver {
  private cache = new Map<string, CacheEntry>();
  private cacheTtlMs: number;
  private timeoutMs: number;

  constructor(options: DidWebResolverOptions = {}) {
    this.cacheTtlMs = options.cacheTtlMs ?? 5 * 60 * 1000;
    this.timeoutMs = options.timeoutMs ?? 10_000;
  }

  async resolve(did: string): Promise<DIDResolutionResult> {
    // Check cache first
    const cached = this.cache.get(did);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result;
    }

    const url = didWebToUrl(did);
    if (!url) {
      return this.errorResult('invalidDid', `Cannot parse did:web identifier: ${did}`);
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      let response: Response;
      try {
        response = await fetch(url, {
          method: 'GET',
          headers: { Accept: 'application/did+json, application/json' },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      if (!response.ok) {
        return this.errorResult('notFound', `HTTP ${String(response.status)} fetching ${url}`);
      }

      const body = (await response.json()) as DIDDocument;

      // Basic validation: the document ID must match the DID
      if (body.id !== did) {
        return this.errorResult(
          'invalidDidDocument',
          `DID document id "${body.id}" does not match requested DID "${did}"`,
        );
      }

      const result: DIDResolutionResult = {
        didDocument: body,
        didDocumentMetadata: {
          created: body.created,
          updated: body.updated,
        },
        didResolutionMetadata: {},
      };

      // Cache successful resolutions
      this.cache.set(did, { result, expiresAt: Date.now() + this.cacheTtlMs });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('AbortError') || message.includes('abort')) {
        return this.errorResult('timeout', `Timeout resolving ${did}`);
      }
      return this.errorResult('networkError', `Failed to fetch DID document: ${message}`);
    }
  }

  /** Evict a specific DID from cache. */
  evict(did: string): void {
    this.cache.delete(did);
  }

  /** Clear the entire cache. */
  clearCache(): void {
    this.cache.clear();
  }

  private errorResult(error: string, message: string): DIDResolutionResult {
    return {
      didDocument: null,
      didDocumentMetadata: {},
      didResolutionMetadata: { error, message },
    };
  }
}
