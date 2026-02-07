/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unused-vars, @typescript-eslint/no-base-to-string, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment */
/**
 * Artifact Routes
 *
 * REST API endpoints for artifact CRUD and approval workflow:
 * - GET /profiles/:profileId/artifacts - List artifacts (with filters)
 * - GET /profiles/:profileId/artifacts/pending - List pending artifacts
 * - GET /profiles/:profileId/artifacts/:artifactId - Get artifact details
 * - PATCH /profiles/:profileId/artifacts/:artifactId - Update metadata
 * - POST /profiles/:profileId/artifacts/:artifactId/approve - Approve artifact
 * - POST /profiles/:profileId/artifacts/:artifactId/reject - Reject artifact
 * - DELETE /profiles/:profileId/artifacts/:artifactId - Delete artifact
 * - POST /profiles/:profileId/artifacts/:artifactId/links - Link to project/publication
 *
 * All endpoints require authentication (user owns the profile).
 */

import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { ArtifactStatusSchema, ArtifactTypeSchema } from '@in-midst-my-life/schema';
import { artifactService } from '../services/artifact-service';
import { z } from 'zod';
import { createOwnershipMiddleware } from '../middleware/auth';

// Schema for updating artifact
const ArtifactUpdateSchema = z.object({
  title: z.string().max(200).optional(),
  descriptionMarkdown: z.string().max(5000).optional(),
  tags: z.array(z.string().regex(/^[a-z0-9-]+$/)).optional(),
  categories: z.array(z.string()).optional(),
  authors: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  type: ArtifactTypeSchema.optional(),
});

// Schema for linking artifact
const ArtifactLinkSchema = z.object({
  targetType: z.enum(['project', 'publication']),
  targetId: z.string().uuid(),
  relationshipType: z.string().default('related_to'),
});

// Schema for rejection
const RejectionSchema = z.object({
  reason: z.string().max(500).optional(),
});

/**
 * Register artifact routes.
 *
 * @param fastify Fastify instance
 */
