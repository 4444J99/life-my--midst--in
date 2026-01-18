/**
 * DID Registry
 * 
 * Manages decentralized identifiers (DIDs) and their associated DID documents.
 * Supports both in-memory and persistent storage backends.
 * 
 * Implements W3C DID Core specification concepts:
 * - DID document resolution
 * - Verification method management
 * - Service endpoint registration
 */

import type { KeyPair } from '../crypto';

import * as jose from 'jose';



/**

 * W3C DID Document structure
 * @see https://www.w3.org/TR/did-core/
 */
export interface DIDDocument {
  '@context': string | string[];
  id: string; // The DID itself
  controller?: string | string[];
  verificationMethod?: VerificationMethod[];
  authentication?: (string | VerificationMethod)[];
  assertionMethod?: (string | VerificationMethod)[];
  keyAgreement?: (string | VerificationMethod)[];
  service?: ServiceEndpoint[];
  created?: string;
  updated?: string;
}

export interface VerificationMethod {
  id: string;
  type: string;
  controller: string;
  publicKeyJwk?: Record<string, unknown>;
  publicKeyMultibase?: string;
}

export interface ServiceEndpoint {
  id: string;
  type: string;
  serviceEndpoint: string | Record<string, unknown>;
  description?: string;
}

/**
 * DID Resolution result
 */
export interface DIDResolutionResult {
  didDocument: DIDDocument | null;
  didDocumentMetadata: {
    created?: string;
    updated?: string;
    deactivated?: boolean;
  };
  didResolutionMetadata: {
    error?: string;
    message?: string;
  };
}

/**
 * DID Registry Interface
 */
export interface IDIDRegistry {
  /**
   * Register a new DID with its document
   */
  register(did: string, document: DIDDocument): Promise<void>;

  /**
   * Resolve a DID to its document
   */
  resolve(did: string): Promise<DIDResolutionResult>;

  /**
   * Update an existing DID document
   */
  update(did: string, document: Partial<DIDDocument>): Promise<void>;

  /**
   * Deactivate a DID (soft delete)
   */
  deactivate(did: string): Promise<void>;

  /**
   * List all registered DIDs (for admin/debug)
   */
  list(): Promise<string[]>;
}

/**
 * In-memory DID registry implementation
 */
export class MemoryDIDRegistry implements IDIDRegistry {
  private documents = new Map<string, DIDDocument>();
  private metadata = new Map<string, { created: string; updated: string; deactivated: boolean }>();

  async register(did: string, document: DIDDocument): Promise<void> {
    if (this.documents.has(did)) {
      throw new Error(`DID ${did} already registered`);
    }

    const now = new Date().toISOString();
    this.documents.set(did, {
      ...document,
      id: did,
      created: now,
      updated: now
    });

    this.metadata.set(did, {
      created: now,
      updated: now,
      deactivated: false
    });
  }

  async resolve(did: string): Promise<DIDResolutionResult> {
    const document = this.documents.get(did);
    const meta = this.metadata.get(did);

    if (!document || !meta) {
      return {
        didDocument: null,
        didDocumentMetadata: {},
        didResolutionMetadata: {
          error: 'notFound',
          message: `DID ${did} not found in registry`
        }
      };
    }

    if (meta.deactivated) {
      return {
        didDocument: document,
        didDocumentMetadata: {
          ...meta,
          deactivated: true
        },
        didResolutionMetadata: {
          error: 'deactivated',
          message: `DID ${did} has been deactivated`
        }
      };
    }

    return {
      didDocument: document,
      didDocumentMetadata: meta,
      didResolutionMetadata: {}
    };
  }

  async update(did: string, updates: Partial<DIDDocument>): Promise<void> {
    const existing = this.documents.get(did);
    const meta = this.metadata.get(did);

    if (!existing || !meta) {
      throw new Error(`DID ${did} not found`);
    }

    if (meta.deactivated) {
      throw new Error(`Cannot update deactivated DID ${did}`);
    }

    const now = new Date().toISOString();
    this.documents.set(did, {
      ...existing,
      ...updates,
      id: did, // Prevent ID changes
      updated: now
    });

    this.metadata.set(did, {
      ...meta,
      updated: now
    });
  }

  async deactivate(did: string): Promise<void> {
    const meta = this.metadata.get(did);
    if (!meta) {
      throw new Error(`DID ${did} not found`);
    }

    this.metadata.set(did, {
      ...meta,
      deactivated: true,
      updated: new Date().toISOString()
    });
  }

  async list(): Promise<string[]> {
    return Array.from(this.documents.keys());
  }

  // Helper for testing
  clear(): void {
    this.documents.clear();
    this.metadata.clear();
  }
}

/**
 * DID Document builder helper
 */
export class DIDDocumentBuilder {
  /**
   * Create a DID document from a KeyPair
   */
  static async fromKeyPair(keyPair: KeyPair): Promise<DIDDocument> {
    const publicKeyJwk = (await jose.exportJWK(keyPair.publicKey as any)) as Record<string, unknown>;

    const verificationMethod: VerificationMethod = {
      id: `${keyPair.did}#keys-1`,
      type: 'Ed25519VerificationKey2018',
      controller: keyPair.did,
      publicKeyJwk
    };

    return {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/ed25519-2018/v1'
      ],
      id: keyPair.did,
      verificationMethod: [verificationMethod],
      authentication: [verificationMethod.id],
      assertionMethod: [verificationMethod.id],
      created: new Date().toISOString()
    };
  }

  /**
   * Add a service endpoint to a DID document
   */
  static addService(
    document: DIDDocument,
    id: string,
    type: string,
    serviceEndpoint: string | Record<string, unknown>,
    description?: string
  ): DIDDocument {
    const service: ServiceEndpoint = {
      id: `${document.id}#${id}`,
      type,
      serviceEndpoint,
      description
    };

    return {
      ...document,
      service: [...(document.service || []), service],
      updated: new Date().toISOString()
    };
  }

  /**
   * Add a verification method
   */
  static addVerificationMethod(
    document: DIDDocument,
    method: VerificationMethod
  ): DIDDocument {
    return {
      ...document,
      verificationMethod: [...(document.verificationMethod || []), method],
      updated: new Date().toISOString()
    };
  }
}

/**
 * Global registry instance (singleton for in-memory implementation)
 */
let globalRegistry: IDIDRegistry | null = null;

/**
 * Get or create the global DID registry
 */
export function getRegistry(): IDIDRegistry {
  if (!globalRegistry) {
    globalRegistry = new MemoryDIDRegistry();
  }
  return globalRegistry;
}

/**
 * Set a custom registry implementation (for testing or production backends)
 */
export function setRegistry(registry: IDIDRegistry): void {
  globalRegistry = registry;
}

/**
 * Reset the global registry (for testing)
 */
export function resetRegistry(): void {
  if (globalRegistry instanceof MemoryDIDRegistry) {
    globalRegistry.clear();
  }
  globalRegistry = null;
}
