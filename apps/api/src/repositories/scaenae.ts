import type { ScaenaeTaxonomy, Scaena, CanonicalScaenaType } from "@in-midst-my-life/schema";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";

export interface ScaenaeRepo {
  // Taxonomy operations
  getTaxonomy(systemId?: string): Promise<ScaenaeTaxonomy>;
  updateTaxonomy(patch: Partial<ScaenaeTaxonomy>): Promise<ScaenaeTaxonomy>;

  // Scaena operations
  listScaenae(canonical?: boolean): Promise<Scaena[]>;
  getScaena(scaenaId: string): Promise<Scaena | undefined>;
  getScaenaByName(name: string): Promise<Scaena | undefined>;
  addScaena(scaena: Omit<Scaena, "id">): Promise<Scaena>;
  updateScaena(scaenaId: string, patch: Partial<Scaena>): Promise<Scaena | undefined>;
  deleteScaena(scaenaId: string): Promise<boolean>;

  // Canonical scaenae (standard, immutable)
  getCanonicalScaenae(): Promise<Scaena[]>;
  initializeCanonicalScaenae(): Promise<void>;

  reset(): Promise<void>;
}

const CANONICAL_SCAENAE: Omit<Scaena, "id">[] = [
  {
    name: "Academica",
    latin_name: "Academica",
    description: "Educational, scholarly, and research contexts",
    audience: "Professors, researchers, students, academic institutions",
    formality_level: "formal",
    visibility: "semi-public",
    typical_activities: ["Research publication", "Teaching", "Peer review", "Conference speaking"],
    tone_expectations: "Scholarly, rigorous, evidence-based",
    metadata: {
      canonical: true,
      color_theme: "#4A90E2",
      icon: "🎓"
    }
  },
  {
    name: "Technica",
    latin_name: "Technica",
    description: "Technical, engineering, and architectural contexts",
    audience: "Engineers, architects, technical leaders, tech companies",
    formality_level: "professional",
    visibility: "semi-public",
    typical_activities: ["Architecture discussion", "Code review", "System design", "Technical mentoring"],
    tone_expectations: "Precise, technical, evidence-driven",
    metadata: {
      canonical: true,
      color_theme: "#7B68EE",
      icon: "⚙️"
    }
  },
  {
    name: "Artistica",
    latin_name: "Artistica",
    description: "Creative, artistic, and expressive contexts",
    audience: "Artists, designers, creators, creative communities",
    formality_level: "casual",
    visibility: "public",
    typical_activities: ["Creative project showcase", "Design thinking", "Artistic collaboration", "Exhibition"],
    tone_expectations: "Exploratory, expressive, imaginative",
    metadata: {
      canonical: true,
      color_theme: "#FF6B9D",
      icon: "🎨"
    }
  },
  {
    name: "Civica",
    latin_name: "Civica",
    description: "Civic, organizational, and institutional contexts",
    audience: "Organizations, institutions, non-profits, government, civic leaders",
    formality_level: "formal",
    visibility: "public",
    typical_activities: ["Organizational leadership", "Policy discussion", "Community organizing", "Governance"],
    tone_expectations: "Professional, responsible, community-oriented",
    metadata: {
      canonical: true,
      color_theme: "#50C878",
      icon: "🏛️"
    }
  },
  {
    name: "Domestica",
    latin_name: "Domestica",
    description: "Personal, family, and intimate contexts",
    audience: "Family, close friends, intimate relationships",
    formality_level: "casual",
    visibility: "private",
    typical_activities: ["Family activities", "Personal sharing", "Intimate conversation", "Domestic life"],
    tone_expectations: "Authentic, warm, personal",
    metadata: {
      canonical: true,
      color_theme: "#FFD700",
      icon: "🏠"
    }
  },
  {
    name: "Occulta",
    latin_name: "Occulta",
    description: "Hidden, private, and internal contexts",
    audience: "Self, therapist, trusted confidants",
    formality_level: "casual",
    visibility: "private",
    typical_activities: ["Personal reflection", "Therapy", "Journaling", "Private meditation"],
    tone_expectations: "Honest, introspective, unfiltered",
    metadata: {
      canonical: true,
      color_theme: "#9370DB",
      icon: "🔮"
    }
  }
];

class InMemoryScaenaeRepo implements ScaenaeRepo {
  private taxonomy: ScaenaeTaxonomy;
  private scaenae: Map<string, Scaena>;

