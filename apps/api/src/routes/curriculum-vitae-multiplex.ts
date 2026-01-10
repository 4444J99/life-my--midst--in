import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { CVMultiplexRepo } from "../repositories/curriculum-vitae";
import type { TabulaPersonarumRepo } from "../repositories/tabula-personarum";
import type { ScaenaeRepo } from "../repositories/scaenae";
import { cvMultiplexRepo } from "../repositories/curriculum-vitae";
import { tabulaPersonarumRepo } from "../repositories/tabula-personarum";
import { scaenaeRepo } from "../repositories/scaenae";
import { profileRepo } from "../repositories/profiles";

// Validation schemas
const CVEntryCreateSchema = z.object({
  type: z.enum([
    "experience",
    "achievement",
    "skill",
    "publication",
    "project",
    "education",
    "certification",
    "language",
    "volunteer",
    "award",
    "custom"
  ]),
  content: z.string().min(1),
  personae: z.array(z.string()).optional(),
  aetas: z.array(z.string()).optional(),
  scaenae: z.array(z.string()).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  priority: z.number().int().min(0).max(100).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional()
});

const CVFilterSchema = z.object({
  includePersonae: z.array(z.string()).optional(),
  excludePersonae: z.array(z.string()).optional(),
  includeAetas: z.array(z.string()).optional(),
  excludeAetas: z.array(z.string()).optional(),
  includeScaenae: z.array(z.string()).optional(),
  excludeScaenae: z.array(z.string()).optional(),
  minPriority: z.number().int().min(0).max(100).optional(),
  includeTags: z.array(z.string()).optional(),
  excludeTags: z.array(z.string()).optional(),
  offset: z.number().int().min(0).optional(),
  limit: z.number().int().min(1).max(100).optional()
});

const TabulaPersonarumEntryCreateSchema = z.object({
  nomen: z.string(),
  everyday_name: z.string(),
  role_vector: z.string(),
  tone_register: z.string(),
  visibility_scope: z.array(z.string()),
  motto: z.string().optional(),
  description: z.string().optional(),
  active: z.boolean().optional()
});

interface RouteDeps {
  cvRepo?: CVMultiplexRepo;
  tabulaRepo?: TabulaPersonarumRepo;
  scaenaeRepo?: ScaenaeRepo;
}

