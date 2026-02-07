import type { Pool } from 'pg';

export interface SBTTokenRecord {
  id: string;
  profileId: string;
  attestationId: string;
  contractAddress: string;
  tokenId: string;
  chainId: number;
  walletAddress: string;
  txHash?: string;
  status: 'pending' | 'minted' | 'revoked' | 'failed';
  mintedAt?: string;
  burnedAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface WalletConnectionRecord {
  id: string;
  profileId: string;
  walletAddress: string;
  chainId: number;
  verified: boolean;
  signature?: string;
  message?: string;
  connectedAt: string;
}

export interface SBTTokenRepo {
  create(token: SBTTokenRecord): Promise<SBTTokenRecord>;
  find(id: string): Promise<SBTTokenRecord | undefined>;
  findByAttestation(attestationId: string): Promise<SBTTokenRecord | undefined>;
  update(id: string, patch: Partial<SBTTokenRecord>): Promise<SBTTokenRecord | undefined>;
  listByProfile(profileId: string): Promise<SBTTokenRecord[]>;
  listByWallet(walletAddress: string): Promise<SBTTokenRecord[]>;
}

export interface WalletConnectionRepo {
  connect(conn: WalletConnectionRecord): Promise<WalletConnectionRecord>;
  findByProfile(profileId: string): Promise<WalletConnectionRecord[]>;
  findByAddress(walletAddress: string): Promise<WalletConnectionRecord | undefined>;
  verify(profileId: string, walletAddress: string): Promise<void>;
}

// ─── In-Memory Implementations ──────────────────────────────────────

class InMemorySBTTokenRepo implements SBTTokenRepo {
  private data = new Map<string, SBTTokenRecord>();

  create(token: SBTTokenRecord): Promise<SBTTokenRecord> {
    this.data.set(token.id, token);
    return Promise.resolve(token);
  }

  find(id: string): Promise<SBTTokenRecord | undefined> {
    return Promise.resolve(this.data.get(id));
  }

  findByAttestation(attestationId: string): Promise<SBTTokenRecord | undefined> {
    const found = Array.from(this.data.values()).find((t) => t.attestationId === attestationId);
    return Promise.resolve(found);
  }

  update(id: string, patch: Partial<SBTTokenRecord>): Promise<SBTTokenRecord | undefined> {
    const existing = this.data.get(id);
    if (!existing) return Promise.resolve(undefined);
    const updated = { ...existing, ...patch, id: existing.id, updatedAt: new Date().toISOString() };
    this.data.set(id, updated);
    return Promise.resolve(updated);
  }

  listByProfile(profileId: string): Promise<SBTTokenRecord[]> {
    return Promise.resolve(Array.from(this.data.values()).filter((t) => t.profileId === profileId));
  }

  listByWallet(walletAddress: string): Promise<SBTTokenRecord[]> {
    const addr = walletAddress.toLowerCase();
    return Promise.resolve(
      Array.from(this.data.values()).filter((t) => t.walletAddress.toLowerCase() === addr),
    );
  }
}

class InMemoryWalletConnectionRepo implements WalletConnectionRepo {
  private data = new Map<string, WalletConnectionRecord>();

  connect(conn: WalletConnectionRecord): Promise<WalletConnectionRecord> {
    const key = `${conn.profileId}:${conn.walletAddress}:${conn.chainId}`;
    this.data.set(key, conn);
    return Promise.resolve(conn);
  }

  findByProfile(profileId: string): Promise<WalletConnectionRecord[]> {
    return Promise.resolve(Array.from(this.data.values()).filter((c) => c.profileId === profileId));
  }

  findByAddress(walletAddress: string): Promise<WalletConnectionRecord | undefined> {
    const addr = walletAddress.toLowerCase();
    const found = Array.from(this.data.values()).find(
      (c) => c.walletAddress.toLowerCase() === addr,
    );
    return Promise.resolve(found);
  }

