import type { FastifyInstance } from 'fastify';
import { buildSchema, graphql, type GraphQLSchema } from 'graphql';
import { graphqlSchema } from '../services/graphql-schema';
import {
  queryResolvers,
  mutationResolvers,
  subscriptionResolvers,
  type GraphQLContext,
} from '../services/graphql-resolvers';
import type { ProfileRepo } from '../repositories/profiles';
import type { MaskRepo, EpochRepo, StageRepo } from '../repositories/masks';
import type { CvRepos } from '../repositories/cv';
import type { NarrativeRepo } from '../repositories/narratives';
import type { PubSubEngine } from '../services/pubsub';

/**
 * GraphQL route handler
 * Provides a unified GraphQL API gateway for querying profiles, masks, narratives, etc.
 */

interface GraphQLPluginDeps {
  profileRepo?: ProfileRepo;
  maskRepo?: MaskRepo;
  epochRepo?: EpochRepo;
  stageRepo?: StageRepo;
  cvRepos?: CvRepos;
  narrativeRepo?: NarrativeRepo;
  pubsub?: PubSubEngine;
}

/** Maximum allowed query depth to prevent abuse */
const MAX_QUERY_DEPTH = 10;

/** Rough check for query depth by counting nested braces */
function estimateQueryDepth(query: string): number {
  let depth = 0;
  let maxDepth = 0;
  for (const ch of query) {
    if (ch === '{') {
      depth++;
      if (depth > maxDepth) maxDepth = depth;
    } else if (ch === '}') {
      depth--;
    }
  }
  return maxDepth;
}

export function registerGraphQLRoute(
  fastify: FastifyInstance,
  deps: GraphQLPluginDeps,
  done: (err?: Error) => void,
): void {
  // Build GraphQL schema once at startup
  let schema: GraphQLSchema;
  try {
    schema = buildSchema(graphqlSchema);
  } catch (error) {
    fastify.log.error(error, 'Failed to build GraphQL schema');
    done(error instanceof Error ? error : new Error(String(error)));
    return;
  }

  // Merge query + mutation + subscription resolvers into root value
  const rootValue = {
    ...queryResolvers,
    ...mutationResolvers,
    ...subscriptionResolvers,
  };

  const isProduction = process.env['NODE_ENV'] === 'production';

  /**
   * POST /graphql
   *
   * Accepts GraphQL queries and mutations in the request body.
   */
  fastify.post<{
    Body: { query: string; variables?: Record<string, unknown>; operationName?: string };
  }>(
    '/graphql',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            variables: { type: 'object' },
            operationName: { type: 'string' },
          },
          required: ['query'],
        },
      },
    },
    async (request, reply) => {
      const { query, variables, operationName } = request.body;

      if (!query) {
        return reply.code(400).send({
          errors: [{ message: 'No query provided' }],
        });
      }

      // Block introspection in production
      if (isProduction && query.includes('__schema')) {
        return reply.code(400).send({
          errors: [{ message: 'Introspection is disabled in production' }],
        });
      }

      // Depth limiting
      if (estimateQueryDepth(query) > MAX_QUERY_DEPTH) {
        return reply.code(400).send({
          errors: [{ message: `Query depth exceeds maximum of ${MAX_QUERY_DEPTH}` }],
        });
      }

      try {
        const context: GraphQLContext = {
          profileRepo: deps.profileRepo,
          maskRepo: deps.maskRepo,
          epochRepo: deps.epochRepo,
          stageRepo: deps.stageRepo,
          cvRepos: deps.cvRepos,
          narrativeRepo: deps.narrativeRepo,
          pubsub: deps.pubsub,
        };

        const result = await graphql({
          schema,
          source: query,
          rootValue,
          contextValue: context,
          variableValues: variables,
          operationName,
        });

        return {
          data: result.data,
          errors: result.errors?.map((e) => ({
            message: e.message,
            locations: e.locations,
            path: e.path,
          })),
        };
      } catch (error) {
        fastify.log.error(error, 'GraphQL query error');

        return reply.code(500).send({
          errors: [
            {
              message: error instanceof Error ? error.message : 'Internal server error',
            },
          ],
        });
      }
    },
  );

  /**
   * GET /graphql/schema
   *
   * Returns the GraphQL schema in SDL format. Disabled in production.
   */
  fastify.get('/graphql/schema', async (_request, reply) => {
    if (isProduction) {
      return reply.code(403).send({ error: 'Schema introspection disabled in production' });
    }
    return reply.type('text/plain').send(graphqlSchema);
  });

  /**
   * GET /graphql
   *
   * Handles GraphQL requests via query parameter for simple queries.
   * Primarily for debugging and introspection — disabled in production.
   */
  fastify.get<{
    Querystring: { query?: string };
  }>('/graphql', async (request, reply) => {
    if (isProduction) {
      return reply.code(405).send({ error: 'GET queries disabled in production' });
    }

    const { query } = request.query;

    if (!query) {
      return reply.code(400).send({
        errors: [{ message: 'No query parameter provided' }],
      });
    }

    try {
      const context: GraphQLContext = {
        profileRepo: deps.profileRepo,
        maskRepo: deps.maskRepo,
        epochRepo: deps.epochRepo,
        stageRepo: deps.stageRepo,
        pubsub: deps.pubsub,
      };

      const result = await graphql({
        schema,
        source: query,
        rootValue,
        contextValue: context,
      });

      return {
        data: result.data,
        errors: result.errors,
      };
    } catch (error) {
      return reply.code(500).send({
        errors: [
          {
            message: error instanceof Error ? error.message : 'Internal server error',
          },
        ],
      });
    }
  });

  done();
}
