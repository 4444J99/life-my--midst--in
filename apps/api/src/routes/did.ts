/**
 * DID Resolution Routes
 *
 * Provides a universal DID resolver endpoint that routes to method-specific
 * resolvers (did:key via local registry, did:web via HTTP fetch, etc.).
 */

import type { FastifyInstance } from 'fastify';
import { DIDResolverRegistry } from '@in-midst-my-life/core';

const resolutionResponseSchema = {
  type: 'object',
  properties: {
    didDocument: { type: ['object', 'null'] },
    didDocumentMetadata: { type: 'object' },
    didResolutionMetadata: { type: 'object' },
  },
} as const;

export function registerDidRoutes(
  fastify: FastifyInstance,
  _options: Record<string, unknown>,
  done: (err?: Error) => void,
): void {
  const registry = new DIDResolverRegistry();

  /**
   * GET /resolve/:did
   * Resolve any DID to its DID Document.
   *
   * The :did parameter is the full DID string (e.g. did:web:example.com).
   * Colons are valid within a URL path segment so Fastify captures the
   * entire DID including its colons as a single parameter value.
   */
  fastify.get<{
    Params: { did: string };
  }>(
    '/resolve/:did',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            did: { type: 'string' },
          },
          required: ['did'],
        },
        response: {
          200: resolutionResponseSchema,
          400: resolutionResponseSchema,
          404: resolutionResponseSchema,
          502: resolutionResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { did } = request.params;

      const result = await registry.resolve(did);

      // Map resolution errors to appropriate HTTP status codes
      const error = result.didResolutionMetadata['error'];
      if (error === 'invalidDid') {
        return reply.code(400).send(result);
      }
      if (error === 'notFound') {
        return reply.code(404).send(result);
      }
      if (error) {
        return reply.code(502).send(result);
      }

      return result;
    },
  );

  /**
   * GET /methods
   * List all registered DID method resolvers.
   */
  fastify.get('/methods', () => {
    return { methods: registry.listMethods() };
  });

  done();
}
