import type {
  Experience,
  Education,
  Project,
  Skill,
  Publication,
  Award,
  Certification,
  CustomSection,
  SocialLink,
  VerifiableCredential,
  AttestationLink,
  ContentEdge,
  ContentRevision,
  TimelineEvent,
  VerificationLog
} from "@in-midst-my-life/schema";
import { Pool } from "pg";

type JsonbEntityBase = {
  id: string;
  createdAt: string;
  updatedAt: string;
};

type ProfileIdSelector<T> = (entity: T) => string;

export interface JsonbEntityRepo<T> {
  list(profileId: string, offset: number, limit: number): Promise<{ data: T[]; total: number }>;
  get(id: string): Promise<T | undefined>;
  create(entity: T): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T | undefined>;
  delete(id: string): Promise<boolean>;
  reset(): Promise<void>;
  createOrUpdateByExternalId?(entity: T, externalId: string): Promise<T>;
}

class InMemoryJsonbRepo<T extends JsonbEntityBase> implements JsonbEntityRepo<T> {
  private data = new Map<string, T>();
  private profileId: ProfileIdSelector<T>;

  constructor(profileId: ProfileIdSelector<T>) {
    this.profileId = profileId;
  }

  async list(profileId: string, offset: number, limit: number) {
    const values = Array.from(this.data.values()).filter((entity) => this.profileId(entity) === profileId);
    const sorted = [...values].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    const slice = sorted.slice(offset, offset + limit);
    return { data: slice, total: sorted.length };
  }

  async get(id: string) {
    return this.data.get(id);
  }

  async create(entity: T) {
    const now = new Date().toISOString();
    const normalized = {
      ...entity,
      createdAt: entity.createdAt ?? now,
      updatedAt: entity.updatedAt ?? now
    };
    this.data.set(entity.id, normalized);
    return normalized;
  }

  async createOrUpdateByExternalId(entity: T, externalId: string): Promise<T> {
    const existing = Array.from(this.data.values()).find(
      (item) => (item as any).externalId === externalId && this.profileId(item) === this.profileId(entity)
    );

    if (existing) {
      return this.update(existing.id, entity) as Promise<T>;
    }
    return this.create(entity);
  }

  async update(id: string, patch: Partial<T>) {
    const existing = this.data.get(id);
    if (!existing) return undefined;
    const updated = {
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: patch.updatedAt ?? new Date().toISOString()
    };
    this.data.set(id, updated);
    return updated;
  }

  async delete(id: string) {
    const had = this.data.delete(id);
    return had;
  }

  async reset() {
    this.data.clear();
  }
}

class PostgresJsonbRepo<T extends JsonbEntityBase> implements JsonbEntityRepo<T> {
  private pool: Pool;
  private table: string;
  private profileId: ProfileIdSelector<T>;

  constructor(pool: Pool, table: string, profileId: ProfileIdSelector<T>) {
    this.pool = pool;
    this.table = table;
    this.profileId = profileId;
  }

  async list(profileId: string, offset: number, limit: number) {
    const dataQuery = `SELECT data FROM ${this.table} WHERE profile_id = $1 ORDER BY (data->>'updatedAt')::timestamptz DESC OFFSET $2 LIMIT $3`;
    const countQuery = `SELECT COUNT(*)::text as count FROM ${this.table} WHERE profile_id = $1`;
    const [{ rows: dataRows }, { rows: countRows }] = await Promise.all([
      this.pool.query<{ data: T }>(dataQuery, [profileId, offset, limit]),
      this.pool.query<{ count: string }>(countQuery, [profileId])
    ]);
    return { data: dataRows.map((row) => row.data), total: Number(countRows[0]?.count ?? 0) };
  }

  async get(id: string) {
    const res = await this.pool.query<{ data: T }>(`SELECT data FROM ${this.table} WHERE id = $1`, [id]);
    return res.rows[0]?.data ?? undefined;
  }

