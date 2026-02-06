/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import type { FastifyInstance } from 'fastify';
import {
  MaskCreateSchema,
  MaskUpdateSchema,
  MaskQuerySchema,
  StageCreateSchema,
  StageUpdateSchema,
  StageQuerySchema,
  EpochCreateSchema,
  EpochUpdateSchema,
  NarrativeGenerateRequestSchema,
} from '../validation';
import type { MaskRepo, EpochRepo, StageRepo } from '../repositories/masks';
import { createMaskRepo } from '../repositories/masks';
import { createAdminMiddleware } from '../middleware/require-admin';

interface MaskRouteDeps {
  masks?: MaskRepo;
  epochs?: EpochRepo;
  stages?: StageRepo;
}

export async function registerMaskRoutes(fastify: FastifyInstance, deps?: MaskRouteDeps) {
  const defaults = createMaskRepo();
  const repos = {
    masks: deps?.masks ?? defaults.masks,
    epochs: deps?.epochs ?? defaults.epochs,
    stages: deps?.stages ?? defaults.stages,
  };

  fastify.get('/masks', async (request) => {
    const query = MaskQuerySchema.parse(request.query ?? {});
    const result = await repos.masks.list(query.offset, query.limit, {
      ontology: query.ontology,
      tag: query.tag,
      search: query.search,
    });
    return {
      ok: true,
      offset: query.offset,
      limit: query.limit,
      ...result,
      filters: { ontology: query.ontology, tag: query.tag, search: query.search },
    };
  });

  fastify.post('/masks', { preHandler: [createAdminMiddleware()] }, async (request, reply) => {
    const parsed = MaskCreateSchema.safeParse(request.body);
    if (!parsed.success)
      return reply
        .code(400)
        .send({ ok: false, error: 'invalid_mask', details: parsed.error.flatten() });
    const created = await repos.masks.create(parsed.data);
    return { ok: true, data: created };
  });

  fastify.get('/masks/:id', async (request, reply) => {
    const mask = await repos.masks.get((request.params as { id: string }).id);
    if (!mask) return reply.code(404).send({ ok: false, error: 'not_found' });
    return { ok: true, data: mask };
  });

  fastify.patch('/masks/:id', { preHandler: [createAdminMiddleware()] }, async (request, reply) => {
    const parsed = MaskUpdateSchema.safeParse(request.body);
    if (!parsed.success)
      return reply
        .code(400)
        .send({ ok: false, error: 'invalid_mask', details: parsed.error.flatten() });
    const updated = await repos.masks.update((request.params as { id: string }).id, parsed.data);
    if (!updated) return reply.code(404).send({ ok: false, error: 'not_found' });
    return { ok: true, data: updated };
  });

  fastify.delete(
    '/masks/:id',
    { preHandler: [createAdminMiddleware()] },
    async (request, reply) => {
      const removed = await repos.masks.delete((request.params as { id: string }).id);
      if (!removed) return reply.code(404).send({ ok: false, error: 'not_found' });
      return { ok: true };
    },
  );

  fastify.get('/epochs', async () => {
    const data = await repos.epochs.list();
    const epochsWithStages = await Promise.all(
      data.map(async (epoch) => {
        const stages = await repos.stages.list(epoch.id);
        return { ...epoch, stages: stages.data };
      }),
    );
    return { ok: true, data: epochsWithStages };
  });

  fastify.post('/epochs', { preHandler: [createAdminMiddleware()] }, async (request, reply) => {
    const parsed = EpochCreateSchema.safeParse(request.body);
    if (!parsed.success)
      return reply
        .code(400)
        .send({ ok: false, error: 'invalid_epoch', details: parsed.error.flatten() });
    const created = await repos.epochs.create(parsed.data);
    return { ok: true, data: created };
  });

  fastify.get('/epochs/:id', async (request, reply) => {
    const epoch = await repos.epochs.get((request.params as { id: string }).id);
    if (!epoch) return reply.code(404).send({ ok: false, error: 'not_found' });
    const stages = await repos.stages.list(epoch.id);
    return { ok: true, data: { ...epoch, stages: stages.data } };
  });

  fastify.patch(
    '/epochs/:id',
    { preHandler: [createAdminMiddleware()] },
    async (request, reply) => {
      const parsed = EpochUpdateSchema.safeParse(request.body);
      if (!parsed.success)
        return reply
          .code(400)
          .send({ ok: false, error: 'invalid_epoch', details: parsed.error.flatten() });
      const updated = await repos.epochs.update((request.params as { id: string }).id, parsed.data);
      if (!updated) return reply.code(404).send({ ok: false, error: 'not_found' });
      return { ok: true, data: updated };
    },
  );

  fastify.delete(
    '/epochs/:id',
    { preHandler: [createAdminMiddleware()] },
    async (request, reply) => {
      const removed = await repos.epochs.delete((request.params as { id: string }).id);
      if (!removed) return reply.code(404).send({ ok: false, error: 'not_found' });
      return { ok: true };
    },
  );

  fastify.get('/stages', async (request) => {
    const query = StageQuerySchema.parse(request.query ?? {});
    const stages = await repos.stages.list(query.epochId, query.offset, query.limit);
    return {
      ok: true,
      offset: query.offset,
      limit: query.limit,
      ...stages,
      filters: { epochId: query.epochId },
    };
  });

  fastify.post('/stages', { preHandler: [createAdminMiddleware()] }, async (request, reply) => {
    const parsed = StageCreateSchema.safeParse(request.body);
    if (!parsed.success)
      return reply
        .code(400)
        .send({ ok: false, error: 'invalid_stage', details: parsed.error.flatten() });
    const created = await repos.stages.create(parsed.data);
    return { ok: true, data: created };
  });

  fastify.get('/stages/:id', async (request, reply) => {
    const stage = await repos.stages.get((request.params as { id: string }).id);
    if (!stage) return reply.code(404).send({ ok: false, error: 'not_found' });
    return { ok: true, data: stage };
  });

  fastify.patch(
    '/stages/:id',
    { preHandler: [createAdminMiddleware()] },
    async (request, reply) => {
      const parsed = StageUpdateSchema.safeParse(request.body);
      if (!parsed.success)
        return reply
          .code(400)
          .send({ ok: false, error: 'invalid_stage', details: parsed.error.flatten() });
      const updated = await repos.stages.update((request.params as { id: string }).id, parsed.data);
      if (!updated) return reply.code(404).send({ ok: false, error: 'not_found' });
      return { ok: true, data: updated };
    },
  );

  fastify.delete(
    '/stages/:id',
    { preHandler: [createAdminMiddleware()] },
    async (request, reply) => {
      const removed = await repos.stages.delete((request.params as { id: string }).id);
      if (!removed) return reply.code(404).send({ ok: false, error: 'not_found' });
      return { ok: true };
    },
  );

  /**
   * POST /narrative/generate
   *
   * Generates narrative blocks from timeline entries and optional mask context.
   * Uses the mask taxonomy to filter and weight narrative content.
   */
  fastify.post('/narrative/generate', async (request, reply) => {
    const parsed = NarrativeGenerateRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: 'invalid_request',
        details: parsed.error.flatten(),
      });
    }

    const { maskId, contexts, tags, timeline, limit = 10, includeMeta = false } = parsed.data;

    // Find mask if provided
    let mask: any = null;
    if (maskId) {
      mask = await repos.masks.get(maskId);
      if (!mask) {
        return reply.code(404).send({ ok: false, error: 'mask_not_found' });
      }
    }

    // Fetch all masks, epochs, and stages for context
    await repos.masks.list(0, 100);
    await repos.epochs.list();
    await repos.stages.list(undefined, 0, 100);

    // Simulate narrative generation using mask taxonomy
    // This is a lightweight implementation; production would call @in-midst-my-life/content-model
    const narrativeBlocks = [];

    if (timeline.length > 0) {
      // Summary block from the first timeline entry
      narrativeBlocks.push({
        title: 'Professional Summary',
        body: timeline
          .slice(0, 3)
          .map(
            (entry) =>
              `• **${entry.title}** (${entry.start}): ${entry.summary || 'No summary provided'}`,
          )
          .join('\n'),
        tags: tags.length > 0 ? tags : ['summary'],
        templateId: 'narrative-summary',
        weight: 3,
      });

      // Groupby tags
      const entriesByTag = new Map<string, typeof timeline>();
      timeline.forEach((entry) => {
        (entry.tags || []).forEach((tag) => {
          if (!entriesByTag.has(tag)) entriesByTag.set(tag, []);
          entriesByTag.get(tag)!.push(entry);
        });
      });

      // Create focused blocks for priority tags
      let blockCount = 1;
      for (const [tag, entries] of entriesByTag) {
        if (narrativeBlocks.length >= limit) break;
        if (blockCount > limit - 1) break;

        narrativeBlocks.push({
          title: `${tag.charAt(0).toUpperCase() + tag.slice(1)} Focus`,
          body: entries
            .slice(0, 2)
            .map((e) => `• **${e.title}**: ${e.summary || 'Professional contribution'}`)
            .join('\n'),
          templateId: `narrative-tag-${tag}`,
          weight: 2,
        });
        blockCount++;
      }
    }

    // Add mask context block if available
    if (mask && narrativeBlocks.length < limit) {
      narrativeBlocks.push({
        title: `${mask.name} Perspective`,
        body: `Filtered through the **${mask.name}** mask (${mask.ontology}): ${mask.functional_scope}`,
        templateId: 'narrative-mask-context',
        weight: 1,
      });
    }

    // Ensure we don't exceed limit
    const finalBlocks = narrativeBlocks.slice(0, limit);

    const responseData = {
      ok: true,
      data: {
        blocks: finalBlocks,
        meta: includeMeta
          ? {
              maskId,
              mask: mask ? { id: mask.id, name: mask.name, ontology: mask.ontology } : null,
              contexts,
              tags,
              timelineCount: timeline.length,
              generatedAt: new Date().toISOString(),
            }
          : null,
      },
    };

    return responseData;
  });
}