  constructor() {
    this.scaenae = new Map();
    const now = new Date().toISOString();
    this.taxonomy = {
      id: "taxonomy-scaenae-default",
      version: 1,
      scaenae: [],
      canonical_scaenae: ["Academica", "Technica", "Artistica", "Civica", "Domestica", "Occulta"],
      custom_scaenae: [],
      created_at: now,
      updated_at: now
    };
  }

  async getTaxonomy(): Promise<ScaenaeTaxonomy> {
    return {
      ...this.taxonomy,
      scaenae: Array.from(this.scaenae.values())
    };
  }

  async updateTaxonomy(patch: Partial<ScaenaeTaxonomy>): Promise<ScaenaeTaxonomy> {
    const now = new Date().toISOString();
    this.taxonomy = {
      ...this.taxonomy,
      ...patch,
      updated_at: now,
      scaenae: Array.from(this.scaenae.values())
    };
    return this.taxonomy;
  }

  async listScaenae(canonical = false): Promise<Scaena[]> {
    const scaenae = Array.from(this.scaenae.values());
    if (canonical) {
      return scaenae.filter((s) => s.metadata?.canonical === true);
    }
    return scaenae;
  }

  async getScaena(scaenaId: string): Promise<Scaena | undefined> {
    return this.scaenae.get(scaenaId);
  }

  async getScaenaByName(name: string): Promise<Scaena | undefined> {
    for (const scaena of this.scaenae.values()) {
      if (scaena.name === name) return scaena;
    }
    return undefined;
  }

  async addScaena(scaena: Omit<Scaena, "id">): Promise<Scaena> {
    const id = randomUUID();
    const full: Scaena = { ...scaena, id };
    this.scaenae.set(id, full);
    if (scaena.metadata?.canonical !== true) {
      this.taxonomy.custom_scaenae?.push(full.name);
    }
    await this.updateTaxonomy({});
    return full;
  }

  async updateScaena(scaenaId: string, patch: Partial<Scaena>): Promise<Scaena | undefined> {
    const existing = this.scaenae.get(scaenaId);
    if (!existing) return undefined;

    const updated: Scaena = { ...existing, ...patch, id: scaenaId };
    this.scaenae.set(scaenaId, updated);
    await this.updateTaxonomy({});
    return updated;
  }

  async deleteScaena(scaenaId: string): Promise<boolean> {
    const scaena = this.scaenae.get(scaenaId);
    if (!scaena) return false;

    this.scaenae.delete(scaenaId);
    if (!scaena.metadata?.canonical) {
      this.taxonomy.custom_scaenae = this.taxonomy.custom_scaenae?.filter((n) => n !== scaena.name);
    }
    await this.updateTaxonomy({});
    return true;
  }

  async getCanonicalScaenae(): Promise<Scaena[]> {
    return this.listScaenae(true);
  }

  async initializeCanonicalScaenae(): Promise<void> {
    for (const scaena of CANONICAL_SCAENAE) {
      const existing = await this.getScaenaByName(scaena.name);
      if (!existing) {
        await this.addScaena(scaena);
      }
    }
  }

  async reset(): Promise<void> {
    this.scaenae.clear();
    const now = new Date().toISOString();
    this.taxonomy = {
      id: "taxonomy-scaenae-default",
      version: 1,
      scaenae: [],
      canonical_scaenae: ["Academica", "Technica", "Artistica", "Civica", "Domestica", "Occulta"],
      custom_scaenae: [],
      created_at: now,
      updated_at: now
    };
  }
}

class PostgresScaenaeRepo implements ScaenaeRepo {
  private pool: Pool;
  private ready: Promise<void>;

  constructor(pool: Pool) {
    this.pool = pool;
    this.ready = this.ensureTables();
  }

