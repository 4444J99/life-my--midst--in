import type { TabulaPersonarum, TabulaPersonarumEntry, PersonaResonance } from "@in-midst-my-life/schema";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";

export interface TabulaPersonarumRepo {
  // Master index operations
  getOrCreate(profileId: string): Promise<TabulaPersonarum>;
  get(profileId: string): Promise<TabulaPersonarum | undefined>;
  update(profileId: string, patch: Partial<TabulaPersonarum>): Promise<TabulaPersonarum>;

  // Persona operations
  addPersona(profileId: string, persona: Omit<TabulaPersonarumEntry, "id" | "created_at" | "updated_at">): Promise<TabulaPersonarumEntry>;
  updatePersona(profileId: string, personaId: string, patch: Partial<TabulaPersonarumEntry>): Promise<TabulaPersonarumEntry | undefined>;
  deletePersona(profileId: string, personaId: string): Promise<boolean>;
  listPersonae(profileId: string, active?: boolean): Promise<TabulaPersonarumEntry[]>;
  getPersona(profileId: string, personaId: string): Promise<TabulaPersonarumEntry | undefined>;

  // Resonance tracking
  addResonance(profileId: string, resonance: Omit<PersonaResonance, "id">): Promise<PersonaResonance>;
  updateResonance(profileId: string, resonanceId: string, patch: Partial<PersonaResonance>): Promise<PersonaResonance | undefined>;
  listResonances(profileId: string, personaId?: string): Promise<PersonaResonance[]>;

  reset(): Promise<void>;
}

class InMemoryTabulaPersonarumRepo implements TabulaPersonarumRepo {
  private data = new Map<string, TabulaPersonarum>();
  private resonances = new Map<string, PersonaResonance[]>();

  async getOrCreate(profileId: string): Promise<TabulaPersonarum> {
    let index = this.data.get(profileId);
    if (!index) {
      const now = new Date().toISOString();
      index = {
        id: profileId,
        personas: [],
        persona_count: 0,
        created_at: now,
        updated_at: now
      };
      this.data.set(profileId, index);
      this.resonances.set(profileId, []);
    }
    return index;
  }

  async get(profileId: string): Promise<TabulaPersonarum | undefined> {
    return this.data.get(profileId);
  }

  async update(profileId: string, patch: Partial<TabulaPersonarum>): Promise<TabulaPersonarum> {
    const existing = await this.getOrCreate(profileId);
    const updated: TabulaPersonarum = {
      ...existing,
      ...patch,
      id: existing.id,
      updated_at: new Date().toISOString()
    };
    this.data.set(profileId, updated);
    return updated;
  }

  async addPersona(
    profileId: string,
    persona: Omit<TabulaPersonarumEntry, "id" | "created_at" | "updated_at">
  ): Promise<TabulaPersonarumEntry> {
    const index = await this.getOrCreate(profileId);
    const now = new Date().toISOString();
    const newPersona: TabulaPersonarumEntry = {
      ...persona,
      id: randomUUID(),
      created_at: now,
      updated_at: now
    };
    index.personas.push(newPersona);
    index.persona_count = index.personas.length;
    index.updated_at = now;
    this.data.set(profileId, index);
    return newPersona;
  }

  async updatePersona(
    profileId: string,
    personaId: string,
    patch: Partial<TabulaPersonarumEntry>
  ): Promise<TabulaPersonarumEntry | undefined> {
    const index = await this.getOrCreate(profileId);
    const idx = index.personas.findIndex((p) => p.id === personaId);
    if (idx === -1) return undefined;

    const now = new Date().toISOString();
    const updated: TabulaPersonarumEntry = {
      ...index.personas[idx],
      ...patch,
      id: personaId,
      created_at: index.personas[idx].created_at,
      updated_at: now
    };
    index.personas[idx] = updated;
    index.updated_at = now;
    this.data.set(profileId, index);
    return updated;
  }

  async deletePersona(profileId: string, personaId: string): Promise<boolean> {
    const index = await this.getOrCreate(profileId);
    const initial = index.personas.length;
    index.personas = index.personas.filter((p) => p.id !== personaId);
    if (index.personas.length < initial) {
      index.persona_count = index.personas.length;
      index.updated_at = new Date().toISOString();
      this.data.set(profileId, index);
      return true;
    }
    return false;
  }

  async listPersonae(profileId: string, active = true): Promise<TabulaPersonarumEntry[]> {
    const index = await this.getOrCreate(profileId);
    if (active) {
      return index.personas.filter((p) => p.active !== false);
    }
    return index.personas;
  }

