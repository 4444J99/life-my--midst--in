/**
 * PostgreSQL-backed DID Registry
 *
 * Persistent implementation of IDIDRegistry that stores DID documents
 * in PostgreSQL as JSONB. Replaces MemoryDIDRegistry for production use.
 */

import type { Pool as PgPool } from 'pg';
import type { IDIDRegistry, DIDDocument, DIDResolutionResult } from '@in-midst-my-life/core';

export class PostgresDIDRegistry implements IDIDRegistry {
  private pool: PgPool;
  private ready: Promise<void>;

  constructor(pool: PgPool) {
    this.pool = pool;
    // Ensure the table exists (idempotent, matches migration 014)
    this.ready = this.ensureTable();
  }

  private async ensureTable(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS did_documents (
        did TEXT PRIMARY KEY,
        document JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deactivated BOOLEAN NOT NULL DEFAULT FALSE
      )
    `);
  }

  async register(did: string, document: DIDDocument): Promise<void> {
    await this.ready;

    const now = new Date().toISOString();
    const docWithTimestamps: DIDDocument = {
      ...document,
      id: did,
      created: now,
      updated: now,
    };

    try {
      await this.pool.query(
        `INSERT INTO did_documents (did, document, created_at, updated_at, deactivated)
         VALUES ($1, $2, NOW(), NOW(), FALSE)`,
        [did, JSON.stringify(docWithTimestamps)],
      );
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr.code === '23505') {
        // unique_violation
        throw new Error(`DID ${did} already registered`);
      }
      throw err;
    }
  }

  async resolve(did: string): Promise<DIDResolutionResult> {
    await this.ready;

    const result = await this.pool.query(
      `SELECT document, created_at, updated_at, deactivated
       FROM did_documents WHERE did = $1`,
      [did],
    );

    const row = result.rows[0] as
      | { document: DIDDocument; created_at: Date; updated_at: Date; deactivated: boolean }
      | undefined;

    if (!row) {
      return {
        didDocument: null,
        didDocumentMetadata: {},
        didResolutionMetadata: {
          error: 'notFound',
          message: `DID ${did} not found in registry`,
        },
      };
    }

    if (row.deactivated) {
      return {
        didDocument: row.document,
        didDocumentMetadata: {
          created: row.created_at.toISOString(),
          updated: row.updated_at.toISOString(),
          deactivated: true,
        },
        didResolutionMetadata: {
          error: 'deactivated',
          message: `DID ${did} has been deactivated`,
        },
      };
    }

    return {
      didDocument: row.document,
      didDocumentMetadata: {
        created: row.created_at.toISOString(),
        updated: row.updated_at.toISOString(),
      },
      didResolutionMetadata: {},
    };
  }

  async update(did: string, updates: Partial<DIDDocument>): Promise<void> {
    await this.ready;

    // First check existence and deactivated status
    const existing = await this.pool.query(
      `SELECT document, deactivated FROM did_documents WHERE did = $1`,
      [did],
    );

    const row = existing.rows[0] as { document: DIDDocument; deactivated: boolean } | undefined;

    if (!row) {
      throw new Error(`DID ${did} not found`);
    }

    if (row.deactivated) {
      throw new Error(`Cannot update deactivated DID ${did}`);
    }

    const now = new Date().toISOString();
    const merged: DIDDocument = {
      ...row.document,
      ...updates,
      id: did, // Prevent ID changes
      updated: now,
    };

    await this.pool.query(
      `UPDATE did_documents
       SET document = $2, updated_at = NOW()
       WHERE did = $1`,
      [did, JSON.stringify(merged)],
    );
  }

  async deactivate(did: string): Promise<void> {
    await this.ready;

    const result = await this.pool.query(
      `UPDATE did_documents
       SET deactivated = TRUE, updated_at = NOW()
       WHERE did = $1
       RETURNING did`,
      [did],
    );

    if (result.rowCount === 0) {
      throw new Error(`DID ${did} not found`);
    }
  }

  async list(): Promise<string[]> {
    await this.ready;

    const result = await this.pool.query(
      `SELECT did FROM did_documents WHERE deactivated = FALSE ORDER BY created_at`,
    );

    return result.rows.map((r: { did: string }) => r.did);
  }
}
