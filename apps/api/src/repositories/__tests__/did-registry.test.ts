/**
 * PostgresDIDRegistry Unit Tests
 *
 * Tests the PostgresDIDRegistry using the same IDIDRegistry contract
 * as the MemoryDIDRegistry tests. Uses a mock Pool for isolation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PostgresDIDRegistry } from '../did-registry';
import { DIDDocumentBuilder, DIDKey } from '@in-midst-my-life/core';

// Minimal mock of pg.Pool that tracks queries
function createMockPool() {
  const store = new Map<
    string,
    { document: unknown; created_at: Date; updated_at: Date; deactivated: boolean }
  >();

  const pool = {
    query: vi.fn((sql: string, params?: unknown[]) => {
      const text = sql.replace(/\s+/g, ' ').trim();

      // CREATE TABLE — no-op
      if (text.startsWith('CREATE TABLE')) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }

      // INSERT
      if (text.includes('INSERT INTO did_documents')) {
        const did = params?.[0] as string;
        const doc = JSON.parse(params?.[1] as string) as unknown;
        if (store.has(did)) {
          const err = new Error('unique_violation') as Error & { code: string };
          err.code = '23505';
          return Promise.reject(err);
        }
        store.set(did, {
          document: doc,
          created_at: new Date(),
          updated_at: new Date(),
          deactivated: false,
        });
        return Promise.resolve({ rows: [], rowCount: 1 });
      }

      // SELECT for resolve
      if (text.includes('SELECT document, created_at, updated_at, deactivated')) {
        const did = params?.[0] as string;
        const row = store.get(did);
        return Promise.resolve({ rows: row ? [row] : [], rowCount: row ? 1 : 0 });
      }

      // SELECT for update check
      if (text.includes('SELECT document, deactivated')) {
        const did = params?.[0] as string;
        const row = store.get(did);
        return Promise.resolve({ rows: row ? [row] : [], rowCount: row ? 1 : 0 });
      }

      // UPDATE document
      if (text.includes('UPDATE did_documents') && text.includes('SET document')) {
        const did = params?.[0] as string;
        const doc = JSON.parse(params?.[1] as string) as unknown;
        const existing = store.get(did);
        if (existing) {
          existing.document = doc;
          existing.updated_at = new Date();
        }
        return Promise.resolve({ rows: [], rowCount: existing ? 1 : 0 });
      }

      // UPDATE deactivate
      if (text.includes('SET deactivated = TRUE')) {
        const did = params?.[0] as string;
        const existing = store.get(did);
        if (existing) {
          existing.deactivated = true;
          existing.updated_at = new Date();
          return Promise.resolve({ rows: [{ did }], rowCount: 1 });
        }
        return Promise.resolve({ rows: [], rowCount: 0 });
      }

      // SELECT list
      if (text.includes('SELECT did FROM did_documents')) {
        const rows = Array.from(store.entries())
          .filter(([, v]) => !v.deactivated)
          .map(([did]) => ({ did }));
        return Promise.resolve({ rows, rowCount: rows.length });
      }

      return Promise.resolve({ rows: [], rowCount: 0 });
    }),
  };

  return { pool, store };
}

describe('PostgresDIDRegistry', () => {
  let registry: PostgresDIDRegistry;
  let keyPair: Awaited<ReturnType<typeof DIDKey.generate>>;

  beforeEach(async () => {
    const { pool } = createMockPool();
    registry = new PostgresDIDRegistry(pool as unknown as import('pg').Pool);
    keyPair = await DIDKey.generate();
  });

  it('should register and resolve a DID', async () => {
    const document = await DIDDocumentBuilder.fromKeyPair(keyPair);
    await registry.register(keyPair.did, document);

    const resolution = await registry.resolve(keyPair.did);
    expect(resolution.didDocument).toBeTruthy();
    expect(resolution.didDocument?.id).toBe(keyPair.did);
    expect(resolution.didResolutionMetadata.error).toBeUndefined();
  });

  it('should return notFound for unregistered DID', async () => {
    const resolution = await registry.resolve('did:key:nonexistent');
    expect(resolution.didDocument).toBeNull();
    expect(resolution.didResolutionMetadata.error).toBe('notFound');
  });

  it('should reject duplicate registration', async () => {
    const document = await DIDDocumentBuilder.fromKeyPair(keyPair);
    await registry.register(keyPair.did, document);

    await expect(registry.register(keyPair.did, document)).rejects.toThrow('already registered');
  });

  it('should update a DID document', async () => {
    const document = await DIDDocumentBuilder.fromKeyPair(keyPair);
    await registry.register(keyPair.did, document);

    await registry.update(keyPair.did, { controller: 'did:key:controller123' });

    const resolution = await registry.resolve(keyPair.did);
    expect(resolution.didDocument?.controller).toBe('did:key:controller123');
  });

  it('should reject update to nonexistent DID', async () => {
    await expect(registry.update('did:key:nope', { controller: 'x' })).rejects.toThrow('not found');
  });

  it('should reject update to deactivated DID', async () => {
    const document = await DIDDocumentBuilder.fromKeyPair(keyPair);
    await registry.register(keyPair.did, document);
    await registry.deactivate(keyPair.did);

    await expect(registry.update(keyPair.did, { controller: 'x' })).rejects.toThrow('deactivated');
  });

  it('should deactivate a DID', async () => {
    const document = await DIDDocumentBuilder.fromKeyPair(keyPair);
    await registry.register(keyPair.did, document);
    await registry.deactivate(keyPair.did);

    const resolution = await registry.resolve(keyPair.did);
    expect(resolution.didDocumentMetadata.deactivated).toBe(true);
    expect(resolution.didResolutionMetadata.error).toBe('deactivated');
  });

  it('should reject deactivation of nonexistent DID', async () => {
    await expect(registry.deactivate('did:key:nope')).rejects.toThrow('not found');
  });

  it('should list only active DIDs', async () => {
    const kp1 = await DIDKey.generate();
    const kp2 = await DIDKey.generate();

    await registry.register(kp1.did, await DIDDocumentBuilder.fromKeyPair(kp1));
    await registry.register(kp2.did, await DIDDocumentBuilder.fromKeyPair(kp2));
    await registry.deactivate(kp1.did);

    const dids = await registry.list();
    expect(dids).toContain(kp2.did);
    expect(dids).not.toContain(kp1.did);
  });
});
