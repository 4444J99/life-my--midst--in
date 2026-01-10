import type { Mask, Epoch, Stage } from "@in-midst-my-life/schema";
import { MASK_TAXONOMY, EPOCH_TAXONOMY } from "@in-midst-my-life/content-model";
import { Pool } from "pg";

export interface MaskRepo {
  list(
    offset: number,
    limit: number,
    filters?: { ontology?: string; tag?: string; search?: string }
  ): Promise<{ data: Mask[]; total: number }>;
  get(id: string): Promise<Mask | undefined>;
  create(mask: Mask): Promise<Mask>;
  update(id: string, patch: Partial<Mask>): Promise<Mask | undefined>;
  delete(id: string): Promise<boolean>;
}

export interface EpochRepo {
  list(): Promise<Epoch[]>;
  get(id: string): Promise<Epoch | undefined>;
  create(epoch: Epoch): Promise<Epoch>;
  update(id: string, patch: Partial<Epoch>): Promise<Epoch | undefined>;
  delete(id: string): Promise<boolean>;
}

export interface StageRepo {
  list(epochId?: string, offset?: number, limit?: number): Promise<{ data: Stage[]; total: number }>;
  get(id: string): Promise<Stage | undefined>;
  create(stage: Stage): Promise<Stage>;
  update(id: string, patch: Partial<Stage>): Promise<Stage | undefined>;
  delete(id: string): Promise<boolean>;
}

class InMemoryMaskRepo implements MaskRepo {
  constructor(private masks: Mask[]) {}

  async list(offset: number, limit: number, filters?: { ontology?: string; tag?: string; search?: string }) {
    const filtered = this.masks.filter((mask) => {
      if (filters?.ontology && mask.ontology !== filters.ontology) return false;
      if (filters?.tag) {
        const tag = filters.tag.toLowerCase();
        const include = mask.filters.include_tags.map((t) => t.toLowerCase());
        if (!include.includes(tag)) return false;
      }
      if (filters?.search) {
        const needle = filters.search.toLowerCase();
        return (
          mask.name.toLowerCase().includes(needle) ||
          mask.functional_scope.toLowerCase().includes(needle) ||
          mask.activation_rules.contexts.some((c) => c.toLowerCase().includes(needle))
        );
      }
      return true;
    });
    const slice = filtered.slice(offset, offset + limit);
    return { data: slice, total: filtered.length };
  }

  async get(id: string) {
    return this.masks.find((m) => m.id === id);
  }

  async create(mask: Mask) {
    this.masks.push(mask);
    return mask;
  }

  async update(id: string, patch: Partial<Mask>) {
    const idx = this.masks.findIndex((m) => m.id === id);
    if (idx === -1) return undefined;
    const updated: Mask = { ...this.masks[idx], ...patch } as Mask;
    this.masks[idx] = updated;
    return updated;
  }

  async delete(id: string) {
    const before = this.masks.length;
    this.masks = this.masks.filter((m) => m.id !== id);
    return this.masks.length < before;
  }
}

class InMemoryEpochRepo implements EpochRepo {
  constructor(private epochs: Epoch[]) {}

  async list() {
    return [...this.epochs].sort((a, b) => a.order - b.order);
  }

  async get(id: string) {
    return this.epochs.find((e) => e.id === id);
  }

  async create(epoch: Epoch) {
    this.epochs.push(epoch);
    return epoch;
  }

  async update(id: string, patch: Partial<Epoch>) {
    const idx = this.epochs.findIndex((e) => e.id === id);
    if (idx === -1) return undefined;
    const existing = this.epochs[idx];
    if (!existing) return undefined;
    const updated: Epoch = { ...existing, ...patch, order: patch.order ?? existing.order } as Epoch;
    this.epochs[idx] = updated;
    return updated;
  }

  async delete(id: string) {
    const before = this.epochs.length;
    this.epochs = this.epochs.filter((e) => e.id !== id);
    return this.epochs.length < before;
  }
}

class InMemoryStageRepo implements StageRepo {
  constructor(private stages: Stage[]) {}

  async list(epochId?: string, offset = 0, limit = 100) {
    const filtered = epochId ? this.stages.filter((s) => s.epochId === epochId) : this.stages;
    const sorted = [...filtered].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const slice = sorted.slice(offset, offset + limit);
    return { data: slice, total: sorted.length };
  }

  async get(id: string) {
    return this.stages.find((s) => s.id === id);
  }

  async create(stage: Stage) {
    this.stages.push(stage);
    return stage;
  }

  async update(id: string, patch: Partial<Stage>) {
    const idx = this.stages.findIndex((s) => s.id === id);
    if (idx === -1) return undefined;
    const updated: Stage = { ...this.stages[idx], ...patch } as Stage;
    this.stages[idx] = updated;
    return updated;
  }