export async function registerCurriculumVitaeMultiplexRoutes(
  fastify: FastifyInstance,
  deps?: RouteDeps
) {
  const cvRepo = deps?.cvRepo ?? cvMultiplexRepo;
  const tabulaRepo = deps?.tabulaRepo ?? tabulaPersonarumRepo;
  const scaenaeRepoInstance = deps?.scaenaeRepo ?? scaenaeRepo;

  // Initialize canonical scaenae
  await scaenaeRepoInstance.initializeCanonicalScaenae();

  /**
   * GET /profiles/:id/cv
   * Retrieve the master curriculum vitae for a profile
   */
  fastify.get("/:id/cv", async (request, reply) => {
    const profileId = (request.params as { id: string }).id;
    const profile = await profileRepo.find(profileId);
    if (!profile) return reply.code(404).send({ ok: false, error: "profile_not_found" });

    const cv = await cvRepo.getOrCreate(profileId);
    return { ok: true, data: cv };
  });

  /**
   * POST /profiles/:id/cv/entries
   * Add a new entry to the master CV
   */
  fastify.post("/:id/cv/entries", async (request, reply) => {
    const profileId = (request.params as { id: string }).id;
    const profile = await profileRepo.find(profileId);
    if (!profile) return reply.code(404).send({ ok: false, error: "profile_not_found" });

    const parsed = CVEntryCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ ok: false, errors: parsed.error.flatten() });
    }

    const entry = await cvRepo.addEntry(profileId, parsed.data);
    return { ok: true, data: entry };
  });

  /**
   * GET /profiles/:id/cv/entries
   * List CV entries with optional filtering
   */
  fastify.get("/:id/cv/entries", async (request, reply) => {
    const profileId = (request.params as { id: string }).id;
    const profile = await profileRepo.find(profileId);
    if (!profile) return reply.code(404).send({ ok: false, error: "profile_not_found" });

    const parsed = CVFilterSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ ok: false, errors: parsed.error.flatten() });
    }

    const { offset = 0, limit = 50, ...filter } = parsed.data;
    const result = await cvRepo.listEntries(profileId, filter, offset, limit);
    return { ok: true, offset, limit, ...result };
  });

  /**
   * PATCH /profiles/:id/cv/entries/:entryId
   * Update a CV entry
   */
  fastify.patch("/:id/cv/entries/:entryId", async (request, reply) => {
    const { id: profileId, entryId } = request.params as { id: string; entryId: string };
    const profile = await profileRepo.find(profileId);
    if (!profile) return reply.code(404).send({ ok: false, error: "profile_not_found" });

    const parsed = CVEntryCreateSchema.partial().safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ ok: false, errors: parsed.error.flatten() });
    }

    const updated = await cvRepo.updateEntry(profileId, entryId, parsed.data);
    if (!updated) return reply.code(404).send({ ok: false, error: "entry_not_found" });

    return { ok: true, data: updated };
  });

  /**
   * DELETE /profiles/:id/cv/entries/:entryId
   * Delete a CV entry
   */
  fastify.delete("/:id/cv/entries/:entryId", async (request, reply) => {
    const { id: profileId, entryId } = request.params as { id: string; entryId: string };
    const profile = await profileRepo.find(profileId);
    if (!profile) return reply.code(404).send({ ok: false, error: "profile_not_found" });

    const deleted = await cvRepo.deleteEntry(profileId, entryId);
    if (!deleted) return reply.code(404).send({ ok: false, error: "entry_not_found" });

    return { ok: true };
  });

  /**
   * GET /profiles/:id/personae
   * List all personas (tabula personarum) for a profile
   */
  fastify.get("/:id/personae", async (request, reply) => {
    const profileId = (request.params as { id: string }).id;
    const profile = await profileRepo.find(profileId);
    if (!profile) return reply.code(404).send({ ok: false, error: "profile_not_found" });

    const index = await tabulaRepo.getOrCreate(profileId);
    const personas = await tabulaRepo.listPersonae(profileId, true);

    return { ok: true, data: { ...index, personas } };
  });

  /**
   * POST /profiles/:id/personae
   * Create a new persona
   */
  fastify.post("/:id/personae", async (request, reply) => {
    const profileId = (request.params as { id: string }).id;
    const profile = await profileRepo.find(profileId);
    if (!profile) return reply.code(404).send({ ok: false, error: "profile_not_found" });

    const parsed = TabulaPersonarumEntryCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ ok: false, errors: parsed.error.flatten() });
    }

    const persona = await tabulaRepo.addPersona(profileId, parsed.data);
    return { ok: true, data: persona };
  });

  /**
   * GET /profiles/:id/personae/:personaId
   * Get a specific persona
   */
  fastify.get("/:id/personae/:personaId", async (request, reply) => {
    const { id: profileId, personaId } = request.params as { id: string; personaId: string };
    const profile = await profileRepo.find(profileId);
    if (!profile) return reply.code(404).send({ ok: false, error: "profile_not_found" });

    const persona = await tabulaRepo.getPersona(profileId, personaId);
    if (!persona) return reply.code(404).send({ ok: false, error: "persona_not_found" });

    const resonances = await tabulaRepo.listResonances(profileId, personaId);
    return { ok: true, data: { ...persona, resonances } };
  });

  /**
   * PATCH /profiles/:id/personae/:personaId
   * Update a persona
   */
  fastify.patch("/:id/personae/:personaId", async (request, reply) => {
    const { id: profileId, personaId } = request.params as { id: string; personaId: string };
    const profile = await profileRepo.find(profileId);
    if (!profile) return reply.code(404).send({ ok: false, error: "profile_not_found" });

    const parsed = TabulaPersonarumEntryCreateSchema.partial().safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ ok: false, errors: parsed.error.flatten() });
    }

    const updated = await tabulaRepo.updatePersona(profileId, personaId, parsed.data);
    if (!updated) return reply.code(404).send({ ok: false, error: "persona_not_found" });

    return { ok: true, data: updated };
  });

  /**
   * DELETE /profiles/:id/personae/:personaId
   * Delete a persona
   */
  fastify.delete("/:id/personae/:personaId", async (request, reply) => {
    const { id: profileId, personaId } = request.params as { id: string; personaId: string };
    const profile = await profileRepo.find(profileId);
    if (!profile) return reply.code(404).send({ ok: false, error: "profile_not_found" });

    const deleted = await tabulaRepo.deletePersona(profileId, personaId);
    if (!deleted) return reply.code(404).send({ ok: false, error: "persona_not_found" });

    return { ok: true };
  });

  /**
   * GET /taxonomy/scaenae
   * List all theatrical stages (scaenae)
   */
  fastify.get("/taxonomy/scaenae", async (request) => {
    const canonical = (request.query as any)?.canonical === "true";
    const scaenae = await scaenaeRepoInstance.listScaenae(canonical);
    const taxonomy = await scaenaeRepoInstance.getTaxonomy();

    return {
      ok: true,
      data: {
        taxonomy,
        scaenae,
        canonical_count: scaenae.filter((s) => s.metadata?.canonical).length
      }
    };
  });

  /**
   * GET /taxonomy/scaenae/:scaenaId
   * Get a specific scaena
   */
  fastify.get("/taxonomy/scaenae/:scaenaId", async (request, reply) => {
    const scaenaId = (request.params as { scaenaId: string }).scaenaId;
    const scaena = await scaenaeRepoInstance.getScaena(scaenaId);
    if (!scaena) return reply.code(404).send({ ok: false, error: "scaena_not_found" });

    return { ok: true, data: scaena };
  });

  /**
   * POST /profiles/:id/cv/filter
   * Filter CV entries by multiple dimensions and generate resume view
   */
  fastify.post("/:id/cv/filter", async (request, reply) => {
    const profileId = (request.params as { id: string }).id;
    const profile = await profileRepo.find(profileId);
    if (!profile) return reply.code(404).send({ ok: false, error: "profile_not_found" });

    const parsed = CVFilterSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ ok: false, errors: parsed.error.flatten() });
    }

    const { offset = 0, limit = 50, ...filter } = parsed.data;
    const result = await cvRepo.filterByMultipleDimensions(profileId, filter);
    const sorted = result.data
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
      .slice(offset, offset + limit);

    return {
      ok: true,
      offset,
      limit,
      total: result.total,
      data: sorted,
      filter_applied: Object.keys(filter).filter((k) => (filter as any)[k])
    };
  });

  /**
   * POST /profiles/:id/cv/generate-resume
   * Generate a filtered resume for a specific mask/persona
   */
  fastify.post("/:id/cv/generate-resume/:maskId", async (request, reply) => {
    const { id: profileId, maskId } = request.params as { id: string; maskId: string };
    const profile = await profileRepo.find(profileId);
    if (!profile) return reply.code(404).send({ ok: false, error: "profile_not_found" });

    const persona = await tabulaRepo.getPersona(profileId, maskId);
    if (!persona) return reply.code(404).send({ ok: false, error: "persona_not_found" });

    // Filter CV by this persona's visibility scope
    const filtered = await cvRepo.filterByMultipleDimensions(profileId, {
      includePersonae: [maskId],
      includeScaenae: persona.visibility_scope
    });

    // Sort by priority
    const sorted = filtered.data.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    return {
      ok: true,
      data: {
        persona: {
          id: persona.id,
          nomen: persona.nomen,
          everyday_name: persona.everyday_name,
          role_vector: persona.role_vector,
          motto: persona.motto
        },
        entries: sorted,
        entry_count: sorted.length,
        theatrical_preamble: `This resume is presented through the lens of ${persona.everyday_name} (${persona.nomen}). The following emphasizes ${persona.role_vector}.`
      }
    };
  });
}

  /**
   * POST /profiles/:id/cv/generate-resume/batch
   * 
   * Generate filtered resumes for ALL personas of a profile.
   * Returns an array of resume views, one for each active persona.
   * 
   * Query Parameters:
   * - activeOnly?: boolean (default: true) - only generate for active personas
   * 
   * Response:
   * {
   *   ok: true,
   *   profile_id: string,
   *   resumes: Array<{
   *     persona: {id, nomen, everyday_name, role_vector, motto},
   *     entries: CVEntry[],
   *     entry_count: number,
   *     theatrical_preamble: string,
   *     scaena_focus: string[]
   *   }>,
   *   total_resumes: number,
   *   total_entries_across_all: number,
   *   generated_at: ISO8601 timestamp
   * }
   */
  fastify.post(
    "/:id/cv/generate-resume/batch",
    async (request, reply) => {
      const profileId = (request.params as { id: string }).id;
      const profile = await profileRepo.find(profileId);
      if (!profile)
        return reply
          .code(404)
          .send({ ok: false, error: "profile_not_found" });

      // Parse query parameters
      const activeOnly =
        (request.query as any)?.activeOnly !== "false" ? true : false;

      // Fetch all personas for this profile
      let personas = await tabulaRepo.listPersonae(profileId, activeOnly);

      // If no personas, return empty batch
      if (personas.length === 0) {
        return {
          ok: true,
          profile_id: profileId,
          resumes: [],
          total_resumes: 0,
          total_entries_across_all: 0,
          generated_at: new Date().toISOString(),
          warning: "No active personas found for profile",
        };
      }

      // Generate resume for each persona
      const resumes = await Promise.all(
        personas.map(async (persona) => {
          // Filter CV by this persona's visibility scope
          const filtered = await cvRepo.filterByMultipleDimensions(
            profileId,
            {
              includePersonae: [persona.id],
              includeScaenae: persona.visibility_scope,
            }
          );

          // Sort by priority
          const sorted = filtered.data.sort(
            (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
          );

          // Generate theatrical preamble
          const theatricalPreamble = `This resume is presented through the lens of ${persona.everyday_name} (${persona.nomen} in theatrical terms). The following emphasizes: ${persona.role_vector}. This persona is suited for ${persona.visibility_scope.join(", ")} contexts.`;

          return {
            persona: {
              id: persona.id,
              nomen: persona.nomen,
              everyday_name: persona.everyday_name,
              role_vector: persona.role_vector,
              tone_register: persona.tone_register,
              motto: persona.motto,
            },
            entries: sorted,
            entry_count: sorted.length,
            theatrical_preamble: theatricalPreamble,
            scaena_focus: persona.visibility_scope,
          };
        })
      );

      // Calculate total entries across all resumes
      const totalEntriesAcrossAll = resumes.reduce(
        (sum, r) => sum + r.entry_count,
        0
      );

      return {
        ok: true,
        profile_id: profileId,
        resumes,
        total_resumes: resumes.length,
        total_entries_across_all: totalEntriesAcrossAll,
        average_entries_per_resume:
          Math.round(
            (totalEntriesAcrossAll / resumes.length) * 100
          ) / 100,
        generated_at: new Date().toISOString(),
      };
    }
  );
}