export async function registerArtifactRoutes(fastify: FastifyInstance) {
  // Ownership guard for all write operations — uses preHandler so it runs
  // after onRequest auth hooks have populated request.user
  const ownershipCheck = createOwnershipMiddleware();
  fastify.addHook('preHandler', (request, reply, done) => {
    if (request.method === 'GET') {
      done();
      return;
    }
    void ownershipCheck(request, reply).then(() => done(), done);
  });

  /**
   * GET /profiles/:profileId/artifacts
   *
   * List artifacts with optional filtering and pagination.
   */
  fastify.get('/profiles/:profileId/artifacts', async (request, reply) => {
    const { profileId } = request.params as { profileId: string };
    const query = request.query as Record<string, unknown>;

    // Parse filters
    const filters: any = {};

    try {
      if (query['status']) {
        filters.status = ArtifactStatusSchema.parse(query['status']);
      }
      if (query['type']) {
        filters.type = ArtifactTypeSchema.parse(query['type']);
      }
    } catch (e) {
      reply.code(400);
      return { ok: false, error: 'invalid_filter_param' };
    }

    if (query['tags']) {
      const tagsStr = String(query['tags']);
      filters.tags = tagsStr.split(',').map((t) => t.trim());
    }
    if (query['sourceProvider']) filters.sourceProvider = String(query['sourceProvider']);

    // Parse pagination
    const offset = Number(query['offset'] ?? 0);
    const limit = Math.min(Number(query['limit'] ?? 20), 100);

    try {
      const result = await artifactService.listArtifacts(profileId, filters, {
        offset,
        limit,
      });

      return {
        ok: true,
        data: result.artifacts,
        pagination: {
          offset,
          limit,
          total: result.total,
        },
      };
    } catch (err) {
      request.log.error(err);
      reply.code(500);
      return { ok: false, error: 'failed_to_list_artifacts' };
    }
  });

  /**
   * GET /profiles/:profileId/artifacts/pending
   *
   * List artifacts awaiting approval.
   */
  fastify.get('/profiles/:profileId/artifacts/pending', async (request, reply) => {
    const { profileId } = request.params as { profileId: string };
    const query = request.query as Record<string, unknown>;

    const offset = Number(query['offset'] ?? 0);
    const limit = Math.min(Number(query['limit'] ?? 20), 100);

    try {
      const result = await artifactService.listArtifacts(
        profileId,
        { status: 'pending' },
        { offset, limit },
      );

      return {
        ok: true,
        data: result.artifacts,
        pagination: {
          offset,
          limit,
          total: result.total,
        },
      };
    } catch (err) {
      request.log.error(err);
      reply.code(500);
      return { ok: false, error: 'failed_to_list_pending_artifacts' };
    }
  });

  /**
   * GET /profiles/:profileId/artifacts/:artifactId
   *
   * Get a single artifact's details.
   */
  fastify.get('/profiles/:profileId/artifacts/:artifactId', async (request, reply) => {
    const { profileId, artifactId } = request.params as {
      profileId: string;
      artifactId: string;
    };

    try {
      const artifact = await artifactService.getArtifact(artifactId, profileId);

      if (!artifact) {
        reply.code(404);
        return { ok: false, error: 'artifact_not_found' };
      }

      return { ok: true, data: artifact };
    } catch (err) {
      request.log.error(err);
      reply.code(500);
      return { ok: false, error: 'failed_to_get_artifact' };
    }
  });

  /**
   * PATCH /profiles/:profileId/artifacts/:artifactId
   *
   * Update artifact metadata (manual curation).
   */
  fastify.patch('/profiles/:profileId/artifacts/:artifactId', async (request, reply) => {
    const { profileId, artifactId } = request.params as {
      profileId: string;
      artifactId: string;
    };

    try {
      const updates = ArtifactUpdateSchema.parse(request.body);

      // Ensure artifact exists
      const existing = await artifactService.getArtifact(artifactId, profileId);
      if (!existing) {
        reply.code(404);
        return { ok: false, error: 'artifact_not_found' };
      }

      const updated = await artifactService.updateArtifact(artifactId, profileId, updates as any);

      return { ok: true, data: updated };
    } catch (err) {
      if (err instanceof z.ZodError) {
        reply.code(400);
        return { ok: false, error: 'validation_error', details: err.errors };
      }
      request.log.error(err);
      reply.code(500);
      return { ok: false, error: 'failed_to_update_artifact' };
    }
  });

  /**
   * POST /profiles/:profileId/artifacts/:artifactId/approve
   *
   * Approve an artifact for inclusion in CV.
   */
  fastify.post('/profiles/:profileId/artifacts/:artifactId/approve', async (request, reply) => {
    const { profileId, artifactId } = request.params as {
      profileId: string;
      artifactId: string;
    };

    try {
      const existing = await artifactService.getArtifact(artifactId, profileId);
      if (!existing) {
        reply.code(404);
        return { ok: false, error: 'artifact_not_found' };
      }

      const approved = await artifactService.approveArtifact(artifactId, profileId);

      return { ok: true, data: approved };
    } catch (err) {
      request.log.error(err);
      reply.code(500);
      return { ok: false, error: 'failed_to_approve_artifact' };
    }
  });

  /**
   * POST /profiles/:profileId/artifacts/:artifactId/reject
   *
   * Reject an artifact (exclude from CV).
   */
  fastify.post('/profiles/:profileId/artifacts/:artifactId/reject', async (request, reply) => {
    const { profileId, artifactId } = request.params as {
      profileId: string;
      artifactId: string;
    };

    try {
      const { reason } = RejectionSchema.parse(request.body || {});

      const existing = await artifactService.getArtifact(artifactId, profileId);
      if (!existing) {
        reply.code(404);
        return { ok: false, error: 'artifact_not_found' };
      }

      const rejected = await artifactService.rejectArtifact(artifactId, profileId, reason);

      return { ok: true, data: rejected };
    } catch (err) {
      if (err instanceof z.ZodError) {
        reply.code(400);
        return { ok: false, error: 'validation_error', details: err.errors };
      }
      request.log.error(err);
      reply.code(500);
      return { ok: false, error: 'failed_to_reject_artifact' };
    }
  });

  /**
   * DELETE /profiles/:profileId/artifacts/:artifactId
   *
   * Delete an artifact (soft delete - archive).
   */
  fastify.delete('/profiles/:profileId/artifacts/:artifactId', async (request, reply) => {
    const { profileId, artifactId } = request.params as {
      profileId: string;
      artifactId: string;
    };

    try {
      const existing = await artifactService.getArtifact(artifactId, profileId);
      if (!existing) {
        reply.code(404);
        return { ok: false, error: 'artifact_not_found' };
      }

      // Soft delete by archiving
      await artifactService.updateArtifact(artifactId, profileId, { status: 'archived' });

      return { ok: true };
    } catch (err) {
      request.log.error(err);
      reply.code(500);
      return { ok: false, error: 'failed_to_delete_artifact' };
    }
  });

  /**
   * POST /profiles/:profileId/artifacts/:artifactId/links
   *
   * Link artifact to a project or publication.
   */
  fastify.post('/profiles/:profileId/artifacts/:artifactId/links', async (request, reply) => {
    const { profileId, artifactId } = request.params as {
      profileId: string;
      artifactId: string;
    };

    try {
      const { targetType, targetId, relationshipType } = ArtifactLinkSchema.parse(request.body);

      // Validate artifact exists
      const artifact = await artifactService.getArtifact(artifactId, profileId);
      if (!artifact) {
        reply.code(404);
        return { ok: false, error: 'artifact_not_found' };
      }

      // ContentEdge creation deferred to graph DB integration phase
      // For now, return success with stub

      return {
        ok: true,
        message: 'ContentEdge creation stub - implement in Phase 6+',
        contentEdge: {
          id: randomUUID(),
          sourceId: artifactId,
          targetId,
          sourceType: 'artifact',
          targetType,
          relationshipType,
          context: {},
        },
      };
    } catch (err) {
      if (err instanceof z.ZodError) {
        reply.code(400);
        return { ok: false, error: 'validation_error', details: err.errors };
      }
      request.log.error(err);
      reply.code(500);
      return { ok: false, error: 'failed_to_create_link' };
    }
  });
}