  async delete(id: string) {
    const before = this.stages.length;
    this.stages = this.stages.filter((s) => s.id !== id);
    return this.stages.length < before;
  }
}

class PostgresMaskRepo implements MaskRepo {
  constructor(private pool: Pool) {}

  async list(offset: number, limit: number, filters?: { ontology?: string; tag?: string; search?: string }) {
    const clauses: string[] = [];
    const params: any[] = [];

    if (filters?.ontology) {
      clauses.push(`ontology = $${params.length + 1}`);
      params.push(filters.ontology);
    }
    if (filters?.tag) {
      clauses.push(`$${params.length + 1} = ANY(include_tags)`);
      params.push(filters.tag);
    }
    if (filters?.search) {
      const term = `%${filters.search.toLowerCase()}%`;
      clauses.push(`(LOWER(name) LIKE $${params.length + 1} OR LOWER(functional_scope) LIKE $${params.length + 1})`);
      params.push(term);
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const dataQuery = `SELECT id, name, ontology, functional_scope, tone, rhetorical_mode, compression_ratio,
              contexts as activation_rules_contexts,
              triggers as activation_rules_triggers,
              include_tags, exclude_tags, priority_weights,
              redaction
       FROM masks
       ${where}
       ORDER BY updated_at DESC
       OFFSET $${params.length + 1} LIMIT $${params.length + 2}`;
    const res = await this.pool.query<Mask>(dataQuery, [...params, offset, limit]);
    const totalRes = await this.pool.query<{ count: string }>(`SELECT COUNT(*) as count FROM masks ${where}`, params);
    const total = Number(totalRes.rows[0]?.count ?? 0);
    return { data: res.rows.map(mapMaskRow), total };
  }

  async get(id: string) {
    const res = await this.pool.query(
      `SELECT id, name, ontology, functional_scope, tone, rhetorical_mode, compression_ratio,
              contexts as activation_rules_contexts,
              triggers as activation_rules_triggers,
              include_tags, exclude_tags, priority_weights
       FROM masks WHERE id = $1`,
      [id]
    );
    return res.rows[0] ? mapMaskRow(res.rows[0]) : undefined;
  }

  async create(mask: Mask) {
    await this.pool.query(
      `INSERT INTO masks (id, name, ontology, functional_scope, tone, rhetorical_mode, compression_ratio, contexts, triggers, include_tags, exclude_tags, priority_weights)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         ontology = EXCLUDED.ontology,
         functional_scope = EXCLUDED.functional_scope,
         tone = EXCLUDED.tone,
         rhetorical_mode = EXCLUDED.rhetorical_mode,
         compression_ratio = EXCLUDED.compression_ratio,
         contexts = EXCLUDED.contexts,
         triggers = EXCLUDED.triggers,
         include_tags = EXCLUDED.include_tags,
         exclude_tags = EXCLUDED.exclude_tags,
         priority_weights = EXCLUDED.priority_weights,
         updated_at = now()`,
      [
        mask.id,
        mask.name,
        mask.ontology,
        mask.functional_scope,
        mask.stylistic_parameters.tone,
        mask.stylistic_parameters.rhetorical_mode,
        mask.stylistic_parameters.compression_ratio,
        mask.activation_rules.contexts,
        mask.activation_rules.triggers,
        mask.filters.include_tags,
        mask.filters.exclude_tags,
        mask.filters.priority_weights
      ]
    );
    return mask;
  }

  async update(id: string, patch: Partial<Mask>) {
    const existing = await this.get(id);
    if (!existing) return undefined;
    const merged = { ...existing, ...patch } as Mask;
    await this.create(merged);
    return merged;
  }

  async delete(id: string) {
    const res = await this.pool.query(`DELETE FROM masks WHERE id = $1`, [id]);
    return (res.rowCount ?? 0) > 0;
  }
}

class PostgresEpochRepo implements EpochRepo {
  constructor(private pool: Pool) {}

  async list() {
    const res = await this.pool.query(`SELECT id, name, summary, ordering FROM epochs ORDER BY ordering`);
    return res.rows.map((row) => ({ id: row.id, name: row.name, summary: row.summary ?? undefined, order: row.ordering }));
  }

  async get(id: string) {
    const res = await this.pool.query(`SELECT id, name, summary, ordering FROM epochs WHERE id = $1`, [id]);
    return res.rows[0]
      ? { id: res.rows[0].id, name: res.rows[0].name, summary: res.rows[0].summary ?? undefined, order: res.rows[0].ordering }
      : undefined;
  }

  async create(epoch: Epoch) {
    await this.pool.query(
      `INSERT INTO epochs (id, name, summary, ordering)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, summary = EXCLUDED.summary, ordering = EXCLUDED.ordering, updated_at = now()`,
      [epoch.id, epoch.name, epoch.summary ?? null, epoch.order]
    );
    return epoch;
  }