  async create(entity: T) {
    const now = new Date().toISOString();
    const normalized = {
      ...entity,
      createdAt: entity.createdAt ?? now,
      updatedAt: entity.updatedAt ?? now
    };
    const profileId = this.profileId(normalized as T);
    await this.pool.query(
      `INSERT INTO ${this.table} (id, profile_id, data, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`,
      [normalized.id, profileId, normalized, normalized.createdAt, normalized.updatedAt]
    );
    return normalized;
  }

  async createOrUpdateByExternalId(entity: T, externalId: string): Promise<T> {
    // Note: This relies on the table having a partial index or we just check strictly by data->>'externalId'
    // For performance, a real index on (profile_id, (data->>'externalId')) is recommended.
    const profileId = this.profileId(entity);
    
    // Check if exists
    const existingRes = await this.pool.query(
      `SELECT id FROM ${this.table} WHERE profile_id = $1 AND data->>'externalId' = $2`,
      [profileId, externalId]
    );
    
    if (existingRes.rows.length > 0) {
      const id = existingRes.rows[0].id;
      return this.update(id, entity) as Promise<T>;
    }
    
    return this.create(entity);
  }

  async update(id: string, patch: Partial<T>) {
    const existing = await this.get(id);
    if (!existing) return undefined;
    const updated = {
      ...existing,
      ...patch,
      id: (existing as T).id,
      createdAt: (existing as T).createdAt,
      updatedAt: (patch as T).updatedAt ?? new Date().toISOString()
    };
    const profileId = this.profileId(updated as T);
    await this.pool.query(`UPDATE ${this.table} SET data = $2, updated_at = $3, profile_id = $4 WHERE id = $1`, [
      id,
      updated,
      (updated as T).updatedAt,
      profileId
    ]);
    return updated as T;
  }

  async delete(id: string) {
    const res = await this.pool.query(`DELETE FROM ${this.table} WHERE id = $1`, [id]);
    return (res.rowCount ?? 0) > 0;
  }

  async reset() {
    await this.pool.query(`TRUNCATE TABLE ${this.table}`);
  }
}

export interface AttestationRepo {
  list(profileId: string, offset: number, limit: number): Promise<{ data: AttestationLink[]; total: number }>;
  get(id: string): Promise<AttestationLink | undefined>;
  create(profileId: string, link: AttestationLink): Promise<AttestationLink>;
  update(id: string, profileId: string, patch: Partial<AttestationLink>): Promise<AttestationLink | undefined>;
  delete(id: string): Promise<boolean>;
  reset(): Promise<void>;
}

class InMemoryAttestationRepo implements AttestationRepo {
  private data = new Map<string, AttestationLink>();
  private profileIndex = new Map<string, Set<string>>();

  private index(profileId: string, id: string) {
    if (!this.profileIndex.has(profileId)) this.profileIndex.set(profileId, new Set());
    this.profileIndex.get(profileId)?.add(id);
  }

  private deindex(profileId: string, id: string) {
    this.profileIndex.get(profileId)?.delete(id);
  }

  async list(profileId: string, offset: number, limit: number) {
    const ids = Array.from(this.profileIndex.get(profileId) ?? []);
    const values = ids.map((id) => this.data.get(id)).filter(Boolean) as AttestationLink[];
    const sorted = [...values].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    const slice = sorted.slice(offset, offset + limit);
    return { data: slice, total: sorted.length };
  }

  async get(id: string) {
    return this.data.get(id);
  }

  async create(profileId: string, link: AttestationLink) {
    const now = new Date().toISOString();
    const normalized: AttestationLink = {
      ...link,
      profileId,
      visibility: link.visibility ?? "public",
      createdAt: link.createdAt ?? now,
      updatedAt: link.updatedAt ?? now
    };
    this.data.set(link.id, normalized);
    this.index(profileId, link.id);
    return normalized;
  }

  async update(id: string, profileId: string, patch: Partial<AttestationLink>) {
    const existing = this.data.get(id);
    if (!existing) return undefined;
    const updated: AttestationLink = {
      ...existing,
      ...patch,
      id: existing.id,
      profileId,
      createdAt: existing.createdAt,
      updatedAt: patch.updatedAt ?? new Date().toISOString()
    };
    this.data.set(id, updated);
    this.index(profileId, id);
    return updated;
  }

