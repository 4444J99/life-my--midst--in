import type { CurriculumVitaeMultiplex, CVEntry, CVFilter } from "@in-midst-my-life/schema";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";

export interface CVMultiplexRepo {
  // Master CV operations
  getOrCreate(profileId: string): Promise<CurriculumVitaeMultiplex>;
  get(profileId: string): Promise<CurriculumVitaeMultiplex | undefined>;
  update(profileId: string, patch: Partial<CurriculumVitaeMultiplex>): Promise<CurriculumVitaeMultiplex>;

  // CV entry operations
  addEntry(profileId: string, entry: Omit<CVEntry, "id">): Promise<CVEntry>;
  updateEntry(profileId: string, entryId: string, patch: Partial<CVEntry>): Promise<CVEntry | undefined>;
  deleteEntry(profileId: string, entryId: string): Promise<boolean>;
  listEntries(
    profileId: string,
    filter?: CVFilter,
    offset?: number,
    limit?: number
  ): Promise<{ data: CVEntry[]; total: number }>;

  // Filtering operations
  filterByPersonae(profileId: string, personae: string[]): Promise<CVEntry[]>;
  filterByAetas(profileId: string, aetas: string[]): Promise<CVEntry[]>;
  filterByScaenae(profileId: string, scaenae: string[]): Promise<CVEntry[]>;
  filterByMultipleDimensions(
    profileId: string,
    filter: CVFilter
  ): Promise<{ data: CVEntry[]; total: number }>;

  reset(): Promise<void>;
}

class InMemoryCVMultiplexRepo implements CVMultiplexRepo {
  private data = new Map<string, CurriculumVitaeMultiplex>();

  async getOrCreate(profileId: string): Promise<CurriculumVitaeMultiplex> {
    let cv = this.data.get(profileId);
    if (!cv) {
      const now = new Date().toISOString();
      cv = {
        id: profileId,
        version: 1,
        entries: [],
        createdAt: now,
        updatedAt: now
      };
      this.data.set(profileId, cv);
    }
    return cv;
  }

  async get(profileId: string): Promise<CurriculumVitaeMultiplex | undefined> {
    return this.data.get(profileId);
  }

  async update(
    profileId: string,
    patch: Partial<CurriculumVitaeMultiplex>
  ): Promise<CurriculumVitaeMultiplex> {
    const existing = await this.getOrCreate(profileId);
    const updated: CurriculumVitaeMultiplex = {
      ...existing,
      ...patch,
      id: existing.id,
      version: (existing.version ?? 1) + 1,
      updatedAt: new Date().toISOString()
    };
    this.data.set(profileId, updated);
    return updated;
  }

  async addEntry(profileId: string, entry: Omit<CVEntry, "id">): Promise<CVEntry> {
    const cv = await this.getOrCreate(profileId);
    const newEntry: CVEntry = {
      ...entry,
      id: randomUUID()
    };
    cv.entries.push(newEntry);
    cv.updatedAt = new Date().toISOString();
    cv.version = (cv.version ?? 1) + 1;
    this.data.set(profileId, cv);
    return newEntry;
  }

  async updateEntry(
    profileId: string,
    entryId: string,
    patch: Partial<CVEntry>
  ): Promise<CVEntry | undefined> {
    const cv = await this.getOrCreate(profileId);
    const index = cv.entries.findIndex((e) => e.id === entryId);
    if (index === -1) return undefined;

    const updated: CVEntry = { ...cv.entries[index], ...patch, id: entryId };
    cv.entries[index] = updated;
    cv.updatedAt = new Date().toISOString();
    cv.version = (cv.version ?? 1) + 1;
    this.data.set(profileId, cv);
    return updated;
  }

  async deleteEntry(profileId: string, entryId: string): Promise<boolean> {
    const cv = await this.getOrCreate(profileId);
    const initialLength = cv.entries.length;
    cv.entries = cv.entries.filter((e) => e.id !== entryId);
    if (cv.entries.length < initialLength) {
      cv.updatedAt = new Date().toISOString();
      cv.version = (cv.version ?? 1) + 1;
      this.data.set(profileId, cv);
      return true;
    }
    return false;
  }

  async listEntries(
    profileId: string,
    filter?: CVFilter,
    offset = 0,
    limit = 50
  ): Promise<{ data: CVEntry[]; total: number }> {
    const cv = await this.getOrCreate(profileId);
    const filtered = await this.filterByMultipleDimensions(profileId, filter ?? {});
    const data = filtered.data
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
      .slice(offset, offset + limit);
    return { data, total: filtered.total };
  }