  async update(id: string, patch: Partial<Epoch>) {
    const existing = await this.get(id);
    if (!existing) return undefined;
    const merged = { ...existing, ...patch, order: patch.order ?? existing.order } as Epoch;
    await this.create(merged);
    return merged;
  }

  async delete(id: string) {
    const res = await this.pool.query(`DELETE FROM epochs WHERE id = $1`, [id]);
    return (res.rowCount ?? 0) > 0;
  }
}

class PostgresStageRepo implements StageRepo {
  constructor(private pool: Pool) {}

  async list(epochId?: string, offset = 0, limit = 100) {
    const clauses: string[] = [];
    const params: any[] = [];
    if (epochId) {
      clauses.push(`epoch_id = $${params.length + 1}`);
      params.push(epochId);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const res = await this.pool.query(
      `SELECT id, title, summary, tags, epoch_id, ordering FROM stages ${where} ORDER BY ordering OFFSET $${params.length + 1} LIMIT $${
        params.length + 2
      }`,
      [...params, offset, limit]
    );
    const totalRes = await this.pool.query<{ count: string }>(`SELECT COUNT(*) as count FROM stages ${where}`, params);
    return { data: res.rows.map(mapStageRow), total: Number(totalRes.rows[0]?.count ?? 0) };
  }

  async get(id: string) {
    const res = await this.pool.query(`SELECT id, title, summary, tags, epoch_id, ordering FROM stages WHERE id = $1`, [id]);
    return res.rows[0] ? mapStageRow(res.rows[0]) : undefined;
  }

  async create(stage: Stage) {
    await this.pool.query(
      `INSERT INTO stages (id, title, summary, tags, epoch_id, ordering)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, summary = EXCLUDED.summary, tags = EXCLUDED.tags, epoch_id = EXCLUDED.epoch_id, ordering = EXCLUDED.ordering, updated_at = now()`,
      [stage.id, stage.title, stage.summary ?? null, stage.tags ?? [], stage.epochId ?? null, stage.order ?? 0]
    );
    return stage;
  }

  async update(id: string, patch: Partial<Stage>) {
    const existing = await this.get(id);
    if (!existing) return undefined;
    const merged = { ...existing, ...patch } as Stage;
    await this.create(merged);
    return merged;
  }

  async delete(id: string) {
    const res = await this.pool.query(`DELETE FROM stages WHERE id = $1`, [id]);
    return (res.rowCount ?? 0) > 0;
  }
}

export function createMaskRepo(options: { pool?: Pool; kind?: "memory" | "postgres" } = {}): {
  masks: MaskRepo;
  epochs: EpochRepo;
  stages: StageRepo;
} {
  const kind =
    options.kind ??
    (process.env["MASK_REPO"] === "postgres" || process.env["MASK_STORE"] === "postgres" || process.env["DATABASE_URL"]
      ? "postgres"
      : "memory");

  if (kind === "postgres") {
    const pool =
      options.pool ?? new Pool({ connectionString: process.env["DATABASE_URL"] ?? process.env["POSTGRES_URL"] });
    return {
      masks: new PostgresMaskRepo(pool),
      epochs: new PostgresEpochRepo(pool),
      stages: new PostgresStageRepo(pool)
    };
  }

  const stages = EPOCH_TAXONOMY.flatMap((epoch) =>
    (epoch.stages ?? []).map((stage) => ({
      ...stage,
      epochId: epoch.id
    }))
  );
  return {
    masks: new InMemoryMaskRepo([...MASK_TAXONOMY]),
    epochs: new InMemoryEpochRepo(
      EPOCH_TAXONOMY.map((e) => ({
        id: e.id,
        name: e.name,
        summary: e.summary,
        order: e.order
      }))
    ),
    stages: new InMemoryStageRepo(stages)
  };
}

function mapMaskRow(row: any): Mask {
  return {
    id: row.id,
    name: row.name,
    ontology: row.ontology,
    functional_scope: row.functional_scope,
    stylistic_parameters: {
      tone: row.tone,
      rhetorical_mode: row.rhetorical_mode,
      compression_ratio: Number(row.compression_ratio)
    },
    activation_rules: {
      contexts: row.activation_rules_contexts ?? [],
      triggers: row.activation_rules_triggers ?? []
    },
    filters: {
      include_tags: row.include_tags ?? [],
      exclude_tags: row.exclude_tags ?? [],
      priority_weights: row.priority_weights ?? {}
    },
    redaction: row.redaction ?? undefined
  };
}

function mapStageRow(row: any): Stage {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary ?? undefined,
    tags: row.tags ?? [],
    epochId: row.epoch_id ?? undefined,
    order: row.ordering ?? 0
  };
}
