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

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type {
  NarrativeBlock,
  TabulaPersonarumEntry,
  PersonaResonance,
} from '@in-midst-my-life/schema';
import { NarrativeBlockSchema } from '@in-midst-my-life/schema';
import { createOwnershipMiddleware } from '../middleware/auth';
import type { MaskRepo } from '../repositories/masks';
import type { CvRepos } from '../repositories/cv';
import type { NarrativeRepo } from '../repositories/narratives';
import {
  generateNarrativeBlocks,
  scoreTimelineEntryRelevance,
  type TimelineEntry,
} from '../services/narrative';

// Validation schemas for narrative endpoints
const NarrativeFilterSchema = z.object({
  maskId: z.string().describe('Mask ID to filter narratives by'),
  includeAetas: z
    .array(z.string())
    .optional()
    .describe('Only include entries from these life-stages'),
  excludeAetas: z.array(z.string()).optional().describe('Exclude entries from these life-stages'),
  minWeight: z
    .number()
    .int()
    .min(0)
    .max(100)
    .optional()
    .describe('Minimum weight threshold (0-100)'),
  sortBy: z
    .enum(['weight', 'priority', 'date', 'relevance'])
    .default('weight')
    .describe('Sort order for narrative blocks'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(50)
    .describe('Maximum number of blocks to return'),
});

const NarrativeUpdateSchema = z.object({
  blocks: z.array(NarrativeBlockSchema).describe('Narrative blocks to update'),
  maskId: z.string().describe('Persona ID these narratives target'),
  customPreamble: z.string().optional().describe('Override auto-generated theatrical preamble'),
  customDisclaimer: z.string().optional().describe('Override auto-generated authentic disclaimer'),
});

export interface NarrativeRouteOptions {
  prefix?: string;
  maskRepo: MaskRepo;
  cvRepos: CvRepos;
  narrativeRepo: NarrativeRepo;
}

export function registerNarrativeRoutes(
  fastify: FastifyInstance,
  opts: NarrativeRouteOptions,
  done: (err?: Error) => void,
): void {
  const { maskRepo, cvRepos, narrativeRepo } = opts;

  // Ownership guard for all write operations
  const ownershipCheck = createOwnershipMiddleware();
  fastify.addHook('preHandler', (request, reply, done) => {
    if (request.method === 'GET') {
      done();
      return;
    }
    void ownershipCheck(request, reply).then(() => done(), done);
  });

  /**
   * GET /profiles/:id/narrative/:maskId
   *
   * Retrieves narrative blocks filtered by a specific persona/mask.
   * Fetches real timeline data and mask definitions from the database,
   * generates narrative blocks through the narrative service, and enriches
   * with theatrical metadata.
   */
  fastify.get<{
    Params: { id: string; maskId: string };
    Querystring: Partial<z.infer<typeof NarrativeFilterSchema>>;
  }>('/profiles/:id/narrative/:maskId', async (request, reply) => {
    const { id, maskId } = request.params;

    if (!isValidUUID(id)) {
      return reply.status(400).send({
        error: 'Invalid profile ID format',
        code: 'INVALID_PROFILE_ID',
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
            ? parseInt(request.query.minWeight as unknown as string, 10)
            : undefined,
        sortBy: request.query.sortBy || 'weight',
        limit:
          request.query.limit !== undefined
            ? Math.min(parseInt(request.query.limit as unknown as string, 10), 100)
            : 50,
      });
    } catch (err) {
      return reply.status(400).send({
        error: 'Invalid query parameters',
        code: 'INVALID_FILTER',
        details: err instanceof z.ZodError ? err.errors : undefined,
      });
    }

    // 1. Fetch mask from taxonomy repository
    const mask = await maskRepo.get(maskId);
    if (!mask) {
      return reply.status(404).send({
        error: `Mask '${maskId}' not found`,
        code: 'MASK_NOT_FOUND',
      });
    }

    // 2. Check for an existing approved narrative snapshot
    const existingSnapshot = await narrativeRepo.latestApproved(id, maskId);

    // 3. Fetch timeline events for this profile
    const { data: timelineRaw } = await cvRepos.timelineEvents.list(id, 0, 200);

    // Convert DB timeline events to service TimelineEntry format
    const timeline: TimelineEntry[] = timelineRaw.map((evt) => {
      const data = evt as Record<string, unknown>;
      return {
        id: (data['id'] as string) || '',
        title: (data['title'] as string) || '',
        summary: (data['descriptionMarkdown'] as string) || undefined,
        start: (data['startDate'] as string) || '',
        end: (data['endDate'] as string) || undefined,
        tags: (data['tags'] as string[]) || [],
        stageId: (data['stageId'] as string) || undefined,
        epochId: (data['epochId'] as string) || undefined,
      };
    });

    // 4. Generate narrative blocks from real data
    let narrativeBlocks: NarrativeBlock[];

    if (existingSnapshot) {
      // Use previously approved narrative blocks
      narrativeBlocks = existingSnapshot.blocks || [];
    } else {
      // Generate fresh narrative blocks from timeline + mask
      const generated = generateNarrativeBlocks({
        maskId: mask.id,
        mask,
        contexts: mask.activation_rules.contexts,
        tags: mask.filters.include_tags,
        timeline,
        limit: filter.limit,
        includeMeta: true,
      });

      // Enrich each generated block with theatrical metadata
      narrativeBlocks = generated.map((block, idx) => ({
        ...block,
        theatrical_metadata: {
          mask_name: mask.name,
          scaena: mask.activation_rules.contexts[0] || 'General',
          performance_note: `Filtered through ${mask.name} (${mask.ontology}) perspective`,
          authentic_caveat:
            `Emphasizes ${mask.filters.include_tags.join(', ')}; ` +
            (mask.filters.exclude_tags.length > 0
              ? `de-emphasizes ${mask.filters.exclude_tags.join(', ')}`
              : 'no exclusions applied'),
        },
        weight: block.weight ?? Math.max(50, 95 - idx * 8),
        priority: block.priority ?? idx + 1,
      }));
    }

    // 5. Apply filters
    let filteredBlocks = narrativeBlocks;
    if (filter.includeAetas && filter.includeAetas.length > 0) {
      filteredBlocks = filteredBlocks.filter((block) => {
        const blockAetas = block.theatrical_metadata?.aetas
          ? [block.theatrical_metadata.aetas]
          : [];
        return blockAetas.some((a) => filter.includeAetas!.includes(a));
      });
    }
    if (filter.excludeAetas && filter.excludeAetas.length > 0) {
      filteredBlocks = filteredBlocks.filter((block) => {
        const blockAetas = block.theatrical_metadata?.aetas
          ? [block.theatrical_metadata.aetas]
          : [];
        return !blockAetas.some((a) => filter.excludeAetas!.includes(a));
      });
    }
    if (filter.minWeight !== undefined) {
      filteredBlocks = filteredBlocks.filter((block) => (block.weight || 0) >= filter.minWeight!);
    }

    // 6. Sort
    switch (filter.sortBy) {
      case 'weight':
        filteredBlocks.sort((a, b) => (b.weight || 0) - (a.weight || 0));
        break;
      case 'priority':
        filteredBlocks.sort((a, b) => (a.priority || 0) - (b.priority || 0));
        break;
      case 'relevance': {
        const priorityTags = mask.filters.include_tags;
        filteredBlocks.sort((a, b) => {
          const scoreA = scoreTimelineEntryRelevance(
            {
              id: '',
              title: a.title,
              body: a.body,
              tags: a.tags,
              start: '',
            } as unknown as TimelineEntry,
            priorityTags,
          );
          const scoreB = scoreTimelineEntryRelevance(
            {
              id: '',
              title: b.title,
              body: b.body,
              tags: b.tags,
              start: '',
            } as unknown as TimelineEntry,
            priorityTags,
          );
          return scoreB - scoreA;
        });
        break;
      }
    }

    filteredBlocks = filteredBlocks.slice(0, filter.limit);

    // 7. Build persona entry for response
    const persona: TabulaPersonarumEntry = {
      id: mask.id,
      nomen: mask.nomen || `Vir ${mask.name}is`,
      everyday_name: mask.name,
      role_vector: mask.functional_scope,
      tone_register: `${mask.stylistic_parameters.tone}, ${mask.stylistic_parameters.rhetorical_mode}`,
      visibility_scope: mask.activation_rules.contexts,
      motto: mask.motto || '',
      description: mask.functional_scope,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const theatricalPreamble = generateTheatricalPreamble(persona, filter.includeAetas);
    const authenticDisclaimer = generateAuthenticDisclaimer(persona);

    // Calculate resonance from timeline tag overlap
    const timelineTags = new Set(timeline.flatMap((t) => t.tags || []));
    const maskTags = new Set(mask.filters.include_tags);
    const overlap = [...maskTags].filter((t) => timelineTags.has(t));
    const fitScore = maskTags.size > 0 ? Math.round((overlap.length / maskTags.size) * 100) : 50;

    const resonance: PersonaResonance = {
      persona_id: maskId,
      context: mask.activation_rules.contexts.join(', '),
      fit_score: fitScore,
      alignment_keywords: overlap,
      misalignment_keywords: [...maskTags].filter((t) => !timelineTags.has(t)),
      last_used: new Date().toISOString(),
      success_count: existingSnapshot ? 1 : 0,
      feedback:
        fitScore > 70
          ? 'Strong alignment between profile data and this persona'
          : 'Moderate alignment — consider enriching timeline with more relevant entries',
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
  });

  /**
   * POST /profiles/:id/narrative/:maskId
   *
   * Updates narrative blocks for a specific persona. Enriches provided blocks
   * with theatrical metadata from the mask definition and persists as a
   * narrative snapshot.
   */
  fastify.post<{
    Params: { id: string; maskId: string };
    Body: z.infer<typeof NarrativeUpdateSchema>;
  }>('/profiles/:id/narrative/:maskId', async (request, reply) => {
    const { id, maskId } = request.params;

    if (!isValidUUID(id)) {
      return reply.status(400).send({
        error: 'Invalid profile ID format',
        code: 'INVALID_PROFILE_ID',
      });
    }

    let payload: z.infer<typeof NarrativeUpdateSchema>;
    try {
      payload = NarrativeUpdateSchema.parse(request.body);
    } catch (err) {
      return reply.status(400).send({
        error: 'Invalid request body',
        code: 'INVALID_PAYLOAD',
        details: err instanceof z.ZodError ? err.errors : undefined,
      });
    }

    // Fetch mask for enrichment
    const mask = await maskRepo.get(maskId);

    // Enrich blocks with theatrical metadata
    const enrichedBlocks = payload.blocks.map((block) => ({
      ...block,
      theatrical_metadata: {
        ...block.theatrical_metadata,
        mask_name: mask?.name || maskId,
        performance_note: mask
          ? `Emphasized in ${mask.name} (${mask.ontology}) persona context`
          : 'Enriched with persona context',
      },
    }));

    // Persist as narrative snapshot
    const snapshot = await narrativeRepo.create({
      id: crypto.randomUUID(),
      profileId: id,
      maskId,
      mask_name: mask?.name,
      status: 'draft',
      blocks: enrichedBlocks,
      theatrical_preamble: payload.customPreamble,
      authentic_disclaimer: payload.customDisclaimer,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return reply.status(200).send({
      ok: true,
      snapshot_id: snapshot.id,
      blocks_updated: enrichedBlocks.length,
      theatrical_metadata_added: enrichedBlocks.length,
      persona: {
        id: maskId,
        nomen: mask?.nomen || maskId,
        everyday_name: mask?.name || maskId,
      },
      sample_block: enrichedBlocks.length > 0 ? enrichedBlocks[0] : null,
    });
  });

  done();
}

/**
 * Generate theatrical preamble explaining the persona lens
 */
function generateTheatricalPreamble(
  persona: TabulaPersonarumEntry,
  selectedAetas?: string[],
): string {
  const aetasClause =
    selectedAetas && selectedAetas.length > 0
      ? ` During the ${selectedAetas.join(' and ')} life-stage${selectedAetas.length > 1 ? 's' : ''}, this persona is most evident.`
      : '';

  return (
    `The following narrative is presented through the lens of ${persona.everyday_name} ` +
    `(${persona.nomen} in Latin theatrical terms). This persona emphasizes: ${persona.role_vector}.` +
    aetasClause
  );
}

/**
 * Generate authentic disclaimer about what's emphasized vs de-emphasized
 */
function generateAuthenticDisclaimer(persona: TabulaPersonarumEntry): string {
  const toneNote = `This narrative adopts ${persona.tone_register.toLowerCase()} tone. `;
  const emphasisNote = `It emphasizes: ${persona.role_vector.toLowerCase()}. `;
  const scopeNote =
    persona.visibility_scope.length > 0
      ? `It is particularly apt for ${persona.visibility_scope.join(' and ')} contexts.`
      : '';

  return toneNote + emphasisNote + scopeNote;
}

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}