  verify(profileId: string, walletAddress: string): Promise<void> {
    for (const [key, conn] of this.data.entries()) {
      if (
        conn.profileId === profileId &&
        conn.walletAddress.toLowerCase() === walletAddress.toLowerCase()
      ) {
        this.data.set(key, { ...conn, verified: true });
      }
    }
    return Promise.resolve();
  }
}

// ─── Postgres Implementations ──────────────────────────────────────

interface SBTTokenRow {
  id: string;
  profile_id: string;
  attestation_id: string;
  contract_address: string;
  token_id: string;
  chain_id: number;
  wallet_address: string;
  tx_hash: string | null;
  status: string;
  minted_at: string | null;
  burned_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

function rowToSBTToken(row: SBTTokenRow): SBTTokenRecord {
  return {
    id: row.id,
    profileId: row.profile_id,
    attestationId: row.attestation_id,
    contractAddress: row.contract_address,
    tokenId: row.token_id,
    chainId: row.chain_id,
    walletAddress: row.wallet_address,
    txHash: row.tx_hash ?? undefined,
    status: row.status as SBTTokenRecord['status'],
    mintedAt: row.minted_at ? new Date(row.minted_at).toISOString() : undefined,
    burnedAt: row.burned_at ? new Date(row.burned_at).toISOString() : undefined,
    metadata: row.metadata ?? undefined,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

class PostgresSBTTokenRepo implements SBTTokenRepo {
  constructor(private pool: Pool) {}

  async create(token: SBTTokenRecord): Promise<SBTTokenRecord> {
    const { rows } = await this.pool.query<SBTTokenRow>(
      `INSERT INTO sbt_tokens
        (id, profile_id, attestation_id, contract_address, token_id, chain_id,
         wallet_address, tx_hash, status, minted_at, burned_at, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        token.id,
        token.profileId,
        token.attestationId,
        token.contractAddress,
        token.tokenId,
        token.chainId,
        token.walletAddress,
        token.txHash ?? null,
        token.status,
        token.mintedAt ?? null,
        token.burnedAt ?? null,
        token.metadata ? JSON.stringify(token.metadata) : '{}',
        token.createdAt,
        token.updatedAt,
      ],
    );
    const row = rows[0];
    if (!row) throw new Error('Insert returned no rows');
    return rowToSBTToken(row);
  }

  async find(id: string): Promise<SBTTokenRecord | undefined> {
    const { rows } = await this.pool.query<SBTTokenRow>('SELECT * FROM sbt_tokens WHERE id = $1', [
      id,
    ]);
    const row = rows[0];
    return row ? rowToSBTToken(row) : undefined;
  }

  async findByAttestation(attestationId: string): Promise<SBTTokenRecord | undefined> {
    const { rows } = await this.pool.query<SBTTokenRow>(
      'SELECT * FROM sbt_tokens WHERE attestation_id = $1 ORDER BY created_at DESC LIMIT 1',
      [attestationId],
    );
    const row = rows[0];
    return row ? rowToSBTToken(row) : undefined;
  }

  async update(id: string, patch: Partial<SBTTokenRecord>): Promise<SBTTokenRecord | undefined> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (patch.status !== undefined) {
      sets.push(`status = $${idx++}`);
      values.push(patch.status);
    }
    if (patch.txHash !== undefined) {
      sets.push(`tx_hash = $${idx++}`);
      values.push(patch.txHash);
    }
    if (patch.mintedAt !== undefined) {
      sets.push(`minted_at = $${idx++}`);
      values.push(patch.mintedAt);
    }
    if (patch.burnedAt !== undefined) {
      sets.push(`burned_at = $${idx++}`);
      values.push(patch.burnedAt);
    }
    if (patch.metadata !== undefined) {
      sets.push(`metadata = $${idx++}`);
      values.push(JSON.stringify(patch.metadata));
    }

    sets.push(`updated_at = $${idx++}`);
    values.push(new Date().toISOString());
    values.push(id);

    const { rows } = await this.pool.query<SBTTokenRow>(
      `UPDATE sbt_tokens SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );
    const row = rows[0];
    return row ? rowToSBTToken(row) : undefined;
  }

  async listByProfile(profileId: string): Promise<SBTTokenRecord[]> {
    const { rows } = await this.pool.query<SBTTokenRow>(
      'SELECT * FROM sbt_tokens WHERE profile_id = $1 ORDER BY created_at DESC',
      [profileId],
    );
    return rows.map(rowToSBTToken);
  }

  async listByWallet(walletAddress: string): Promise<SBTTokenRecord[]> {
    const { rows } = await this.pool.query<SBTTokenRow>(
      'SELECT * FROM sbt_tokens WHERE LOWER(wallet_address) = LOWER($1) ORDER BY created_at DESC',
      [walletAddress],
    );
    return rows.map(rowToSBTToken);
  }
}

// ─── Postgres Wallet Connection ──────────────────────────────────

interface WalletRow {
  id: string;
  profile_id: string;
  wallet_address: string;
  chain_id: number;
  verified: boolean;
  signature: string | null;
  message: string | null;
  connected_at: string;
}

function rowToWallet(row: WalletRow): WalletConnectionRecord {
  return {
    id: row.id,
    profileId: row.profile_id,
    walletAddress: row.wallet_address,
    chainId: row.chain_id,
    verified: row.verified,
    signature: row.signature ?? undefined,
    message: row.message ?? undefined,
    connectedAt: new Date(row.connected_at).toISOString(),
  };
}

class PostgresWalletConnectionRepo implements WalletConnectionRepo {
  constructor(private pool: Pool) {}

  async connect(conn: WalletConnectionRecord): Promise<WalletConnectionRecord> {
    const { rows } = await this.pool.query<WalletRow>(
      `INSERT INTO wallet_connections (id, profile_id, wallet_address, chain_id, verified, signature, message, connected_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (profile_id, wallet_address, chain_id) DO UPDATE SET
         signature = EXCLUDED.signature,
         message = EXCLUDED.message,
         connected_at = EXCLUDED.connected_at
       RETURNING *`,
      [
        conn.id,
        conn.profileId,
        conn.walletAddress,
        conn.chainId,
        conn.verified,
        conn.signature ?? null,
        conn.message ?? null,
        conn.connectedAt,
      ],
    );
    const row = rows[0];
    if (!row) throw new Error('Insert returned no rows');
    return rowToWallet(row);
  }

  async findByProfile(profileId: string): Promise<WalletConnectionRecord[]> {
    const { rows } = await this.pool.query<WalletRow>(
      'SELECT * FROM wallet_connections WHERE profile_id = $1 ORDER BY connected_at DESC',
      [profileId],
    );
    return rows.map(rowToWallet);
  }

  async findByAddress(walletAddress: string): Promise<WalletConnectionRecord | undefined> {
    const { rows } = await this.pool.query<WalletRow>(
      'SELECT * FROM wallet_connections WHERE LOWER(wallet_address) = LOWER($1) LIMIT 1',
      [walletAddress],
    );
    const row = rows[0];
    return row ? rowToWallet(row) : undefined;
  }

  async verify(profileId: string, walletAddress: string): Promise<void> {
    await this.pool.query(
      'UPDATE wallet_connections SET verified = TRUE WHERE profile_id = $1 AND LOWER(wallet_address) = LOWER($2)',
      [profileId, walletAddress],
    );
  }
}

// ─── Factory Functions ──────────────────────────────────────

export function createSBTTokenRepo(pool?: Pool): SBTTokenRepo {
  return pool ? new PostgresSBTTokenRepo(pool) : new InMemorySBTTokenRepo();
}

export function createWalletConnectionRepo(pool?: Pool): WalletConnectionRepo {
  return pool ? new PostgresWalletConnectionRepo(pool) : new InMemoryWalletConnectionRepo();
}