  async delete(id: string) {
    const existing = this.data.get(id);
    if (!existing) return false;
    if (existing.profileId) this.deindex(existing.profileId, id);
    return this.data.delete(id);
  }

  async reset() {
    this.data.clear();
    this.profileIndex.clear();
  }
}

class PostgresAttestationRepo implements AttestationRepo {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async list(profileId: string, offset: number, limit: number) {
    const rows = await this.pool.query(
      `SELECT id, profile_id, credential_id, target_type, target_id, visibility, label_override, created_at, updated_at
       FROM attestation_links
       WHERE profile_id = $1
       ORDER BY updated_at DESC
       OFFSET $2 LIMIT $3`,
      [profileId, offset, limit]
    );
    const totalRes = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM attestation_links WHERE profile_id = $1`,
      [profileId]
    );
    return {
      data: rows.rows.map(mapAttestationRow),
      total: Number(totalRes.rows[0]?.count ?? 0)
    };
  }

  async get(id: string) {
    const res = await this.pool.query(
      `SELECT id, profile_id, credential_id, target_type, target_id, visibility, label_override, created_at, updated_at
       FROM attestation_links WHERE id = $1`,
      [id]
    );
    return res.rows[0] ? mapAttestationRow(res.rows[0]) : undefined;
  }

  async create(profileId: string, link: AttestationLink) {
    const now = new Date().toISOString();
    const normalized: AttestationLink = {
      ...link,
      profileId,
      visibility: link.visibility ?? "public",
      createdAt: link.createdAt ?? now,
      updatedAt: link.updatedAt ?? now
    };
    await this.pool.query(
      `INSERT INTO attestation_links (id, profile_id, credential_id, target_type, target_id, visibility, label_override, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO UPDATE SET
         profile_id = EXCLUDED.profile_id,
         credential_id = EXCLUDED.credential_id,
         target_type = EXCLUDED.target_type,
         target_id = EXCLUDED.target_id,
         visibility = EXCLUDED.visibility,
         label_override = EXCLUDED.label_override,
         updated_at = EXCLUDED.updated_at`,
      [
        normalized.id,
        profileId,
        normalized.credentialId,
        normalized.entityType,
        normalized.entityId,
        normalized.visibility,
        normalized.labelOverride ?? null,
        normalized.createdAt,
        normalized.updatedAt
      ]
    );
    return normalized;
  }

  async update(id: string, profileId: string, patch: Partial<AttestationLink>) {
    const existing = await this.get(id);
    if (!existing) return undefined;
    const updated: AttestationLink = {
      ...existing,
      ...patch,
      id: existing.id,
      profileId,
      createdAt: existing.createdAt,
      updatedAt: patch.updatedAt ?? new Date().toISOString()
    };
    await this.create(profileId, updated);
    return updated;
  }

  async delete(id: string) {
    const res = await this.pool.query(`DELETE FROM attestation_links WHERE id = $1`, [id]);
    return (res.rowCount ?? 0) > 0;
  }

  async reset() {
    await this.pool.query(`TRUNCATE TABLE attestation_links`);
  }
}

export interface ContentEdgeRepo {
  list(profileId: string, offset: number, limit: number): Promise<{ data: ContentEdge[]; total: number }>;
  get(id: string): Promise<ContentEdge | undefined>;
  create(edge: ContentEdge): Promise<ContentEdge>;
  update(id: string, patch: Partial<ContentEdge>): Promise<ContentEdge | undefined>;
  delete(id: string): Promise<boolean>;
  reset(): Promise<void>;
}

class InMemoryContentEdgeRepo implements ContentEdgeRepo {
  private data = new Map<string, ContentEdge>();

  async list(profileId: string, offset: number, limit: number) {
    const values = Array.from(this.data.values()).filter((edge) => edge.profileId === profileId);
    const sorted = [...values].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    const slice = sorted.slice(offset, offset + limit);
    return { data: slice, total: sorted.length };
  }

  async get(id: string) {
    return this.data.get(id);
  }

  async create(edge: ContentEdge) {
    const now = new Date().toISOString();
    const normalized = {
      ...edge,
      createdAt: edge.createdAt ?? now,
      updatedAt: edge.updatedAt ?? now
    };
    this.data.set(edge.id, normalized);
    return normalized;
  }

  async update(id: string, patch: Partial<ContentEdge>) {
    const existing = this.data.get(id);
    if (!existing) return undefined;
    const updated = {
      ...existing,
      ...patch,
      id: existing.id,
      profileId: existing.profileId,
      createdAt: existing.createdAt,
      updatedAt: patch.updatedAt ?? new Date().toISOString()
    };
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

class PostgresContentEdgeRepo implements ContentEdgeRepo {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async list(profileId: string, offset: number, limit: number) {
    const res = await this.pool.query(
      `SELECT id, profile_id, from_type, from_id, to_type, to_id, relation_type, metadata, created_at, updated_at
       FROM content_edges
       WHERE profile_id = $1
       ORDER BY updated_at DESC
       OFFSET $2 LIMIT $3`,
      [profileId, offset, limit]
    );
    const totalRes = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM content_edges WHERE profile_id = $1`,
      [profileId]
    );
    return { data: res.rows.map(mapEdgeRow), total: Number(totalRes.rows[0]?.count ?? 0) };
  }