  async getPersona(profileId: string, personaId: string): Promise<TabulaPersonarumEntry | undefined> {
    const index = await this.getOrCreate(profileId);
    return index.personas.find((p) => p.id === personaId);
  }

  async addResonance(
    profileId: string,
    resonance: Omit<PersonaResonance, "id">
  ): Promise<PersonaResonance> {
    const resonances = this.resonances.get(profileId) ?? [];
    const newResonance: PersonaResonance & { id?: string } = {
      ...resonance
    };
    resonances.push(newResonance as PersonaResonance);
    this.resonances.set(profileId, resonances);
    return newResonance as PersonaResonance;
  }

  async updateResonance(
    profileId: string,
    resonanceId: string,
    patch: Partial<PersonaResonance>
  ): Promise<PersonaResonance | undefined> {
    const resonances = this.resonances.get(profileId) ?? [];
    const idx = resonances.findIndex((r) => (r as any).id === resonanceId);
    if (idx === -1) return undefined;

    const updated = { ...resonances[idx], ...patch };
    resonances[idx] = updated;
    this.resonances.set(profileId, resonances);
    return updated;
  }

  async listResonances(profileId: string, personaId?: string): Promise<PersonaResonance[]> {
    const resonances = this.resonances.get(profileId) ?? [];
    if (personaId) {
      return resonances.filter((r) => r.persona_id === personaId);
    }
    return resonances;
  }

  async reset(): Promise<void> {
    this.data.clear();
    this.resonances.clear();
  }
}

class PostgresTabulaPersonarumRepo implements TabulaPersonarumRepo {
  private pool: Pool;
  private ready: Promise<void>;

  constructor(pool: Pool) {
    this.pool = pool;
    this.ready = this.ensureTables();
  }