  private async ensureTables() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS scaenae_taxonomy (
        id uuid PRIMARY KEY,
        version integer NOT NULL DEFAULT 1,
        canonical_scaenae text[] NOT NULL,
        custom_scaenae text[],
        data jsonb NOT NULL,
        created_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS scaenae (
        id uuid PRIMARY KEY,
        name varchar(255) NOT NULL UNIQUE,
        latin_name varchar(255) NOT NULL,
        description text NOT NULL,
        audience text NOT NULL,
        formality_level varchar(50) NOT NULL,
        visibility varchar(50) NOT NULL,
        typical_activities text[],
        tone_expectations text,
        metadata jsonb,
        canonical boolean DEFAULT false,
        created_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_scaenae_canonical ON scaenae(canonical);
      CREATE INDEX IF NOT EXISTS idx_scaenae_name ON scaenae(name);
    `);
  }

  async getTaxonomy(): Promise<ScaenaeTaxonomy> {
    await this.ready;
    const result = await this.pool.query(
      `SELECT data FROM scaenae_taxonomy ORDER BY created_at DESC LIMIT 1`
    );

    let taxonomy: ScaenaeTaxonomy;
    if (result.rows.length === 0) {
      const now = new Date().toISOString();
      taxonomy = {
        id: randomUUID(),
        version: 1,
        scaenae: [],
        canonical_scaenae: ["Academica", "Technica", "Artistica", "Civica", "Domestica", "Occulta"],
        custom_scaenae: [],
        created_at: now,
        updated_at: now
      };
      await this.pool.query(
        `INSERT INTO scaenae_taxonomy (id, version, canonical_scaenae, data, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          taxonomy.id,
          taxonomy.version,
          taxonomy.canonical_scaenae,
          taxonomy,
          now,
          now
        ]
      );
    } else {
      taxonomy = result.rows[0].data as ScaenaeTaxonomy;
    }

    const scaenaeResult = await this.pool.query<any>(
      `SELECT id, name, latin_name, description, audience, formality_level, visibility, typical_activities, tone_expectations, metadata
       FROM scaenae ORDER BY canonical DESC, name`
    );

