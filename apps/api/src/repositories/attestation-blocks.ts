import type { AttestationBlock } from "@in-midst-my-life/schema";
import { Pool } from "pg";

export interface AttestationBlockRepo {
  list(profileId: string): Promise<AttestationBlock[]>;
  listByEntity(profileId: string, entityType: string, entityId: string): Promise<AttestationBlock[]>;
  get(id: string): Promise<AttestationBlock | undefined>;
  create(block: AttestationBlock): Promise<AttestationBlock>;
  update(id: string, patch: Partial<AttestationBlock>): Promise<AttestationBlock | undefined>;
  delete(id: string): Promise<boolean>;
  reset(): Promise<void>;
}

export type AttestationBlockRepoKind = "memory" | "postgres";

export interface AttestationBlockRepoOptions {
  kind?: AttestationBlockRepoKind;
  pool?: Pool;
  connectionString?: string;
}

class InMemoryAttestationBlockRepo implements AttestationBlockRepo {
  private data = new Map<string, AttestationBlock>();

  async list(profileId: string) {
    return Array.from(this.data.values()).filter((item) => item.profileId === profileId);
  }

  async listByEntity(profileId: string, entityType: string, entityId: string) {
    return Array.from(this.data.values()).filter(
      (item) => item.profileId === profileId && item.entityType === entityType && item.entityId === entityId
    );
  }

  async get(id: string) {
    return this.data.get(id);
  }

  async create(block: AttestationBlock) {
    this.data.set(block.id, block);
    return block;
  }

  async update(id: string, patch: Partial<AttestationBlock>) {
    const existing = this.data.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch, id: existing.id, profileId: existing.profileId };
    this.data.set(id, updated);
    return updated;
  }

  async delete(id: string) {
    return this.data.delete(id);
  }

  async reset() {
    this.data.clear();
  }
}

class PostgresAttestationBlockRepo implements AttestationBlockRepo {
  private pool: Pool;
  private ready: Promise<void>;

  constructor(pool: Pool) {
    this.pool = pool;
    this.ready = this.ensureTable();
  }

  private async ensureTable() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS attestation_blocks (
        id uuid PRIMARY KEY,
        profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        entity_type text NOT NULL,
        entity_id uuid NOT NULL,
        signer_did text NOT NULL,
        signer_label text,
        status text NOT NULL,
        hash text NOT NULL,
        signature text NOT NULL,
        payload jsonb,
        timestamp timestamptz NOT NULL,
        context text,
        expires_at timestamptz
      )
    `);
  }

  private mapRow(row: any): AttestationBlock {
    return {
      id: row.id,
      profileId: row.profile_id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      signerDid: row.signer_did,
      signerLabel: row.signer_label ?? undefined,
      status: row.status,
      hash: row.hash,
      signature: row.signature,
      payload: row.payload ?? undefined,
      timestamp: row.timestamp?.toISOString?.() ?? row.timestamp,
      context: row.context ?? undefined,
      expiresAt: row.expires_at?.toISOString?.() ?? row.expires_at ?? undefined
    };
  }

  async list(profileId: string) {
    await this.ready;
    const res = await this.pool.query(
      `SELECT * FROM attestation_blocks WHERE profile_id = $1 ORDER BY timestamp DESC`,
      [profileId]
    );
    return res.rows.map((row) => this.mapRow(row));
  }

  async listByEntity(profileId: string, entityType: string, entityId: string) {
    await this.ready;
    const res = await this.pool.query(
      `SELECT * FROM attestation_blocks WHERE profile_id = $1 AND entity_type = $2 AND entity_id = $3 ORDER BY timestamp DESC`,
      [profileId, entityType, entityId]
    );
    return res.rows.map((row) => this.mapRow(row));
  }

  async get(id: string) {
    await this.ready;
    const res = await this.pool.query(`SELECT * FROM attestation_blocks WHERE id = $1`, [id]);
    return res.rows[0] ? this.mapRow(res.rows[0]) : undefined;
  }

  async create(block: AttestationBlock) {
    await this.ready;
    await this.pool.query(
      `INSERT INTO attestation_blocks (id, profile_id, entity_type, entity_id, signer_did, signer_label, status, hash, signature, payload, timestamp, context, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, signature = EXCLUDED.signature`,
      [
        block.id,
        block.profileId,
        block.entityType,
        block.entityId,
        block.signerDid,
        block.signerLabel ?? null,
        block.status,
        block.hash,
        block.signature,
        block.payload ?? null,
        block.timestamp,
        block.context ?? null,
        block.expiresAt ?? null
      ]
    );
    return block;
  }

  async update(id: string, patch: Partial<AttestationBlock>) {
    const existing = await this.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch, id: existing.id, profileId: existing.profileId };
    await this.create(updated);
    return updated;
  }

  async delete(id: string) {
    await this.ready;
    const res = await this.pool.query(`DELETE FROM attestation_blocks WHERE id = $1`, [id]);
    return (res.rowCount ?? 0) > 0;
  }

  async reset() {
    await this.ready;
    await this.pool.query(`TRUNCATE TABLE attestation_blocks`);
  }
}

export function createAttestationBlockRepo(options: AttestationBlockRepoOptions = {}): AttestationBlockRepo {
  const hasPostgres = Boolean(options.connectionString ?? process.env["DATABASE_URL"] ?? process.env["POSTGRES_URL"]);
  const kind = options.kind ?? (process.env["ATTESTATION_BLOCK_STORE"] ?? (hasPostgres ? "postgres" : "memory"));
  if (kind === "postgres") {
    const pool =
      options.pool ??
      new Pool({ connectionString: options.connectionString ?? process.env["DATABASE_URL"] ?? process.env["POSTGRES_URL"] });
    return new PostgresAttestationBlockRepo(pool);
  }
  return new InMemoryAttestationBlockRepo();
}

export const attestationBlockRepo: AttestationBlockRepo = createAttestationBlockRepo();