  private async ensureTables() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS tabula_personarum (
        id uuid PRIMARY KEY,
        profile_id uuid NOT NULL UNIQUE,
        persona_count integer NOT NULL DEFAULT 0,
        current_primary uuid,
        data jsonb NOT NULL,
        created_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS personae (
        id uuid PRIMARY KEY,
        profile_id uuid NOT NULL REFERENCES tabula_personarum(profile_id) ON DELETE CASCADE,
        nomen varchar(255) NOT NULL,
        everyday_name varchar(255) NOT NULL,
        role_vector text NOT NULL,
        tone_register text NOT NULL,
        visibility_scope text[] NOT NULL,
        motto varchar(500),
        description text,
        active boolean DEFAULT true,
        created_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_personae_profile_id ON personae(profile_id);
      CREATE INDEX IF NOT EXISTS idx_personae_active ON personae(active);
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS persona_resonances (
        id uuid PRIMARY KEY,
        profile_id uuid NOT NULL REFERENCES tabula_personarum(profile_id) ON DELETE CASCADE,
        persona_id uuid NOT NULL REFERENCES personae(id) ON DELETE CASCADE,
        context varchar(255) NOT NULL,
        fit_score integer NOT NULL,
        alignment_keywords text[],
        misalignment_keywords text[],
        last_used timestamptz,
        success_count integer DEFAULT 0,
        feedback text,
        created_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_persona_resonances_profile_id ON persona_resonances(profile_id);
      CREATE INDEX IF NOT EXISTS idx_persona_resonances_persona_id ON persona_resonances(persona_id);
    `);
  }

  async getOrCreate(profileId: string): Promise<TabulaPersonarum> {
    await this.ready;
    const existing = await this.get(profileId);
    if (existing) return existing;

    const id = randomUUID();
    const now = new Date().toISOString();
    const index: TabulaPersonarum = {
      id,
      personas: [],
      persona_count: 0,
      created_at: now,
      updated_at: now
    };

    await this.pool.query(
      `INSERT INTO tabula_personarum (id, profile_id, persona_count, data, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (profile_id) DO NOTHING`,
      [id, profileId, 0, index, now, now]
    );

    return index;
  }

  async get(profileId: string): Promise<TabulaPersonarum | undefined> {
    await this.ready;
    const result = await this.pool.query(
      `SELECT data FROM tabula_personarum WHERE profile_id = $1`,
      [profileId]
    );
    if (result.rows.length === 0) return undefined;

    const indexData = result.rows[0].data as TabulaPersonarum;
    const personaeResult = await this.pool.query<any>(
      `SELECT id, nomen, everyday_name, role_vector, tone_register, visibility_scope, motto, description, active, created_at, updated_at
       FROM personae WHERE profile_id = $1 ORDER BY created_at`,
      [profileId]
    );

    return {
      ...indexData,
      personas: personaeResult.rows.map((r) => ({
        id: r.id,
        nomen: r.nomen,
        everyday_name: r.everyday_name,
        role_vector: r.role_vector,
        tone_register: r.tone_register,
        visibility_scope: r.visibility_scope,
        motto: r.motto,
        description: r.description,
        active: r.active,
        created_at: r.created_at,
        updated_at: r.updated_at
      }))
    };
  }

  async update(profileId: string, patch: Partial<TabulaPersonarum>): Promise<TabulaPersonarum> {
    await this.ready;
    const existing = await this.getOrCreate(profileId);
    const now = new Date().toISOString();
    const updated: TabulaPersonarum = {
      ...existing,
      ...patch,
      id: existing.id,
      updated_at: now
    };

    await this.pool.query(
      `UPDATE tabula_personarum SET data = $2, updated_at = $3 WHERE profile_id = $1`,
      [profileId, updated, now]
    );

    return updated;
  }

  async addPersona(
    profileId: string,
    persona: Omit<TabulaPersonarumEntry, "id" | "created_at" | "updated_at">
  ): Promise<TabulaPersonarumEntry> {
    await this.ready;
    await this.getOrCreate(profileId);
    const id = randomUUID();
    const now = new Date().toISOString();

    await this.pool.query(
      `INSERT INTO personae (
        id, profile_id, nomen, everyday_name, role_vector, tone_register, visibility_scope, motto, description, active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        id,
        profileId,
        persona.nomen,
        persona.everyday_name,
        persona.role_vector,
        persona.tone_register,
        persona.visibility_scope,
        persona.motto ?? null,
        persona.description ?? null,
        persona.active ?? true,
        now,
        now
      ]
    );

    await this.update(profileId, {});

    return { ...persona, id, created_at: now, updated_at: now };
  }

  async updatePersona(
    profileId: string,
    personaId: string,
    patch: Partial<TabulaPersonarumEntry>
  ): Promise<TabulaPersonarumEntry | undefined> {
    await this.ready;
    const current = await this.pool.query<any>(
      `SELECT * FROM personae WHERE id = $1 AND profile_id = $2`,
      [personaId, profileId]
    );

    if (current.rows.length === 0) return undefined;

    const now = new Date().toISOString();
    const updated = {
      ...current.rows[0],
      ...patch,
      id: personaId,
      created_at: current.rows[0].created_at,
      updated_at: now
    };

    await this.pool.query(
      `UPDATE personae SET nomen = $2, everyday_name = $3, role_vector = $4, tone_register = $5, visibility_scope = $6, motto = $7, description = $8, active = $9, updated_at = $10
       WHERE id = $1`,
      [
        personaId,
        updated.nomen,
        updated.everyday_name,
        updated.role_vector,
        updated.tone_register,
        updated.visibility_scope,
        updated.motto ?? null,
        updated.description ?? null,
        updated.active ?? true,
        now
      ]
    );

    await this.update(profileId, {});

    return updated;
  }

  async deletePersona(profileId: string, personaId: string): Promise<boolean> {
    await this.ready;
    const result = await this.pool.query(
      `DELETE FROM personae WHERE id = $1 AND profile_id = $2`,
      [personaId, profileId]
    );
    if (result.rowCount && result.rowCount > 0) {
      await this.update(profileId, {});
      return true;
    }
    return false;
  }

  async listPersonae(profileId: string, active = true): Promise<TabulaPersonarumEntry[]> {
    await this.ready;
    const query = active
      ? `SELECT * FROM personae WHERE profile_id = $1 AND active = true ORDER BY created_at`
      : `SELECT * FROM personae WHERE profile_id = $1 ORDER BY created_at`;

    const result = await this.pool.query<any>(query, [profileId]);
    return result.rows.map((r) => ({
      id: r.id,
      nomen: r.nomen,
      everyday_name: r.everyday_name,
      role_vector: r.role_vector,
      tone_register: r.tone_register,
      visibility_scope: r.visibility_scope,
      motto: r.motto,
      description: r.description,
      active: r.active,
      created_at: r.created_at,
      updated_at: r.updated_at
    }));
  }

  async getPersona(profileId: string, personaId: string): Promise<TabulaPersonarumEntry | undefined> {
    await this.ready;
    const result = await this.pool.query<any>(
      `SELECT * FROM personae WHERE id = $1 AND profile_id = $2`,
      [personaId, profileId]
    );
    if (result.rows.length === 0) return undefined;

    const r = result.rows[0];
    return {
      id: r.id,
      nomen: r.nomen,
      everyday_name: r.everyday_name,
      role_vector: r.role_vector,
      tone_register: r.tone_register,
      visibility_scope: r.visibility_scope,
      motto: r.motto,
      description: r.description,
      active: r.active,
      created_at: r.created_at,
      updated_at: r.updated_at
    };
  }

  async addResonance(
    profileId: string,
    resonance: Omit<PersonaResonance, "id">
  ): Promise<PersonaResonance> {
    await this.ready;
    const id = randomUUID();
    const now = new Date().toISOString();

    await this.pool.query(
      `INSERT INTO persona_resonances (
        id, profile_id, persona_id, context, fit_score, alignment_keywords, misalignment_keywords, last_used, success_count, feedback, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        id,
        profileId,
        resonance.persona_id,
        resonance.context,
        resonance.fit_score,
        resonance.alignment_keywords ?? [],
        resonance.misalignment_keywords ?? [],
        resonance.last_used ?? null,
        resonance.success_count ?? 0,
        resonance.feedback ?? null,
        now,
        now
      ]
    );

    return { ...resonance, persona_id: resonance.persona_id };
  }

  async updateResonance(
    profileId: string,
    resonanceId: string,
    patch: Partial<PersonaResonance>
  ): Promise<PersonaResonance | undefined> {
    await this.ready;
    const current = await this.pool.query<any>(
      `SELECT * FROM persona_resonances WHERE id = $1 AND profile_id = $2`,
      [resonanceId, profileId]
    );

    if (current.rows.length === 0) return undefined;

    const now = new Date().toISOString();
    const updated = { ...current.rows[0], ...patch };

    await this.pool.query(
      `UPDATE persona_resonances SET fit_score = $2, alignment_keywords = $3, misalignment_keywords = $4, last_used = $5, success_count = $6, feedback = $7, updated_at = $8
       WHERE id = $1`,
      [
        resonanceId,
        updated.fit_score,
        updated.alignment_keywords ?? [],
        updated.misalignment_keywords ?? [],
        updated.last_used ?? null,
        updated.success_count ?? 0,
        updated.feedback ?? null,
        now
      ]
    );

    return updated;
  }

  async listResonances(profileId: string, personaId?: string): Promise<PersonaResonance[]> {
    await this.ready;
    if (personaId) {
      const result = await this.pool.query<any>(
        `SELECT * FROM persona_resonances WHERE profile_id = $1 AND persona_id = $2 ORDER BY fit_score DESC`,
        [profileId, personaId]
      );
      return result.rows;
    }

    const result = await this.pool.query<any>(
      `SELECT * FROM persona_resonances WHERE profile_id = $1 ORDER BY fit_score DESC`,
      [profileId]
    );
    return result.rows;
  }

  async reset(): Promise<void> {
    await this.ready;
    await this.pool.query(`TRUNCATE TABLE persona_resonances CASCADE`);
    await this.pool.query(`TRUNCATE TABLE personae CASCADE`);
    await this.pool.query(`TRUNCATE TABLE tabula_personarum CASCADE`);
  }
}

export function createTabulaPersonarumRepo(options: {
  kind?: "memory" | "postgres";
  connectionString?: string;
  pool?: Pool;
} = {}): TabulaPersonarumRepo {
  const hasPostgres = Boolean(
    options.connectionString ?? process.env["DATABASE_URL"] ?? process.env["POSTGRES_URL"]
  );
  const kind =
    options.kind ??
    (process.env["TABULA_REPO"] === "memory" || process.env["TABULA_REPO"] === "postgres"
      ? process.env["TABULA_REPO"]
      : undefined) ??
    (hasPostgres ? "postgres" : "memory");

  if (kind === "postgres") {
    const pool =
      options.pool ??
      new Pool({
        connectionString:
          options.connectionString ?? process.env["DATABASE_URL"] ?? process.env["POSTGRES_URL"]
      });
    return new PostgresTabulaPersonarumRepo(pool);
  }

  return new InMemoryTabulaPersonarumRepo();
}

export const tabulaPersonarumRepo: TabulaPersonarumRepo = createTabulaPersonarumRepo();
