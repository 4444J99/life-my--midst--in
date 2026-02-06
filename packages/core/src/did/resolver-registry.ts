/**
 * DID Resolver Registry
 *
 * Routes DID resolution to method-specific resolvers.
 * Supports did:key (via local registry), did:web (via HTTP fetch), and custom resolvers.
 */

import type { DIDResolutionResult, IDIDRegistry } from './registry';
import { getRegistry } from './registry';
import { DidWebResolver, type DidWebResolverOptions } from './resolvers/web';

export interface DIDResolver {
  resolve(did: string): Promise<DIDResolutionResult>;
}

/**
 * Parse a DID string into its method and method-specific-id components.
 * Returns null if the DID is malformed.
 */
export function parseDID(did: string): { method: string; id: string } | null {
  if (!did.startsWith('did:')) return null;
  const parts = did.split(':');
  if (parts.length < 3) return null;
  const method = parts[1];
  if (!method) return null;
  return { method, id: parts.slice(2).join(':') };
}

/**
 * Wraps the IDIDRegistry as a DIDResolver so it can be used
 * as a method resolver for did:key.
 */
class RegistryResolver implements DIDResolver {
  constructor(private registry: IDIDRegistry) {}

  resolve(did: string): Promise<DIDResolutionResult> {
    return this.registry.resolve(did);
  }
}

export interface ResolverRegistryOptions {
  /** The local DID registry for did:key and locally-registered DIDs. */
  localRegistry?: IDIDRegistry;
  /** Options for the did:web resolver. */
  webResolverOptions?: DidWebResolverOptions;
}

export class DIDResolverRegistry implements DIDResolver {
  private resolvers = new Map<string, DIDResolver>();
  private localRegistry: IDIDRegistry;

  constructor(options: ResolverRegistryOptions = {}) {
    this.localRegistry = options.localRegistry ?? getRegistry();

    // Register built-in resolvers
    this.resolvers.set('key', new RegistryResolver(this.localRegistry));
    this.resolvers.set('web', new DidWebResolver(options.webResolverOptions));
  }

  /** Register a custom resolver for a DID method. */
  registerMethod(method: string, resolver: DIDResolver): void {
    this.resolvers.set(method, resolver);
  }

  /** Resolve any DID by routing to the appropriate method resolver. */
  async resolve(did: string): Promise<DIDResolutionResult> {
    const parsed = parseDID(did);
    if (!parsed) {
      return {
        didDocument: null,
        didDocumentMetadata: {},
        didResolutionMetadata: {
          error: 'invalidDid',
          message: `Malformed DID: ${did}`,
        },
      };
    }

    const resolver = this.resolvers.get(parsed.method);
    if (!resolver) {
      // Fallback: try the local registry (handles any DID that was manually registered)
      return this.localRegistry.resolve(did);
    }

    return resolver.resolve(did);
  }

  /** Get the resolver for a specific method, if registered. */
  getMethodResolver(method: string): DIDResolver | undefined {
    return this.resolvers.get(method);
  }

  /** List all registered methods. */
  listMethods(): string[] {
    return Array.from(this.resolvers.keys());
  }
}

/**
 * Singleton resolver registry.
 */
let globalResolverRegistry: DIDResolverRegistry | null = null;

export function getResolverRegistry(options?: ResolverRegistryOptions): DIDResolverRegistry {
  if (!globalResolverRegistry) {
    globalResolverRegistry = new DIDResolverRegistry(options);
  }
  return globalResolverRegistry;
}

export function resetResolverRegistry(): void {
  globalResolverRegistry = null;
}