  async filterByPersonae(profileId: string, personae: string[]): Promise<CVEntry[]> {
    const cv = await this.get(profileId);
    if (!cv) return [];
    if (personae.length === 0) return cv.entries;
    return cv.entries.filter(
      (e) => !e.personae || e.personae.length === 0 || e.personae.some((p) => personae.includes(p))
    );
  }

  async filterByAetas(profileId: string, aetas: string[]): Promise<CVEntry[]> {
    const cv = await this.get(profileId);
    if (!cv) return [];
    if (aetas.length === 0) return cv.entries;
    return cv.entries.filter(
      (e) => !e.aetas || e.aetas.length === 0 || e.aetas.some((a) => aetas.includes(a))
    );
  }

  async filterByScaenae(profileId: string, scaenae: string[]): Promise<CVEntry[]> {
    const cv = await this.get(profileId);
    if (!cv) return [];
    if (scaenae.length === 0) return cv.entries;
    return cv.entries.filter(
      (e) => !e.scaenae || e.scaenae.length === 0 || e.scaenae.some((s) => scaenae.includes(s))
    );
  }

  async filterByMultipleDimensions(
    profileId: string,
    filter: CVFilter
  ): Promise<{ data: CVEntry[]; total: number }> {
    let entries = (await this.get(profileId))?.entries ?? [];

    // Apply personae filters (require dimension exists AND matches for include)
    if (filter.includePersonae && filter.includePersonae.length > 0) {
      entries = entries.filter(
        (e) => e.personae && e.personae.length > 0 && e.personae.some((p) => filter.includePersonae!.includes(p))
      );
    }
    if (filter.excludePersonae && filter.excludePersonae.length > 0) {
      entries = entries.filter(
        (e) => !e.personae || !e.personae.some((p) => filter.excludePersonae!.includes(p))
      );
    }

    // Apply aetas filters
    if (filter.includeAetas && filter.includeAetas.length > 0) {
      entries = entries.filter(
        (e) => e.aetas && e.aetas.length > 0 && e.aetas.some((a) => filter.includeAetas!.includes(a))
      );
    }
    if (filter.excludeAetas && filter.excludeAetas.length > 0) {
      entries = entries.filter((e) => !e.aetas || !e.aetas.some((a) => filter.excludeAetas!.includes(a)));
    }

    // Apply scaenae filters
    if (filter.includeScaenae && filter.includeScaenae.length > 0) {
      entries = entries.filter(
        (e) => e.scaenae && e.scaenae.length > 0 && e.scaenae.some((s) => filter.includeScaenae!.includes(s))
      );
    }
    if (filter.excludeScaenae && filter.excludeScaenae.length > 0) {
      entries = entries.filter((e) => !e.scaenae || !e.scaenae.some((s) => filter.excludeScaenae!.includes(s)));
    }

    // Apply tag filters
    if (filter.includeTags && filter.includeTags.length > 0) {
      entries = entries.filter(
        (e) => e.tags && e.tags.length > 0 && e.tags.some((t) => filter.includeTags!.includes(t))
      );
    }
    if (filter.excludeTags && filter.excludeTags.length > 0) {
      entries = entries.filter((e) => !e.tags || !e.tags.some((t) => filter.excludeTags!.includes(t)));
    }

    // Apply priority filter
    if (filter.minPriority !== undefined) {
      entries = entries.filter((e) => (e.priority ?? 0) >= filter.minPriority!);
    }

    return { data: entries, total: entries.length };
  }

  async reset(): Promise<void> {
    this.data.clear();
  }
}

class PostgresCVMultiplexRepo implements CVMultiplexRepo {
  private pool: Pool;
  private ready: Promise<void>;

  constructor(pool: Pool) {
    this.pool = pool;
    this.ready = this.ensureTables();
  }