    return {
      ...taxonomy,
      scaenae: scaenaeResult.rows.map((r) => ({
        id: r.id,
        name: r.name,
        latin_name: r.latin_name,
        description: r.description,
        audience: r.audience,
        formality_level: r.formality_level,
        visibility: r.visibility,
        typical_activities: r.typical_activities,
        tone_expectations: r.tone_expectations,
        metadata: r.metadata
      }))
    };
  }

  async updateTaxonomy(patch: Partial<ScaenaeTaxonomy>): Promise<ScaenaeTaxonomy> {
    await this.ready;
    const existing = await this.getTaxonomy();
    const now = new Date().toISOString();
    const updated: ScaenaeTaxonomy = {
      ...existing,
      ...patch,
      updated_at: now
    };

    await this.pool.query(
      `UPDATE scaenae_taxonomy SET version = $2, data = $3, canonical_scaenae = $4, custom_scaenae = $5, updated_at = $6
       WHERE id = $1`,
      [
        existing.id,
        updated.version,
        updated,
        updated.canonical_scaenae,
        updated.custom_scaenae,
        now
      ]
    );

    return updated;
  }

  async listScaenae(canonical = false): Promise<Scaena[]> {
    await this.ready;
    const query = canonical
      ? `SELECT id, name, latin_name, description, audience, formality_level, visibility, typical_activities, tone_expectations, metadata
         FROM scaenae WHERE canonical = true ORDER BY name`
      : `SELECT id, name, latin_name, description, audience, formality_level, visibility, typical_activities, tone_expectations, metadata
         FROM scaenae ORDER BY canonical DESC, name`;

    const result = await this.pool.query<any>(query);
    return result.rows.map((r) => ({
      id: r.id,
      name: r.name,
      latin_name: r.latin_name,
      description: r.description,
      audience: r.audience,
      formality_level: r.formality_level,
      visibility: r.visibility,
      typical_activities: r.typical_activities,
      tone_expectations: r.tone_expectations,
      metadata: r.metadata
    }));
  }

  async getScaena(scaenaId: string): Promise<Scaena | undefined> {
    await this.ready;
    const result = await this.pool.query<any>(
      `SELECT id, name, latin_name, description, audience, formality_level, visibility, typical_activities, tone_expectations, metadata
       FROM scaenae WHERE id = $1`,
      [scaenaId]
    );

    if (result.rows.length === 0) return undefined;
    const r = result.rows[0];
    return {
      id: r.id,
      name: r.name,
      latin_name: r.latin_name,
      description: r.description,
      audience: r.audience,
      formality_level: r.formality_level,
      visibility: r.visibility,
      typical_activities: r.typical_activities,
      tone_expectations: r.tone_expectations,
      metadata: r.metadata
    };
  }

  async getScaenaByName(name: string): Promise<Scaena | undefined> {
    await this.ready;
    const result = await this.pool.query<any>(
      `SELECT id, name, latin_name, description, audience, formality_level, visibility, typical_activities, tone_expectations, metadata
       FROM scaenae WHERE name = $1`,
      [name]
    );

    if (result.rows.length === 0) return undefined;
    const r = result.rows[0];
    return {
      id: r.id,
      name: r.name,
      latin_name: r.latin_name,
      description: r.description,
      audience: r.audience,
      formality_level: r.formality_level,
      visibility: r.visibility,
      typical_activities: r.typical_activities,
      tone_expectations: r.tone_expectations,
      metadata: r.metadata
    };
  }

  async addScaena(scaena: Omit<Scaena, "id">): Promise<Scaena> {
    await this.ready;
    const id = randomUUID();
    const now = new Date().toISOString();
    const isCanonical = scaena.metadata?.canonical === true;

    await this.pool.query(
      `INSERT INTO scaenae (id, name, latin_name, description, audience, formality_level, visibility, typical_activities, tone_expectations, metadata, canonical, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        id,
        scaena.name,
        scaena.latin_name,
        scaena.description,
        scaena.audience,
        scaena.formality_level,
        scaena.visibility,
        scaena.typical_activities ?? [],
        scaena.tone_expectations,
        scaena.metadata,
        isCanonical,
        now,
        now
      ]
    );

    if (!isCanonical) {
      const taxonomy = await this.getTaxonomy();
      taxonomy.custom_scaenae?.push(scaena.name);
      await this.updateTaxonomy({ custom_scaenae: taxonomy.custom_scaenae });
    }

    return { ...scaena, id };
  }

  async updateScaena(scaenaId: string, patch: Partial<Scaena>): Promise<Scaena | undefined> {
    await this.ready;
    const existing = await this.getScaena(scaenaId);
    if (!existing) return undefined;

    const now = new Date().toISOString();
    const updated: Scaena = { ...existing, ...patch, id: scaenaId };

    await this.pool.query(
      `UPDATE scaenae SET name = $2, latin_name = $3, description = $4, audience = $5, formality_level = $6, visibility = $7, typical_activities = $8, tone_expectations = $9, metadata = $10, updated_at = $11
       WHERE id = $1`,
      [
        scaenaId,
        updated.name,
        updated.latin_name,
        updated.description,
        updated.audience,
        updated.formality_level,
        updated.visibility,
        updated.typical_activities ?? [],
        updated.tone_expectations,
        updated.metadata,
        now
      ]
    );

    await this.updateTaxonomy({});

    return updated;
  }

  async deleteScaena(scaenaId: string): Promise<boolean> {
    await this.ready;
    const scaena = await this.getScaena(scaenaId);
    if (!scaena) return false;

    await this.pool.query(`DELETE FROM scaenae WHERE id = $1`, [scaenaId]);

    if (!scaena.metadata?.canonical) {
      const taxonomy = await this.getTaxonomy();
      taxonomy.custom_scaenae = taxonomy.custom_scaenae?.filter((n) => n !== scaena.name);
      await this.updateTaxonomy({ custom_scaenae: taxonomy.custom_scaenae });
    }

    return true;
  }

  async getCanonicalScaenae(): Promise<Scaena[]> {
    return this.listScaenae(true);
  }

  async initializeCanonicalScaenae(): Promise<void> {
    for (const scaena of CANONICAL_SCAENAE) {
      const existing = await this.getScaenaByName(scaena.name);
      if (!existing) {
        await this.addScaena(scaena);
      }
    }
  }

  async reset(): Promise<void> {
    await this.ready;
    await this.pool.query(`TRUNCATE TABLE scaenae CASCADE`);
    await this.pool.query(`TRUNCATE TABLE scaenae_taxonomy CASCADE`);
  }
}

export function createScaenaeRepo(options: {
  kind?: "memory" | "postgres";
  connectionString?: string;
  pool?: Pool;
} = {}): ScaenaeRepo {
  const hasPostgres = Boolean(
    options.connectionString ?? process.env["DATABASE_URL"] ?? process.env["POSTGRES_URL"]
  );
  const kind =
    options.kind ??
    (process.env["SCAENAE_REPO"] === "memory" || process.env["SCAENAE_REPO"] === "postgres"
      ? process.env["SCAENAE_REPO"]
      : undefined) ??
    (hasPostgres ? "postgres" : "memory");

  if (kind === "postgres") {
    const pool =
      options.pool ??
      new Pool({
        connectionString:
          options.connectionString ?? process.env["DATABASE_URL"] ?? process.env["POSTGRES_URL"]
      });
    return new PostgresScaenaeRepo(pool);
  }

  return new InMemoryScaenaeRepo();
}

export const scaenaeRepo: ScaenaeRepo = createScaenaeRepo();
