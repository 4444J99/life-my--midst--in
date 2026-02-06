/**
 * Semantic Search Routes
 *
 * Provides vector similarity search endpoints using pgvector.
 * Accepts text queries, generates embeddings, and returns ranked results.
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { EmbeddingsService, type EmbeddingsConfig } from '@in-midst-my-life/core';
import type { EmbeddingsRepo } from '../repositories/embeddings';

interface SearchPluginOptions extends FastifyPluginOptions {
  embeddingsRepo: EmbeddingsRepo;
  embeddingsConfig: EmbeddingsConfig;
}

export function registerSearchRoutes(
  fastify: FastifyInstance,
  options: SearchPluginOptions,
  done: (err?: Error) => void,
): void {
  const { embeddingsRepo, embeddingsConfig } = options;
  const embeddingsService = new EmbeddingsService(embeddingsConfig);

  /**
   * POST /search/jobs
   * Semantic search over job postings using text query
   */
  fastify.post<{
    Body: { query: string; limit?: number; profileId?: string };
  }>('/search/jobs', async (request, reply) => {
    const { query, limit = 10, profileId } = request.body;

    if (!query || typeof query !== 'string') {
      return reply.code(400).send({ ok: false, error: 'query is required' });
    }

    const embedding = await embeddingsService.generateEmbedding(query);
    const results = await embeddingsRepo.searchJobsBySimilarity(embedding, limit, profileId);

    return { ok: true, results };
  });

  /**
   * POST /search/profiles
   * Semantic search over profile embeddings
   */
  fastify.post<{
    Body: { query: string; limit?: number };
  }>('/search/profiles', async (request, reply) => {
    const { query, limit = 10 } = request.body;

    if (!query || typeof query !== 'string') {
      return reply.code(400).send({ ok: false, error: 'query is required' });
    }

    const embedding = await embeddingsService.generateEmbedding(query);
    const results = await embeddingsRepo.searchProfilesBySimilarity(embedding, limit);

    return { ok: true, results };
  });

  /**
   * POST /search/embed
   * Generate and store an embedding for a profile's content
   */
  fastify.post<{
    Body: { profileId: string; contentType: string; text: string };
  }>('/search/embed', async (request, reply) => {
    const { profileId, contentType, text } = request.body;

    if (!profileId || !contentType || !text) {
      return reply
        .code(400)
        .send({ ok: false, error: 'profileId, contentType, and text are required' });
    }

    // Compute content hash for cache invalidation
    const { createHash } = await import('crypto');
    const contentHash = createHash('sha256').update(text).digest('hex');

    // Skip if embedding is already up to date
    const stale = await embeddingsRepo.isStale(profileId, contentType, contentHash);
    if (!stale) {
      return { ok: true, cached: true };
    }

    const embedding = await embeddingsService.generateEmbedding(text);
    await embeddingsRepo.upsertProfileEmbedding(profileId, contentType, contentHash, embedding);

    return { ok: true, cached: false };
  });

  done();
}
