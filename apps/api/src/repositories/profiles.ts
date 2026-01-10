import type { Profile } from "@in-midst-my-life/schema";
import { Pool } from "pg";

export interface ProfileRepo {
  add(profile: Profile): Promise<Profile>;
  list(offset: number, limit: number): Promise<{ data: Profile[]; total: number }>;
  find(id: string): Promise<Profile | undefined>;
  update(id: string, patch: Partial<Profile>): Promise<Profile | undefined>;
  remove(id: string): Promise<boolean>;
  reset(): Promise<void>;
}

export type ProfileRepoKind = "memory" | "postgres";

export interface ProfileRepoOptions {
  kind?: ProfileRepoKind;
  connectionString?: string;
  pool?: Pool;
}

class InMemoryProfileRepo implements ProfileRepo {
  private data = new Map<string, Profile>();

  async add(profile: Profile) {
    const normalized: Profile = {
      ...profile,
      isActive: profile.isActive ?? true,
      createdAt: profile.createdAt ?? new Date().toISOString(),
      updatedAt: profile.updatedAt ?? new Date().toISOString()
    };
    this.data.set(profile.id, normalized);
    return normalized;
  }

  async list(offset: number, limit: number) {
    const profiles = Array.from(this.data.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const total = profiles.length;
    const data = profiles.slice(offset, offset + limit);
    return { data, total };
  }

  async find(id: string) {
    return this.data.get(id);
  }

  async update(id: string, patch: Partial<Profile>) {
    const existing = this.data.get(id);
    if (!existing) return undefined;
    const updated: Profile = {
      ...existing,
      ...patch,
      id: existing.id,
      identityId: existing.identityId,
      slug: patch.slug ?? existing.slug,
      displayName: patch.displayName ?? existing.displayName,
      isActive: patch.isActive ?? existing.isActive ?? true,
      createdAt: existing.createdAt,
      updatedAt: patch.updatedAt ?? new Date().toISOString()
    };
    this.data.set(id, updated);
    return updated;
  }

  async remove(id: string) {
    return this.data.delete(id);
  }

  async reset() {
    this.data.clear();
  }
}

class PostgresProfileRepo implements ProfileRepo {
  private pool: Pool;
  private ready: Promise<void>;

  constructor(pool: Pool) {
    this.pool = pool;
    this.ready = this.ensureTable();
  }

  private async ensureTable() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id uuid PRIMARY KEY,
        data jsonb NOT NULL,
        created_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL
      )
    `);
  }

  async add(profile: Profile) {
    await this.ready;
    await this.pool.query(
      `
      INSERT INTO profiles (id, data, created_at, updated_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = $4
    `,
      [profile.id, profile, profile.createdAt, profile.updatedAt]
    );
    return profile;
  }

  async list(offset: number, limit: number) {
    await this.ready;
    const [{ rows: dataRows }, { rows: totalRows }] = await Promise.all([
      this.pool.query<{ data: Profile }>(
        `SELECT data FROM profiles ORDER BY (data->>'createdAt')::timestamptz DESC OFFSET $1 LIMIT $2`,
        [offset, limit]
      ),
      this.pool.query<{ count: string }>(`SELECT COUNT(*)::text as count FROM profiles`)
    ]);
    const data = dataRows.map((r) => r.data as Profile);
    const total = Number(totalRows[0]?.count ?? 0);
    return { data, total };
  }

  async find(id: string) {
    await this.ready;
    const res = await this.pool.query<{ data: Profile }>(`SELECT data FROM profiles WHERE id = $1`, [id]);
    return res.rows[0]?.data as Profile | undefined;
  }

  async update(id: string, patch: Partial<Profile>) {
    await this.ready;
    const current = await this.find(id);
    if (!current) return undefined;
    const updated: Profile = {
      ...current,
      ...patch,
      updatedAt: patch.updatedAt ?? new Date().toISOString()
    };
    await this.pool.query(`UPDATE profiles SET data = $2, updated_at = $3 WHERE id = $1`, [
      id,
      updated,
      updated.updatedAt
    ]);
    return updated;
  }

  async remove(id: string) {
    await this.ready;
    const res = await this.pool.query(`DELETE FROM profiles WHERE id = $1`, [id]);
    return (res.rowCount ?? 0) > 0;
  }

  async reset() {
    await this.ready;
    await this.pool.query(`TRUNCATE TABLE profiles`);
  }
}

export function createProfileRepo(options: ProfileRepoOptions = {}): ProfileRepo {
  const hasPostgres = Boolean(options.connectionString ?? process.env["DATABASE_URL"] ?? process.env["POSTGRES_URL"]);
  const envKind = process.env["PROFILE_REPO"] ?? process.env["PROFILE_STORE"];
  const kind = options.kind ?? (envKind === "memory" || envKind === "postgres" ? envKind : undefined) ?? (hasPostgres ? "postgres" : "memory");
  if (kind === "postgres") {
    const pool =
      options.pool ??
      new Pool({
        connectionString: options.connectionString ?? process.env["DATABASE_URL"] ?? process.env["POSTGRES_URL"]
      });
    return new PostgresProfileRepo(pool);
  }
  return new InMemoryProfileRepo();
}

export const profileRepo: ProfileRepo = createProfileRepo();
