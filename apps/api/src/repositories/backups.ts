import { Pool } from "pg";
import type { ProfileBundle } from "../bundles";

export interface ProfileBackup {
  id: string;
  profileId: string;
  bundle: ProfileBundle;
  label?: string;
  createdAt: string;
}

export interface BackupRepo {
  create(backup: ProfileBackup): Promise<ProfileBackup>;
  list(profileId: string, offset: number, limit: number): Promise<{ data: ProfileBackup[]; total: number }>;
  get(id: string): Promise<ProfileBackup | undefined>;
  delete(id: string): Promise<boolean>;
  reset(): Promise<void>;
}

export type BackupRepoKind = "memory" | "postgres";

export interface BackupRepoOptions {
  kind?: BackupRepoKind;
  connectionString?: string;
  pool?: Pool;
}

class InMemoryBackupRepo implements BackupRepo {
  private data = new Map<string, ProfileBackup>();

  async create(backup: ProfileBackup) {
    const normalized: ProfileBackup = {
      ...backup,
      createdAt: backup.createdAt ?? new Date().toISOString()
    };
    this.data.set(backup.id, normalized);
    return normalized;
  }

  async list(profileId: string, offset: number, limit: number) {
    const values = Array.from(this.data.values()).filter((backup) => backup.profileId === profileId);
    const sorted = [...values].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const slice = sorted.slice(offset, offset + limit);
    return { data: slice, total: sorted.length };
  }

  async get(id: string) {
    return this.data.get(id);
  }

  async delete(id: string) {
    return this.data.delete(id);
  }

  async reset() {
    this.data.clear();
  }
}

class PostgresBackupRepo implements BackupRepo {
  constructor(private pool: Pool) {}

  async create(backup: ProfileBackup) {
    const createdAt = backup.createdAt ?? new Date().toISOString();
    await this.pool.query(
      `INSERT INTO profile_backups (id, profile_id, bundle, label, created_at)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO UPDATE SET bundle = EXCLUDED.bundle, label = EXCLUDED.label, created_at = EXCLUDED.created_at`,
      [backup.id, backup.profileId, backup.bundle, backup.label ?? null, createdAt]
    );
    return { ...backup, createdAt };
  }

  async list(profileId: string, offset: number, limit: number) {
    const dataQuery = `SELECT id, profile_id, bundle, label, created_at FROM profile_backups WHERE profile_id = $1 ORDER BY created_at DESC OFFSET $2 LIMIT $3`;
    const countQuery = `SELECT COUNT(*)::text as count FROM profile_backups WHERE profile_id = $1`;
    const [{ rows: dataRows }, { rows: countRows }] = await Promise.all([
      this.pool.query(dataQuery, [profileId, offset, limit]),
      this.pool.query<{ count: string }>(countQuery, [profileId])
    ]);
    return {
      data: dataRows.map(mapBackupRow),
      total: Number(countRows[0]?.count ?? 0)
    };
  }

  async get(id: string) {
    const res = await this.pool.query(`SELECT id, profile_id, bundle, label, created_at FROM profile_backups WHERE id = $1`, [id]);
    return res.rows[0] ? mapBackupRow(res.rows[0]) : undefined;
  }

  async delete(id: string) {
    const res = await this.pool.query(`DELETE FROM profile_backups WHERE id = $1`, [id]);
    return (res.rowCount ?? 0) > 0;
  }

  async reset() {
    await this.pool.query(`TRUNCATE TABLE profile_backups`);
  }
}

function mapBackupRow(row: any): ProfileBackup {
  return {
    id: row.id,
    profileId: row.profile_id,
    bundle: row.bundle,
    label: row.label ?? undefined,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at
  };
}

export function createBackupRepo(options: BackupRepoOptions = {}): BackupRepo {
  const hasPostgres = Boolean(options.connectionString ?? process.env["DATABASE_URL"] ?? process.env["POSTGRES_URL"]);
  const envKind = process.env["BACKUP_REPO"] ?? process.env["BACKUP_STORE"];
  const kind = options.kind ?? (envKind === "memory" || envKind === "postgres" ? envKind : undefined) ?? (hasPostgres ? "postgres" : "memory");
  if (kind === "postgres") {
    const pool =
      options.pool ??
      new Pool({
        connectionString: options.connectionString ?? process.env["DATABASE_URL"] ?? process.env["POSTGRES_URL"]
      });
    return new PostgresBackupRepo(pool);
  }
  return new InMemoryBackupRepo();
}

export const backupRepo: BackupRepo = createBackupRepo();