  async get(id: string) {
    const res = await this.pool.query(
      `SELECT id, profile_id, from_type, from_id, to_type, to_id, relation_type, metadata, created_at, updated_at
       FROM content_edges WHERE id = $1`,
      [id]
    );
    return res.rows[0] ? mapEdgeRow(res.rows[0]) : undefined;
  }

  async create(edge: ContentEdge) {
    const now = new Date().toISOString();
    const normalized = {
      ...edge,
      createdAt: edge.createdAt ?? now,
      updatedAt: edge.updatedAt ?? now
    };
    await this.pool.query(
      `INSERT INTO content_edges (id, profile_id, from_type, from_id, to_type, to_id, relation_type, metadata, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO UPDATE SET
         profile_id = EXCLUDED.profile_id,
         from_type = EXCLUDED.from_type,
         from_id = EXCLUDED.from_id,
         to_type = EXCLUDED.to_type,
         to_id = EXCLUDED.to_id,
         relation_type = EXCLUDED.relation_type,
         metadata = EXCLUDED.metadata,
         updated_at = EXCLUDED.updated_at`,
      [
        normalized.id,
        normalized.profileId,
        normalized.fromType,
        normalized.fromId,
        normalized.toType,
        normalized.toId,
        normalized.relationType,
        normalized.metadata ?? {},
        normalized.createdAt,
        normalized.updatedAt
      ]
    );
    return normalized;
  }

  async update(id: string, patch: Partial<ContentEdge>) {
    const existing = await this.get(id);
    if (!existing) return undefined;
    const updated = {
      ...existing,
      ...patch,
      id: existing.id,
      profileId: existing.profileId,
      createdAt: existing.createdAt,
      updatedAt: patch.updatedAt ?? new Date().toISOString()
    };
    await this.create(updated);
    return updated;
  }

  async delete(id: string) {
    const res = await this.pool.query(`DELETE FROM content_edges WHERE id = $1`, [id]);
    return (res.rowCount ?? 0) > 0;
  }

  async reset() {
    await this.pool.query(`TRUNCATE TABLE content_edges`);
  }
}

export interface ContentRevisionRepo {
  list(
    profileId: string,
    entityType: string | undefined,
    entityId: string | undefined,
    offset: number,
    limit: number
  ): Promise<{ data: ContentRevision[]; total: number }>;
  get(id: string): Promise<ContentRevision | undefined>;
  create(revision: ContentRevision): Promise<ContentRevision>;
  delete(id: string): Promise<boolean>;
  reset(): Promise<void>;
}

class InMemoryContentRevisionRepo implements ContentRevisionRepo {
  private data = new Map<string, ContentRevision>();

