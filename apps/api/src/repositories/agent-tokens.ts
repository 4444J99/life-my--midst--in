import { randomUUID, createHash } from "node:crypto";
import { Pool } from "pg";

export interface AgentToken {
  id: string;
  profileId: string;
  label?: string;
  tokenHash: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt?: string;
  revokedAt?: string;
}

export interface AgentTokenRepo {
  create(profileId: string, label: string | undefined, scopes: string[]): Promise<{ token: string; record: AgentToken }>; // allow-secret
  list(profileId: string): Promise<AgentToken[]>;
  findByToken(token: string): Promise<AgentToken | undefined>; // allow-secret
  revoke(id: string, profileId: string): Promise<boolean>;
  markUsed(id: string): Promise<void>;
  reset(): Promise<void>;
}

export type AgentTokenRepoKind = "memory" | "postgres";

export interface AgentTokenRepoOptions {
  kind?: AgentTokenRepoKind;
  pool?: Pool;
  connectionString?: string;
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex"); // allow-secret

class InMemoryAgentTokenRepo implements AgentTokenRepo {
  private data = new Map<string, AgentToken>();

  async create(profileId: string, label: string | undefined, scopes: string[]) {
    const token = `agt_${randomUUID()}`; // allow-secret
    const record: AgentToken = {
      id: randomUUID(),
      profileId,
      label,
      tokenHash: hashToken(token),
      scopes,
      createdAt: new Date().toISOString()
    };
    this.data.set(record.id, record);
    return { token, record };
  }

  async list(profileId: string) {
    return Array.from(this.data.values()).filter((item) => item.profileId === profileId);
  }

  async findByToken(token: string) { // allow-secret
    const hash = hashToken(token);
    return Array.from(this.data.values()).find((item) => item.tokenHash === hash && !item.revokedAt);
  }

  async revoke(id: string, profileId: string) {
    const existing = this.data.get(id);
    if (!existing || existing.profileId !== profileId) return false;
    this.data.set(id, { ...existing, revokedAt: new Date().toISOString() });
    return true;
  }

  async markUsed(id: string) {
    const existing = this.data.get(id);
    if (!existing) return;
    this.data.set(id, { ...existing, lastUsedAt: new Date().toISOString() });
  }

  async reset() {
    this.data.clear();
  }
}

class PostgresAgentTokenRepo implements AgentTokenRepo {
  private pool: Pool;
  private ready: Promise<void>;

  constructor(pool: Pool) {
    this.pool = pool;
    this.ready = this.ensureTable();
  }

  private async ensureTable() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS agent_tokens (
        id uuid PRIMARY KEY,
        profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        label text,
        token_hash text NOT NULL,
        scopes text[] NOT NULL DEFAULT '{}',
        created_at timestamptz NOT NULL,
        last_used_at timestamptz,
        revoked_at timestamptz
      )
    `);
  }

  async create(profileId: string, label: string | undefined, scopes: string[]) {
    await this.ready;
    const token = `agt_${randomUUID()}`; // allow-secret
    const record: AgentToken = {
      id: randomUUID(),
      profileId,
      label,
      tokenHash: hashToken(token),
      scopes,
      createdAt: new Date().toISOString()
    };
    await this.pool.query(
      `INSERT INTO agent_tokens (id, profile_id, label, token_hash, scopes, created_at)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [record.id, profileId, label ?? null, record.tokenHash, record.scopes, record.createdAt]
    );
    return { token, record };
  }

  async list(profileId: string) {
    await this.ready;
    const res = await this.pool.query(
      `SELECT id, profile_id, label, token_hash, scopes, created_at, last_used_at, revoked_at
       FROM agent_tokens WHERE profile_id = $1 ORDER BY created_at DESC`,
      [profileId]
    );
    return res.rows.map((row) => ({
      id: row.id,
      profileId: row.profile_id,
      label: row.label ?? undefined,
      tokenHash: row.token_hash,
      scopes: row.scopes ?? [],
      createdAt: row.created_at?.toISOString?.() ?? row.created_at,
      lastUsedAt: row.last_used_at?.toISOString?.() ?? row.last_used_at ?? undefined,
      revokedAt: row.revoked_at?.toISOString?.() ?? row.revoked_at ?? undefined
    }));
  }

  async findByToken(token: string) { // allow-secret
    await this.ready;
    const hash = hashToken(token);
    const res = await this.pool.query(
      `SELECT id, profile_id, label, token_hash, scopes, created_at, last_used_at, revoked_at
       FROM agent_tokens WHERE token_hash = $1 AND revoked_at IS NULL`,
      [hash]
    );
    const row = res.rows[0];
    if (!row) return undefined;
    return {
      id: row.id,
      profileId: row.profile_id,
      label: row.label ?? undefined,
      tokenHash: row.token_hash,
      scopes: row.scopes ?? [],
      createdAt: row.created_at?.toISOString?.() ?? row.created_at,
      lastUsedAt: row.last_used_at?.toISOString?.() ?? row.last_used_at ?? undefined,
      revokedAt: row.revoked_at?.toISOString?.() ?? row.revoked_at ?? undefined
    };
  }

  async revoke(id: string, profileId: string) {
    await this.ready;
    const res = await this.pool.query(
      `UPDATE agent_tokens SET revoked_at = now() WHERE id = $1 AND profile_id = $2`,
      [id, profileId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async markUsed(id: string) {
    await this.ready;
    await this.pool.query(`UPDATE agent_tokens SET last_used_at = now() WHERE id = $1`, [id]);
  }

  async reset() {
    await this.ready;
    await this.pool.query(`TRUNCATE TABLE agent_tokens`);
  }
}

export function createAgentTokenRepo(options: AgentTokenRepoOptions = {}): AgentTokenRepo {
  const hasPostgres = Boolean(options.connectionString ?? process.env["DATABASE_URL"] ?? process.env["POSTGRES_URL"]);
  const kind = options.kind ?? (process.env["AGENT_TOKEN_STORE"] ?? (hasPostgres ? "postgres" : "memory"));
  if (kind === "postgres") {
    const pool =
      options.pool ??
      new Pool({
        connectionString: options.connectionString ?? process.env["DATABASE_URL"] ?? process.env["POSTGRES_URL"]
      });
    return new PostgresAgentTokenRepo(pool);
  }
  return new InMemoryAgentTokenRepo();
}

export const agentTokenRepo: AgentTokenRepo = createAgentTokenRepo();
