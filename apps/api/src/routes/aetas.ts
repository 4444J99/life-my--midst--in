/**
 * Aetas Routes
 * 
 * Manages life-stage (aetas) lifecycle for profiles.
 * Aetas represent theatrical/developmental stages in a person's life arc:
 * Initiation → Emergence → Consolidation → Expansion → Mastery → Integration → Transmission → Stewardship
 * 
 * Endpoints:
 * - GET /profiles/:id/aetas - List aetas for profile
 * - POST /profiles/:id/aetas - Create new aetas entry
 * - GET /profiles/:id/aetas/:aetasId - Get specific aetas
 * - PATCH /profiles/:id/aetas/:aetasId - Update aetas
 * - DELETE /profiles/:id/aetas/:aetasId - Remove aetas
 * - GET /taxonomy/aetas - List canonical aetas definitions
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Aetas } from "@in-midst-my-life/schema";
import { AetasSchema } from "@in-midst-my-life/schema";

// Validation schemas for aetas endpoints
const AetasCreateSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .describe("Name of life stage (e.g., 'Mastery')"),
  latin_name: z
    .string()
    .min(1)
    .max(100)
    .describe("Latin theatrical name (e.g., 'Magistralitas')"),
  description: z
    .string()
    .min(1)
    .describe("What characterizes this life-stage"),
  order: z
    .number()
    .int()
    .min(1)
    .describe("Sequential order in life arc (1-8)"),
  capability_profile: z
    .record(z.string())
    .optional()
    .describe("Key capabilities/competencies at this stage"),
  typical_age_range: z
    .object({
      min: z.number().int().optional(),
      max: z.number().int().optional(),
    })
    .optional()
    .describe("Typical age range (informational, not prescriptive)"),
  duration_months: z
    .number()
    .int()
    .optional()
    .describe("Typical duration in months"),
  transitions_to: z
    .array(z.string())
    .optional()
    .describe("IDs of aetas that typically follow"),
  markers: z
    .array(z.string())
    .optional()
    .describe("Milestones or achievements typical at this stage"),
});

const AetasUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  latin_name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).optional(),
  order: z.number().int().min(1).optional(),
  capability_profile: z.record(z.string()).optional(),
  typical_age_range: z
    .object({
      min: z.number().int().optional(),
      max: z.number().int().optional(),
    })
    .optional(),
  duration_months: z.number().int().optional(),
  transitions_to: z.array(z.string()).optional(),
  markers: z.array(z.string()).optional(),
});

const AetasQuerySchema = z.object({
  sort: z
    .enum(["order", "name"])
    .default("order")
    .describe("Sort order"),
  offset: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe("Pagination offset"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(50)
    .describe("Pagination limit"),
});

// In-memory storage for canonical aetas (canonical + profile-specific)
const canonicalAetas: Record<string, Aetas> = {
  aetas_01: {
    id: "aetas_01",
    name: "Initiation",
    latin_name: "Initiatio",
    order: 1,
    description:
      "Entry into a domain; learning fundamentals, establishing identity",
    capability_profile: {
      theory: "foundational",
      practice: "novice",
      self_awareness: "emerging",
    },
    markers: [
      "First formal training",
      "Establish foundational skills",
      "Identity with domain",
    ],
    transitions_to: ["aetas_02"],
  },
  aetas_02: {
    id: "aetas_02",
    name: "Emergence",
    latin_name: "Emergentia",
    order: 2,
    description:
      "Early independent work; developing competence and voice",
    capability_profile: {
      theory: "intermediate",
      practice: "advanced_beginner",
      self_awareness: "developing",
    },
    markers: [
      "First solo projects",
      "Recognition from peers",
      "Voice begins to form",
    ],
    transitions_to: ["aetas_03"],
  },
  aetas_03: {
    id: "aetas_03",
    name: "Consolidation",
    latin_name: "Consolidatio",
    order: 3,
    description:
      "Deepening expertise; mastering core competencies",
    capability_profile: {
      theory: "advanced",
      practice: "competent",
      self_awareness: "strong",
    },
    markers: [
      "Demonstrated expertise",
      "Mentorship of juniors begins",
      "Methodological clarity",
    ],
    transitions_to: ["aetas_04"],
  },
  aetas_04: {
    id: "aetas_04",
    name: "Expansion",
    latin_name: "Expansio",
    order: 4,
    description:
      "Applying expertise across domains; increasing scope and impact",
    capability_profile: {
      theory: "expert",
      practice: "proficient",
      self_awareness: "reflective",
    },
    markers: [
      "Cross-domain contributions",
      "Leadership emerging",
      "Thought leadership",
    ],
    transitions_to: ["aetas_05"],
  },
  aetas_05: {
    id: "aetas_05",
    name: "Mastery",
    latin_name: "Magistralitas",
    order: 5,
    description:
      "Peak capability; deep expertise combined with breadth and wisdom",
    capability_profile: {
      theory: "visionary",
      practice: "expert",
      self_awareness: "integrated",
    },
    markers: [
      "Recognized mastery",
      "Significant contributions",
      "Mentoring at scale",
    ],
    transitions_to: ["aetas_06"],
  },
  aetas_06: {
    id: "aetas_06",
    name: "Integration",
    latin_name: "Integratio",
    order: 6,
    description:
      "Synthesizing experience; integrating multiple perspectives into coherent vision",
    capability_profile: {
      theory: "integrative",
      practice: "generative",
      self_awareness: "philosophical",
    },
    markers: [
      "Integrative thinking",
      "Mentorship deepens",
      "Legacy consciousness",
    ],
    transitions_to: ["aetas_07"],
  },
  aetas_07: {
    id: "aetas_07",
    name: "Transmission",
    latin_name: "Transmissio",
    order: 7,
    description:
      "Actively passing knowledge and wisdom to next generations",
    capability_profile: {
      theory: "meta-theoretical",
      practice: "teaching",
      self_awareness: "universal",
    },
    markers: [
      "Major teaching/writing",
      "Institution building",
      "Legacy articulation",
    ],
    transitions_to: ["aetas_08"],
  },
  aetas_08: {
    id: "aetas_08",
    name: "Stewardship",
    latin_name: "Custodia",
    order: 8,
    description:
      "Stewarding accumulated wisdom; ensuring continuity and evolution",
    capability_profile: {
      theory: "custodial",
      practice: "directional",
      self_awareness: "transcendent",
    },
    markers: [
      "Guidance and vision",
      "Legacy protection",
      "Supporting next generation",
    ],
    transitions_to: [],
  },
};

// Store profile-specific aetas assignments
const profileAetas: Map<string, Aetas[]> = new Map();

export async function registerAetasRoutes(
  fastify: FastifyInstance
): Promise<void> {
  /**
   * GET /profiles/:id/aetas
   * 
   * List all aetas (life-stage assignments) for a profile.
   * Returns the sequence of life-stages the profile has progressed through
   * with timestamps and metadata.
   * 
   * Query Parameters:
   * - sort?: 'order' | 'name' (default: 'order')
   * - offset?: number (default: 0)
   * - limit?: number (default: 50, max: 100)
   * 
   * Response:
   * {
   *   ok: true,
   *   profile_id: string,
   *   aetas: Aetas[],
   *   current_aetas?: string (name of current/latest aetas),
   *   aetas_count: number,
   *   sequence: string[] (ordered names),
   *   generated_at: ISO8601
   * }
   */
  fastify.get<{
    Params: { id: string };
    Querystring: Partial<z.infer<typeof AetasQuerySchema>>;
  }>(
    "/profiles/:id/aetas",
    async (request, reply) => {
      const { id } = request.params;

      if (!isValidUUID(id)) {
        return reply.status(400).send({
          error: "Invalid profile ID format",
          code: "INVALID_PROFILE_ID",
        });
      }

      let query: z.infer<typeof AetasQuerySchema>;
      try {
        query = AetasQuerySchema.parse({
          sort: request.query.sort,
          offset:
            request.query.offset !== undefined
              ? parseInt(request.query.offset as string, 10)
              : 0,
          limit:
            request.query.limit !== undefined
              ? Math.min(parseInt(request.query.limit as string, 10), 100)
              : 50,
        });
      } catch (err) {
        return reply.status(400).send({
          error: "Invalid query parameters",
          code: "INVALID_QUERY",
          details: err instanceof z.ZodError ? err.errors : undefined,
        });
      }

      // Fetch profile's aetas or return empty (in production, from database)
      let aetas = profileAetas.get(id) || [];

      // Sort
      if (query.sort === "name") {
        aetas = [...aetas].sort((a, b) => a.name.localeCompare(b.name));
      } else {
        aetas = [...aetas].sort((a, b) => a.order - b.order);
      }

      // Paginate
      const total = aetas.length;
      aetas = aetas.slice(query.offset, query.offset + query.limit);

      // Current aetas = last one in order
      const allProfileAetas = profileAetas.get(id) || [];
      const currentAetas =
        allProfileAetas.length > 0
          ? [...allProfileAetas].sort((a, b) => b.order - a.order)[0]
              .name
          : undefined;

      const sequence = [...(profileAetas.get(id) || [])]
        .sort((a, b) => a.order - b.order)
        .map((a) => a.name);

      return reply.send({
        ok: true,
        profile_id: id,
        aetas,
        current_aetas: currentAetas,
        aetas_count: total,
        sequence,
        generated_at: new Date().toISOString(),
      });
    }
  );

  /**
   * POST /profiles/:id/aetas
   * 
   * Create a new aetas assignment for a profile.
   * Typically called when a person transitions into a new life-stage.
   * 
   * Request Body: AetasCreateSchema
   * 
   * Response:
   * {
   *   ok: true,
   *   aetas: Aetas (created),
   *   profile_id: string,
   *   sequence_position: number
   * }
   */
  fastify.post<{
    Params: { id: string };
    Body: z.infer<typeof AetasCreateSchema>;
  }>(
    "/profiles/:id/aetas",
    async (request, reply) => {
      const { id } = request.params;

      if (!isValidUUID(id)) {
        return reply.status(400).send({
          error: "Invalid profile ID format",
          code: "INVALID_PROFILE_ID",
        });
      }

      let payload: z.infer<typeof AetasCreateSchema>;
      try {
        payload = AetasCreateSchema.parse(request.body);
      } catch (err) {
        return reply.status(400).send({
          error: "Invalid request body",
          code: "INVALID_PAYLOAD",
          details: err instanceof z.ZodError ? err.errors : undefined,
        });
      }

      // Create new aetas (in production, save to database)
      const newAetas: Aetas = {
        id: `aetas_${Date.now()}`,
        ...payload,
      };

      // Add to profile's aetas list
      const profileAetasList = profileAetas.get(id) || [];
      profileAetasList.push(newAetas);
      profileAetas.set(id, profileAetasList);

      return reply.status(201).send({
        ok: true,
        aetas: newAetas,
        profile_id: id,
        sequence_position: profileAetasList.length,
      });
    }
  );

  /**
   * GET /profiles/:id/aetas/:aetasId
   * 
   * Retrieve details of a specific aetas.
   * 
   * Response: Aetas object with full metadata
   */
  fastify.get<{
    Params: { id: string; aetasId: string };
  }>(
    "/profiles/:id/aetas/:aetasId",
    async (request, reply) => {
      const { id, aetasId } = request.params;

      if (!isValidUUID(id)) {
        return reply.status(400).send({
          error: "Invalid profile ID format",
          code: "INVALID_PROFILE_ID",
        });
      }

      const profileAetasList = profileAetas.get(id) || [];
      const aetas = profileAetasList.find((a) => a.id === aetasId);

      if (!aetas) {
        return reply.status(404).send({
          error: "Aetas not found",
          code: "AETAS_NOT_FOUND",
        });
      }

      return reply.send({
        ok: true,
        aetas,
        profile_id: id,
      });
    }
  );

  /**
   * PATCH /profiles/:id/aetas/:aetasId
   * 
   * Update an existing aetas entry.
   * 
   * Request Body: AetasUpdateSchema (partial)
   * 
   * Response: Updated Aetas object
   */
  fastify.patch<{
    Params: { id: string; aetasId: string };
    Body: z.infer<typeof AetasUpdateSchema>;
  }>(
    "/profiles/:id/aetas/:aetasId",
    async (request, reply) => {
      const { id, aetasId } = request.params;

      if (!isValidUUID(id)) {
        return reply.status(400).send({
          error: "Invalid profile ID format",
          code: "INVALID_PROFILE_ID",
        });
      }

      let payload: z.infer<typeof AetasUpdateSchema>;
      try {
        payload = AetasUpdateSchema.parse(request.body);
      } catch (err) {
        return reply.status(400).send({
          error: "Invalid request body",
          code: "INVALID_PAYLOAD",
          details: err instanceof z.ZodError ? err.errors : undefined,
        });
      }

      const profileAetasList = profileAetas.get(id) || [];
      const index = profileAetasList.findIndex((a) => a.id === aetasId);

      if (index === -1) {
        return reply.status(404).send({
          error: "Aetas not found",
          code: "AETAS_NOT_FOUND",
        });
      }

      // Update aetas (in-memory for now)
      const updated = { ...profileAetasList[index], ...payload };
      profileAetasList[index] = updated;

      return reply.send({
        ok: true,
        aetas: updated,
        profile_id: id,
      });
    }
  );

  /**
   * DELETE /profiles/:id/aetas/:aetasId
   * 
   * Remove an aetas assignment from profile.
   * 
   * Response:
   * {
   *   ok: true,
   *   deleted_id: string,
   *   profile_id: string
   * }
   */
  fastify.delete<{
    Params: { id: string; aetasId: string };
  }>(
    "/profiles/:id/aetas/:aetasId",
    async (request, reply) => {
      const { id, aetasId } = request.params;

      if (!isValidUUID(id)) {
        return reply.status(400).send({
          error: "Invalid profile ID format",
          code: "INVALID_PROFILE_ID",
        });
      }

      const profileAetasList = profileAetas.get(id) || [];
      const index = profileAetasList.findIndex((a) => a.id === aetasId);

      if (index === -1) {
        return reply.status(404).send({
          error: "Aetas not found",
          code: "AETAS_NOT_FOUND",
        });
      }

      const deleted = profileAetasList[index];
      profileAetasList.splice(index, 1);
      profileAetas.set(id, profileAetasList);

      return reply.send({
        ok: true,
        deleted_id: deleted.id,
        profile_id: id,
      });
    }
  );

  /**
   * GET /taxonomy/aetas
   * 
   * Retrieve canonical aetas definitions (the 8 standard life-stages).
   * These are immutable archetypal stages in the theatrical/developmental arc.
   * 
   * Query Parameters:
   * - sort?: 'order' | 'name' (default: 'order')
   * 
   * Response:
   * {
   *   ok: true,
   *   aetas: Aetas[],
   *   aetas_count: number,
   *   canonical: true
   * }
   */
  fastify.get<{
    Querystring: { sort?: "order" | "name" };
  }>(
    "/taxonomy/aetas",
    async (request, reply) => {
      let aetas = Object.values(canonicalAetas);

      if (request.query.sort === "name") {
        aetas.sort((a, b) => a.name.localeCompare(b.name));
      } else {
        aetas.sort((a, b) => a.order - b.order);
      }

      return reply.send({
        ok: true,
        aetas,
        aetas_count: aetas.length,
        canonical: true,
        description:
          "The 8 canonical life-stages in the theatrical human arc: Initiation → Emergence → Consolidation → Expansion → Mastery → Integration → Transmission → Stewardship",
      });
    }
  );
}

/**
 * Simple UUID validation helper
 */
function isValidUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}