  async list(profileId: string, entityType: string | undefined, entityId: string | undefined, offset: number, limit: number) {
    const values = Array.from(this.data.values()).filter((revision) => {
      if (revision.profileId !== profileId) return false;
      if (entityType && revision.entityType !== entityType) return false;
      if (entityId && revision.entityId !== entityId) return false;
      return true;
    });
    const sorted = [...values].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const slice = sorted.slice(offset, offset + limit);
    return { data: slice, total: sorted.length };
  }

  async get(id: string) {
    return this.data.get(id);
  }

  async create(revision: ContentRevision) {
    const now = new Date().toISOString();
    const normalized = {
      ...revision,
      createdAt: revision.createdAt ?? now
    };
    this.data.set(revision.id, normalized);
    return normalized;
  }

  async delete(id: string) {
    return this.data.delete(id);
  }

  async reset() {
    this.data.clear();
  }
}

class PostgresContentRevisionRepo implements ContentRevisionRepo {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async list(profileId: string, entityType: string | undefined, entityId: string | undefined, offset: number, limit: number) {
    const clauses: string[] = ["profile_id = $1"];
    const params: any[] = [profileId];
    if (entityType) {
      clauses.push(`entity_type = $${params.length + 1}`);
      params.push(entityType);
    }
    if (entityId) {
      clauses.push(`entity_id = $${params.length + 1}`);
      params.push(entityId);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const query = `SELECT id, profile_id, entity_type, entity_id, data, created_at
       FROM content_revisions
       ${where}
       ORDER BY created_at DESC
       OFFSET $${params.length + 1} LIMIT $${params.length + 2}`;
    const countQuery = `SELECT COUNT(*)::text as count FROM content_revisions ${where}`;
    const [{ rows }, { rows: countRows }] = await Promise.all([
      this.pool.query(query, [...params, offset, limit]),
      this.pool.query<{ count: string }>(countQuery, params)
    ]);
    return { data: rows.map(mapRevisionRow), total: Number(countRows[0]?.count ?? 0) };
  }

  async get(id: string) {
    const res = await this.pool.query(
      `SELECT id, profile_id, entity_type, entity_id, data, created_at FROM content_revisions WHERE id = $1`,
      [id]
    );
    return res.rows[0] ? mapRevisionRow(res.rows[0]) : undefined;
  }

