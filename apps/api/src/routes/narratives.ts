/**
 * Narrative Routes
 * 
 * Handles narrative block retrieval and generation with theatrical metadata integration.
 * Narratives are filtered by persona/mask and enriched with performance notes.
 * 
 * Endpoints:
 * - GET /profiles/:id/narrative/:maskId - Get mask-specific narrative blocks
 * - POST /profiles/:id/narrative/:maskId - Generate/update narrative with theatrical framing
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type {
  NarrativeBlock,
  NarrativeSnapshot,
  TabulaPersonarumEntry,
  PersonaResonance,
} from "@in-midst-my-life/schema";
import {
  NarrativeBlockSchema,
  NarrativeSnapshotSchema,
} from "@in-midst-my-life/schema";

// Validation schemas for narrative endpoints
const NarrativeFilterSchema = z.object({
  maskId: z.string().uuid().describe("Persona ID to filter narratives by"),
  includeAetas: z
    .array(z.string())
    .optional()
    .describe("Only include entries from these life-stages"),
  excludeAetas: z
    .array(z.string())
    .optional()
    .describe("Exclude entries from these life-stages"),
  minWeight: z
    .number()
    .int()
    .min(0)
    .max(100)
    .optional()
    .describe("Minimum weight threshold (0-100)"),
  sortBy: z
    .enum(["weight", "priority", "date", "relevance"])
    .default("weight")
    .describe("Sort order for narrative blocks"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(50)
    .describe("Maximum number of blocks to return"),
});

const NarrativeUpdateSchema = z.object({
  blocks: z
    .array(NarrativeBlockSchema)
    .describe("Narrative blocks to update"),
  maskId: z.string().uuid().describe("Persona ID these narratives target"),
  customPreamble: z
    .string()
    .optional()
    .describe("Override auto-generated theatrical preamble"),
  customDisclaimer: z
    .string()
    .optional()
    .describe("Override auto-generated authentic disclaimer"),
});

export async function registerNarrativeRoutes(
  fastify: FastifyInstance
): Promise<void> {
  /**
   * GET /profiles/:id/narrative/:maskId
   * 
   * Retrieves narrative blocks filtered by a specific persona/mask.
   * Enriches response with:
   * - Theatrical preamble explaining the persona lens
   * - Authentic disclaimer about what's emphasized/de-emphasized
   * - Performance notes for each block
   * - Resonance data (fit_score, success metrics)
   * 
   * Query Parameters:
   * - includeAetas?: string[] - life-stages to include
   * - excludeAetas?: string[] - life-stages to exclude
   * - minWeight?: number - minimum block weight (0-100)
   * - sortBy?: 'weight' | 'priority' | 'date' | 'relevance'
   * - limit?: number (1-100, default 50)
   * 
   * Response:
   * {
   *   mask: TabulaPersonarumEntry,
   *   theatrical_preamble: string,
   *   authentic_disclaimer: string,
   *   resonance?: PersonaResonance,
   *   blocks: NarrativeBlock[],
   *   block_count: number,
   *   filter_applied: boolean,
   *   generated_at: ISO8601 timestamp
   * }
   */
  fastify.get<{
    Params: { id: string; maskId: string };
    Querystring: Partial<z.infer<typeof NarrativeFilterSchema>>;
  }>(
    "/profiles/:id/narrative/:maskId",
    async (request, reply) => {
      const { id, maskId } = request.params;

      // Validate profile ID format (should be UUID)
      if (!isValidUUID(id)) {
        return reply.status(400).send({
          error: "Invalid profile ID format",
          code: "INVALID_PROFILE_ID",
        });
      }

      if (!isValidUUID(maskId)) {
        return reply.status(400).send({
          error: "Invalid mask ID format",
          code: "INVALID_MASK_ID",
        });
      }

      // Parse and validate query parameters
      let filter: z.infer<typeof NarrativeFilterSchema>;
      try {
        filter = NarrativeFilterSchema.parse({
          maskId,
          includeAetas: request.query.includeAetas
            ? Array.isArray(request.query.includeAetas)
              ? request.query.includeAetas
              : [request.query.includeAetas]
            : undefined,
          excludeAetas: request.query.excludeAetas
            ? Array.isArray(request.query.excludeAetas)
              ? request.query.excludeAetas
              : [request.query.excludeAetas]
            : undefined,
          minWeight:
            request.query.minWeight !== undefined
              ? parseInt(request.query.minWeight as string, 10)
              : undefined,
          sortBy: request.query.sortBy || "weight",
          limit:
            request.query.limit !== undefined
              ? Math.min(
                  parseInt(request.query.limit as string, 10),
                  100
                )
              : 50,
        });
      } catch (err) {
        return reply.status(400).send({
          error: "Invalid query parameters",
          code: "INVALID_FILTER",
          details: err instanceof z.ZodError ? err.errors : undefined,
        });
      }

      // TODO: In production, fetch from:
      // 1. TabulaPersonarumRepo.getPersona(id, maskId)
      // 2. ProfileNarrativesRepo.getNarratives(id)
      // 3. Calculate theatrical metadata dynamically
      
      // For now, return structured response shape with mocked data
      const persona: TabulaPersonarumEntry = {
        id: maskId,
        nomen: "Vir Investigationis",
        everyday_name: "Researcher",
        role_vector: "Original research, publication, knowledge advancement",
        tone_register: "Scholarly, precise, evidence-driven",
        visibility_scope: ["Academica", "Technica"],
        motto: "Veritas est lux mea",
        description: "The research-focused persona",
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Generate theatrical preamble dynamically
      const theatricalPreamble = generateTheatricalPreamble(
        persona,
        filter.includeAetas
      );

      // Generate authentic disclaimer about what's emphasized/de-emphasized
      const authenticDisclaimer = generateAuthenticDisclaimer(
        persona,
        filter
      );

      // Mock narrative blocks (filtered)
      const narrativeBlocks: NarrativeBlock[] = [
        {
          id: "nb-001",
          type: "research",
          title: "Doctoral Research in Distributed Systems",
          content:
            "Conducted original research on Byzantine fault tolerance in distributed consensus protocols...",
          theatrical_metadata: {
            mask_name: persona.everyday_name,
            scaena: "Academica",
            aetas: ["Consolidation", "Expansion"],
            performance_note: "This research exemplifies technical depth and theoretical rigor",
            authentic_caveat:
              "Emphasizes academic contribution; de-emphasizes parallel teaching responsibilities",
          },
          weight: 95,
          priority: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "nb-002",
          type: "publication",
          title: "Published 12 peer-reviewed papers",
          content:
            "First-author publications in ACM Transactions on Computing Systems, IEEE Software, and PLDI...",
          theatrical_metadata: {
            mask_name: persona.everyday_name,
            scaena: "Academica",
            aetas: ["Expansion", "Mastery"],
            performance_note: "Demonstrates sustained scholarly contribution",
            authentic_caveat:
              "Shows breadth of publication; doesn't detail rejection/iteration process",
          },
          weight: 90,
          priority: 2,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      // Filter by aetas if specified
      let filteredBlocks = narrativeBlocks;
      if (filter.includeAetas && filter.includeAetas.length > 0) {
        filteredBlocks = filteredBlocks.filter((block) => {
          const blockAetas =
            block.theatrical_metadata?.aetas || [];
          return blockAetas.some((a) =>
            filter.includeAetas!.includes(a)
          );
        });
      }
      if (filter.excludeAetas && filter.excludeAetas.length > 0) {
        filteredBlocks = filteredBlocks.filter((block) => {
          const blockAetas =
            block.theatrical_metadata?.aetas || [];
          return !blockAetas.some((a) =>
            filter.excludeAetas!.includes(a)
          );
        });
      }

      // Filter by minimum weight
      if (filter.minWeight !== undefined) {
        filteredBlocks = filteredBlocks.filter(
          (block) => (block.weight || 0) >= filter.minWeight!
        );
      }

      // Sort by specified criteria
      switch (filter.sortBy) {
        case "weight":
          filteredBlocks.sort((a, b) => (b.weight || 0) - (a.weight || 0));
          break;
        case "priority":
          filteredBlocks.sort((a, b) => (a.priority || 0) - (b.priority || 0));
          break;
        case "date":
          filteredBlocks.sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          );
          break;
        case "relevance":
          // Relevance = weight * (1 + match_score)
          // For now, same as weight
          filteredBlocks.sort((a, b) => (b.weight || 0) - (a.weight || 0));
          break;
      }

      // Apply limit
      filteredBlocks = filteredBlocks.slice(0, filter.limit);

      // Mock resonance data (in production, from PersonaResonanceRepo)
      const resonance: PersonaResonance = {
        persona_id: maskId,
        context: "Academic/research contexts",
        fit_score: 88,
        alignment_keywords: [
          "research",
          "publication",
          "theoretical",
          "innovation",
        ],
        misalignment_keywords: ["management", "operations", "sales"],
        last_used: new Date().toISOString(),
        success_count: 5,
        feedback: "Consistently successful in academic hiring contexts",
      };

      return reply.send({
        ok: true,
        mask: persona,
        theatrical_preamble: theatricalPreamble,
        authentic_disclaimer: authenticDisclaimer,
        resonance,
        blocks: filteredBlocks,
        block_count: filteredBlocks.length,
        filter_applied:
          (filter.includeAetas && filter.includeAetas.length > 0) ||
          (filter.excludeAetas && filter.excludeAetas.length > 0) ||
          filter.minWeight !== undefined,
        generated_at: new Date().toISOString(),
      });
    }
  );

  /**
   * POST /profiles/:id/narrative/:maskId
   * 
   * Updates narrative blocks for a specific persona or generates theatrical narrative
   * if not provided. Used for enriching narratives with mask-specific framing.
   * 
   * Request Body:
   * {
   *   blocks: NarrativeBlock[],
   *   maskId: string (UUID),
   *   customPreamble?: string,
   *   customDisclaimer?: string
   * }
   * 
   * Response:
   * {
   *   ok: true,
   *   blocks_updated: number,
   *   theatrical_metadata_added: number,
   *   persona: TabulaPersonarumEntry,
   *   sample_block: NarrativeBlock
   * }
   */
  fastify.post<{
    Params: { id: string; maskId: string };
    Body: z.infer<typeof NarrativeUpdateSchema>;
  }>(
    "/profiles/:id/narrative/:maskId",
    async (request, reply) => {
      const { id, maskId } = request.params;

      // Validate IDs
      if (!isValidUUID(id)) {
        return reply.status(400).send({
          error: "Invalid profile ID format",
          code: "INVALID_PROFILE_ID",
        });
      }

      if (!isValidUUID(maskId)) {
        return reply.status(400).send({
          error: "Invalid mask ID format",
          code: "INVALID_MASK_ID",
        });
      }

      // Validate request body
      let payload: z.infer<typeof NarrativeUpdateSchema>;
      try {
        payload = NarrativeUpdateSchema.parse(request.body);
      } catch (err) {
        return reply.status(400).send({
          error: "Invalid request body",
          code: "INVALID_PAYLOAD",
          details: err instanceof z.ZodError ? err.errors : undefined,
        });
      }

      // TODO: In production:
      // 1. Fetch persona from TabulaPersonarumRepo
      // 2. For each block in payload.blocks:
      //    - Enhance theatrical_metadata with mask_name, performance_note, authentic_caveat
      //    - Save to ProfileNarrativesRepo.updateNarrativeBlock()
      // 3. Emit event to recalculate resonance scores

      // Mock response showing enriched narratives
      const enrichedBlocks = payload.blocks.map((block) => ({
        ...block,
        theatrical_metadata: {
          ...block.theatrical_metadata,
          mask_name: "Researcher",
          performance_note:
            "Emphasized in Researcher persona context",
        },
      }));

      return reply.status(200).send({
        ok: true,
        blocks_updated: enrichedBlocks.length,
        theatrical_metadata_added: enrichedBlocks.length,
        persona: {
          id: maskId,
          nomen: "Vir Investigationis",
          everyday_name: "Researcher",
        },
        sample_block:
          enrichedBlocks.length > 0
            ? enrichedBlocks[0]
            : null,
      });
    }
  );
}

/**
 * Generate theatrical preamble explaining the persona lens
 * 
 * Example:
 * "The following narrative is presented through the lens of Researcher—emphasizing
 * original thought, empirical rigor, and knowledge advancement. During the Expansion
 * and Mastery life-stages, this persona comes fully into focus."
 */
function generateTheatricalPreamble(
  persona: TabulaPersonarumEntry,
  selectedAetas?: string[]
): string {
  const aetasClause =
    selectedAetas && selectedAetas.length > 0
      ? ` During the ${selectedAetas.join(" and ")} life-stage${selectedAetas.length > 1 ? "s" : ""}, this persona is most evident.`
      : "";

  return (
    `The following narrative is presented through the lens of ${persona.everyday_name} ` +
    `(${persona.nomen} in Latin theatrical terms). This persona emphasizes: ${persona.role_vector}.` +
    aetasClause
  );
}

/**
 * Generate authentic disclaimer about what's emphasized vs de-emphasized
 * 
 * Example:
 * "This framing emphasizes technical depth and empirical rigor; de-emphasizes teaching,
 * mentoring, and administrative work that occurred in parallel."
 */
function generateAuthenticDisclaimer(
  persona: TabulaPersonarumEntry,
  filter: z.infer<typeof NarrativeFilterSchema>
): string {
  const toneNote =
    `This narrative adopts ${persona.tone_register.toLowerCase()} tone. `;
  const emphasisNote = `It emphasizes: ${persona.role_vector.toLowerCase()}. `;
  const scopeNote =
    persona.visibility_scope.length > 0
      ? `It is particularly apt for ${persona.visibility_scope.join(" and ")} contexts.`
      : "";

  return toneNote + emphasisNote + scopeNote;
}

/**
 * Simple UUID validation helper
 */
function isValidUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}