  private async ensureTables() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS curriculum_vitae (
        profile_id uuid PRIMARY KEY,
        version integer NOT NULL DEFAULT 1,
        data jsonb NOT NULL,
        created_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS cv_entries (
        id uuid PRIMARY KEY,
        profile_id uuid NOT NULL REFERENCES curriculum_vitae(profile_id) ON DELETE CASCADE,
        entry_type varchar(50) NOT NULL,
        content text NOT NULL,
        personae text[],
        aetas text[],
        scaenae text[],
        priority integer,
        tags text[],
        metadata jsonb,
        start_date timestamptz,
        end_date timestamptz,
        created_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL,
        FOREIGN KEY (profile_id) REFERENCES curriculum_vitae(profile_id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_cv_entries_profile_id ON cv_entries(profile_id);
      CREATE INDEX IF NOT EXISTS idx_cv_entries_personae ON cv_entries USING GIN(personae);
      CREATE INDEX IF NOT EXISTS idx_cv_entries_aetas ON cv_entries USING GIN(aetas);
      CREATE INDEX IF NOT EXISTS idx_cv_entries_scaenae ON cv_entries USING GIN(scaenae);
      CREATE INDEX IF NOT EXISTS idx_cv_entries_tags ON cv_entries USING GIN(tags);
    `);
  }

  async getOrCreate(profileId: string): Promise<CurriculumVitaeMultiplex> {
    await this.ready;
    const existing = await this.get(profileId);
    if (existing) return existing;

    const now = new Date().toISOString();
    const cv: CurriculumVitaeMultiplex = {
      id: profileId,
      version: 1,
      entries: [],
      createdAt: now,
      updatedAt: now
    };

    await this.pool.query(
      `INSERT INTO curriculum_vitae (profile_id, version, data, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (profile_id) DO NOTHING`,
      [profileId, 1, cv, now, now]
    );

    return cv;
  }

  async get(profileId: string): Promise<CurriculumVitaeMultiplex | undefined> {
    await this.ready;
    const result = await this.pool.query(
      `SELECT data FROM curriculum_vitae WHERE profile_id = $1`,
      [profileId]
    );
    if (result.rows.length === 0) return undefined;

    const cvData = result.rows[0].data as CurriculumVitaeMultiplex;
    const entriesResult = await this.pool.query<any>(
      `SELECT id, entry_type as type, content, personae, aetas, scaenae, priority, tags, metadata, start_date as "startDate", end_date as "endDate"
       FROM cv_entries WHERE profile_id = $1 ORDER BY priority DESC NULLS LAST`,
      [profileId]
    );

    return {
      ...cvData,
      entries: entriesResult.rows.map((r) => ({
        id: r.id,
        type: r.type,
        content: r.content,
        personae: r.personae,
        aetas: r.aetas,
        scaenae: r.scaenae,
        priority: r.priority,
        tags: r.tags,
        metadata: r.metadata,
        startDate: r.startDate,
        endDate: r.endDate
      }))
    };
  }

  async update(
    profileId: string,
    patch: Partial<CurriculumVitaeMultiplex>
  ): Promise<CurriculumVitaeMultiplex> {
    await this.ready;
    const existing = await this.getOrCreate(profileId);
    const now = new Date().toISOString();
    const updated: CurriculumVitaeMultiplex = {
      ...existing,
      ...patch,
      id: existing.id,
      version: (existing.version ?? 1) + 1,
      updatedAt: now
    };

    await this.pool.query(
      `UPDATE curriculum_vitae SET version = $2, data = $3, updated_at = $4 WHERE profile_id = $1`,
      [profileId, updated.version, updated, now]
    );

    return updated;
  }

  async addEntry(profileId: string, entry: Omit<CVEntry, "id">): Promise<CVEntry> {
    await this.ready;
    await this.getOrCreate(profileId);
    const id = randomUUID();
    const now = new Date().toISOString();

    await this.pool.query(
      `INSERT INTO cv_entries (
        id, profile_id, entry_type, content, personae, aetas, scaenae, priority, tags, metadata, start_date, end_date, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        id,
        profileId,
        entry.type,
        entry.content,
        entry.personae ?? [],
        entry.aetas ?? [],
        entry.scaenae ?? [],
        entry.priority ?? null,
        entry.tags ?? [],
        entry.metadata ?? null,
        entry.startDate ?? null,
        entry.endDate ?? null,
        now,
        now
      ]
    );

    await this.update(profileId, {});

    return { ...entry, id };
  }

  async updateEntry(
    profileId: string,
    entryId: string,
    patch: Partial<CVEntry>
  ): Promise<CVEntry | undefined> {
    await this.ready;
    const now = new Date().toISOString();

    const current = await this.pool.query<any>(
      `SELECT * FROM cv_entries WHERE id = $1 AND profile_id = $2`,
      [entryId, profileId]
    );

    if (current.rows.length === 0) return undefined;

    const updated: CVEntry = {
      ...current.rows[0],
      ...patch,
      id: entryId
    };

    await this.pool.query(
      `UPDATE cv_entries SET entry_type = $2, content = $3, personae = $4, aetas = $5, scaenae = $6, priority = $7, tags = $8, metadata = $9, start_date = $10, end_date = $11, updated_at = $12
       WHERE id = $1`,
      [
        entryId,
        updated.type,
        updated.content,
        updated.personae ?? [],
        updated.aetas ?? [],
        updated.scaenae ?? [],
        updated.priority ?? null,
        updated.tags ?? [],
        updated.metadata ?? null,
        updated.startDate ?? null,
        updated.endDate ?? null,
        now
      ]
    );

    await this.update(profileId, {});

    return updated;
  }

  async deleteEntry(profileId: string, entryId: string): Promise<boolean> {
    await this.ready;
    const result = await this.pool.query(
      `DELETE FROM cv_entries WHERE id = $1 AND profile_id = $2`,
      [entryId, profileId]
    );
    if (result.rowCount && result.rowCount > 0) {
      await this.update(profileId, {});
      return true;
    }
    return false;
  }

  async listEntries(
    profileId: string,
    filter?: CVFilter,
    offset = 0,
    limit = 50
  ): Promise<{ data: CVEntry[]; total: number }> {
    const filtered = await this.filterByMultipleDimensions(profileId, filter ?? {});
    const data = filtered.data
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
      .slice(offset, offset + limit);
    return { data, total: filtered.total };
  }

  async filterByPersonae(profileId: string, personae: string[]): Promise<CVEntry[]> {
    await this.ready;
    if (personae.length === 0) {
      const result = await this.pool.query<any>(
        `SELECT id, entry_type as type, content, personae, aetas, scaenae, priority, tags, metadata, start_date as "startDate", end_date as "endDate"
         FROM cv_entries WHERE profile_id = $1`,
        [profileId]
      );
      return this.mapRows(result.rows);
    }

    const result = await this.pool.query<any>(
      `SELECT id, entry_type as type, content, personae, aetas, scaenae, priority, tags, metadata, start_date as "startDate", end_date as "endDate"
       FROM cv_entries WHERE profile_id = $1 AND (personae IS NULL OR personae = '{}' OR personae && $2::text[])`,
      [profileId, personae]
    );
    return this.mapRows(result.rows);
  }

  async filterByAetas(profileId: string, aetas: string[]): Promise<CVEntry[]> {
    await this.ready;
    if (aetas.length === 0) {
      const result = await this.pool.query<any>(
        `SELECT id, entry_type as type, content, personae, aetas, scaenae, priority, tags, metadata, start_date as "startDate", end_date as "endDate"
         FROM cv_entries WHERE profile_id = $1`,
        [profileId]
      );
      return this.mapRows(result.rows);
    }

    const result = await this.pool.query<any>(
      `SELECT id, entry_type as type, content, personae, aetas, scaenae, priority, tags, metadata, start_date as "startDate", end_date as "endDate"
       FROM cv_entries WHERE profile_id = $1 AND (aetas IS NULL OR aetas = '{}' OR aetas && $2::text[])`,
      [profileId, aetas]
    );
    return this.mapRows(result.rows);
  }

  async filterByScaenae(profileId: string, scaenae: string[]): Promise<CVEntry[]> {
    await this.ready;
    if (scaenae.length === 0) {
      const result = await this.pool.query<any>(
        `SELECT id, entry_type as type, content, personae, aetas, scaenae, priority, tags, metadata, start_date as "startDate", end_date as "endDate"
         FROM cv_entries WHERE profile_id = $1`,
        [profileId]
      );
      return this.mapRows(result.rows);
    }

    const result = await this.pool.query<any>(
      `SELECT id, entry_type as type, content, personae, aetas, scaenae, priority, tags, metadata, start_date as "startDate", end_date as "endDate"
       FROM cv_entries WHERE profile_id = $1 AND (scaenae IS NULL OR scaenae = '{}' OR scaenae && $2::text[])`,
      [profileId, scaenae]
    );
    return this.mapRows(result.rows);
  }

  async filterByMultipleDimensions(
    profileId: string,
    filter: CVFilter
  ): Promise<{ data: CVEntry[]; total: number }> {
    await this.ready;
    let query = `SELECT id, entry_type as type, content, personae, aetas, scaenae, priority, tags, metadata, start_date as "startDate", end_date as "endDate" FROM cv_entries WHERE profile_id = $1`;
    const params: any[] = [profileId];
    let paramIndex = 2;

    // For include filters, require dimension exists AND matches (for AND logic)
    if (filter.includePersonae && filter.includePersonae.length > 0) {
      query += ` AND personae IS NOT NULL AND personae != '{}' AND personae && $${paramIndex}::text[]`;
      params.push(filter.includePersonae);
      paramIndex++;
    }

    if (filter.excludePersonae && filter.excludePersonae.length > 0) {
      query += ` AND (personae IS NULL OR NOT personae && $${paramIndex}::text[])`;
      params.push(filter.excludePersonae);
      paramIndex++;
    }

    if (filter.includeAetas && filter.includeAetas.length > 0) {
      query += ` AND aetas IS NOT NULL AND aetas != '{}' AND aetas && $${paramIndex}::text[]`;
      params.push(filter.includeAetas);
      paramIndex++;
    }

    if (filter.excludeAetas && filter.excludeAetas.length > 0) {
      query += ` AND (aetas IS NULL OR NOT aetas && $${paramIndex}::text[])`;
      params.push(filter.excludeAetas);
      paramIndex++;
    }

    if (filter.includeScaenae && filter.includeScaenae.length > 0) {
      query += ` AND scaenae IS NOT NULL AND scaenae != '{}' AND scaenae && $${paramIndex}::text[]`;
      params.push(filter.includeScaenae);
      paramIndex++;
    }

    if (filter.excludeScaenae && filter.excludeScaenae.length > 0) {
      query += ` AND (scaenae IS NULL OR NOT scaenae && $${paramIndex}::text[])`;
      params.push(filter.excludeScaenae);
      paramIndex++;
    }

    if (filter.includeTags && filter.includeTags.length > 0) {
      query += ` AND tags IS NOT NULL AND tags != '{}' AND tags && $${paramIndex}::text[]`;
      params.push(filter.includeTags);
      paramIndex++;
    }

    if (filter.excludeTags && filter.excludeTags.length > 0) {
      query += ` AND (tags IS NULL OR NOT tags && $${paramIndex}::text[])`;
      params.push(filter.excludeTags);
      paramIndex++;
    }

    if (filter.minPriority !== undefined) {
      query += ` AND priority >= $${paramIndex}`;
      params.push(filter.minPriority);
      paramIndex++;
    }

    query += ` ORDER BY priority DESC NULLS LAST`;

    const result = await this.pool.query<any>(query, params);
    return { data: this.mapRows(result.rows), total: result.rows.length };
  }

  private mapRows(rows: any[]): CVEntry[] {
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      content: r.content,
      personae: r.personae,
      aetas: r.aetas,
      scaenae: r.scaenae,
      priority: r.priority,
      tags: r.tags,
      metadata: r.metadata,
      startDate: r.startDate,
      endDate: r.endDate
    }));
  }

  async reset(): Promise<void> {
    await this.ready;
    await this.pool.query(`TRUNCATE TABLE cv_entries CASCADE`);
    await this.pool.query(`TRUNCATE TABLE curriculum_vitae CASCADE`);
  }
}

export function createCVMultiplexRepo(options: {
  kind?: "memory" | "postgres";
  connectionString?: string;
  pool?: Pool;
} = {}): CVMultiplexRepo {
  const hasPostgres = Boolean(
    options.connectionString ?? process.env["DATABASE_URL"] ?? process.env["POSTGRES_URL"]
  );
  const kind =
    options.kind ??
    (process.env["CV_REPO"] === "memory" || process.env["CV_REPO"] === "postgres"
      ? process.env["CV_REPO"]
      : undefined) ??
    (hasPostgres ? "postgres" : "memory");

  if (kind === "postgres") {
    const pool =
      options.pool ??
      new Pool({
        connectionString:
          options.connectionString ?? process.env["DATABASE_URL"] ?? process.env["POSTGRES_URL"]
      });
    return new PostgresCVMultiplexRepo(pool);
  }

  return new InMemoryCVMultiplexRepo();
}

export const cvMultiplexRepo: CVMultiplexRepo = createCVMultiplexRepo();