  async create(revision: ContentRevision) {
    const now = new Date().toISOString();
    const normalized = {
      ...revision,
      createdAt: revision.createdAt ?? now
    };
    await this.pool.query(
      `INSERT INTO content_revisions (id, profile_id, entity_type, entity_id, data, created_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
      [normalized.id, normalized.profileId, normalized.entityType, normalized.entityId, normalized.data, normalized.createdAt]
    );
    return normalized;
  }

  async delete(id: string) {
    const res = await this.pool.query(`DELETE FROM content_revisions WHERE id = $1`, [id]);
    return (res.rowCount ?? 0) > 0;
  }

  async reset() {
    await this.pool.query(`TRUNCATE TABLE content_revisions`);
  }
}

export interface CvRepos {
  experiences: JsonbEntityRepo<Experience>;
  educations: JsonbEntityRepo<Education>;
  projects: JsonbEntityRepo<Project>;
  skills: JsonbEntityRepo<Skill>;
  publications: JsonbEntityRepo<Publication>;
  awards: JsonbEntityRepo<Award>;
  certifications: JsonbEntityRepo<Certification>;
  customSections: JsonbEntityRepo<CustomSection>;
  socialLinks: JsonbEntityRepo<SocialLink>;
  timelineEvents: JsonbEntityRepo<TimelineEvent>;
  verificationLogs: JsonbEntityRepo<VerificationLog>;
  credentials: JsonbEntityRepo<VerifiableCredential>;
  attestations: AttestationRepo;
  edges: ContentEdgeRepo;
  revisions: ContentRevisionRepo;
}

export type CvRepoKind = "memory" | "postgres";

export interface CvRepoOptions {
  kind?: CvRepoKind;
  pool?: Pool;
  connectionString?: string;
}

export function createCvRepos(options: CvRepoOptions = {}): CvRepos {
  const hasPostgres = Boolean(process.env["DATABASE_URL"] ?? process.env["POSTGRES_URL"]);
  const kind = options.kind ?? (process.env["CV_REPO"] ?? (hasPostgres ? "postgres" : "memory"));
  if (kind === "postgres") {
    const pool =
      options.pool ?? new Pool({ connectionString: options.connectionString ?? process.env["DATABASE_URL"] ?? process.env["POSTGRES_URL"] });
    return {
      experiences: new PostgresJsonbRepo(pool, "experiences", (e: Experience) => e.profileId),
      educations: new PostgresJsonbRepo(pool, "educations", (e: Education) => e.profileId),
      projects: new PostgresJsonbRepo(pool, "projects", (e: Project) => e.profileId),
      skills: new PostgresJsonbRepo(pool, "skills", (e: Skill) => e.profileId),
      publications: new PostgresJsonbRepo(pool, "publications", (e: Publication) => e.profileId),
      awards: new PostgresJsonbRepo(pool, "awards", (e: Award) => e.profileId),
      certifications: new PostgresJsonbRepo(pool, "certifications", (e: Certification) => e.profileId),
      customSections: new PostgresJsonbRepo(pool, "custom_sections", (e: CustomSection) => e.profileId),
      socialLinks: new PostgresJsonbRepo(pool, "social_links", (e: SocialLink) => e.profileId),
      timelineEvents: new PostgresJsonbRepo(pool, "timeline_events", (e: TimelineEvent) => e.profileId),
      verificationLogs: new PostgresJsonbRepo(pool, "verification_logs", (e: VerificationLog) => e.profileId),
      credentials: new PostgresJsonbRepo(pool, "verifiable_credentials", (e: VerifiableCredential) => e.subjectProfileId),
      attestations: new PostgresAttestationRepo(pool),
      edges: new PostgresContentEdgeRepo(pool),
      revisions: new PostgresContentRevisionRepo(pool)
    };
  }

  return {
    experiences: new InMemoryJsonbRepo((e: Experience) => e.profileId),
    educations: new InMemoryJsonbRepo((e: Education) => e.profileId),
    projects: new InMemoryJsonbRepo((e: Project) => e.profileId),
    skills: new InMemoryJsonbRepo((e: Skill) => e.profileId),
    publications: new InMemoryJsonbRepo((e: Publication) => e.profileId),
    awards: new InMemoryJsonbRepo((e: Award) => e.profileId),
    certifications: new InMemoryJsonbRepo((e: Certification) => e.profileId),
    customSections: new InMemoryJsonbRepo((e: CustomSection) => e.profileId),
    socialLinks: new InMemoryJsonbRepo((e: SocialLink) => e.profileId),
    timelineEvents: new InMemoryJsonbRepo((e: TimelineEvent) => e.profileId),
    verificationLogs: new InMemoryJsonbRepo((e: VerificationLog) => e.profileId),
    credentials: new InMemoryJsonbRepo((e: VerifiableCredential) => e.subjectProfileId),
    attestations: new InMemoryAttestationRepo(),
    edges: new InMemoryContentEdgeRepo(),
    revisions: new InMemoryContentRevisionRepo()
  };
}

export const cvRepos: CvRepos = createCvRepos();

function mapAttestationRow(row: any): AttestationLink {
  return {
    id: row.id,
    profileId: row.profile_id ?? undefined,
    credentialId: row.credential_id,
    entityType: row.target_type,
    entityId: row.target_id,
    visibility: row.visibility,
    labelOverride: row.label_override ?? undefined,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at
  };
}

function mapEdgeRow(row: any): ContentEdge {
  return {
    id: row.id,
    profileId: row.profile_id,
    fromType: row.from_type,
    fromId: row.from_id,
    toType: row.to_type,
    toId: row.to_id,
    relationType: row.relation_type,
    metadata: row.metadata ?? {},
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at
  };
}

function mapRevisionRow(row: any): ContentRevision {
  return {
    id: row.id,
    profileId: row.profile_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    data: row.data ?? {},
    createdAt: row.created_at?.toISOString?.() ?? row.created_at
  };
}
