import type { FastifyInstance } from "fastify";
import { buildSchema, graphql } from "graphql";
import { graphqlSchema } from "../services/graphql-schema";
import { queryResolvers, mutationResolvers, typeResolvers, type GraphQLContext } from "../services/graphql-resolvers";

/**
 * GraphQL route handler
 * Provides a unified GraphQL API gateway for querying profiles, masks, narratives, etc.
 */

export async function registerGraphQLRoute(
  fastify: FastifyInstance,
  deps?: {
    profileRepo?: any;
    maskRepo?: any;
    narrativeService?: any;
    epochRepo?: any;
    stageRepo?: any;
  }
) {
  // Build GraphQL schema
  let schema: any;
  try {
    schema = buildSchema(graphqlSchema);
  } catch (error) {
    console.error("Failed to build GraphQL schema", error);
    return;
  }

  // Create root value (resolvers)
  const rootValue = {
    ...queryResolvers,
    ...mutationResolvers
  };

  /**
   * POST /graphql
   * 
   * Accepts GraphQL queries and mutations in the request body.
   * 
   * Request body format:
   * ```json
   * {
   *   "query": "{ profiles(limit: 10) { id displayName } }",
   *   "variables": {}
   * }
   * ```
   * 
   * Returns:
   * ```json
   * {
   *   "data": { ... },
   *   "errors": [ ... ]  // if any
   * }
   * ```
   */
  fastify.post("/graphql", async (request, reply) => {
    const { query, variables } = request.body as {
      query: string;
      variables?: Record<string, unknown>;
    };

    if (!query) {
      return reply.code(400).send({
        errors: [{ message: "No query provided" }]
      });
    }

    try {
      // Create GraphQL context with dependencies
      const context: GraphQLContext = {
        profileRepo: deps?.profileRepo,
        maskRepo: deps?.maskRepo,
        narrativeService: deps?.narrativeService,
        epochRepo: deps?.epochRepo,
        stageRepo: deps?.stageRepo
      };

      // Execute GraphQL query
      const result = await graphql({
        schema,
        source: query,
        rootValue,
        contextValue: context,
        variableValues: variables
      });

      // Return GraphQL response
      return {
        data: result.data,
        errors: result.errors?.map((e) => ({
          message: e.message,
          locations: e.locations,
          path: e.path
        }))
      };
    } catch (error) {
      console.error("GraphQL query error", error);

      return reply.code(500).send({
        errors: [
          {
            message: error instanceof Error ? error.message : "Internal server error"
          }
        ]
      });
    }
  });

  /**
   * GET /graphql/schema
   * 
   * Returns the GraphQL schema in SDL (Schema Definition Language) format.
   * Useful for clients to introspect the API structure.
   */
  fastify.get("/graphql/schema", async (_request, reply) => {
    return reply.type("text/plain").send(graphqlSchema);
  });

  /**
   * POST /graphql/playground
   * 
   * Serves GraphQL Playground HTML interface for interactive query development.
   * Returns a simple HTML page with embedded playground.
   */
  fastify.get("/graphql/playground", async (_request, reply) => {
    const playgroundHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset=utf-8/>
          <meta name="viewport" content="width=device-width, initial-scale=1"/>
          <title>GraphQL Playground</title>
          <link rel="stylesheet" href="//cdn.jsdelivr.net/npm/graphql-playground-react/build/static/css/index.css" />
          <link rel="shortcut icon" href="//cdn.jsdelivr.net/npm/graphql-playground-react/build/favicon.png" />
          <script src="//cdn.jsdelivr.net/npm/graphql-playground-react/build/static/js/middleware.js"></script>
        </head>
        <body>
          <div id="root"></div>
          <script>
            window.addEventListener('load', function (event) {
              GraphQLPlayground.init(document.getElementById('root'), {
                endpoint: '/graphql',
                schema: \`${graphqlSchema.replace(/`/g, "\\`")}\`
              })
            })
          </script>
        </body>
      </html>
    `;

    return reply.type("text/html").send(playgroundHtml);
  });

  /**
   * GET /graphql
   * 
   * Handles GraphQL requests via query parameter for simple queries.
   * Primarily for debugging and introspection.
   * 
   * Example: GET /graphql?query={profiles{id,displayName}}
   */
  fastify.get("/graphql", async (request, reply) => {
    const { query } = request.query as { query?: string };

    if (!query) {
      return reply.code(400).send({
        errors: [{ message: "No query parameter provided" }]
      });
    }

    try {
      const context: GraphQLContext = {
        profileRepo: deps?.profileRepo,
        maskRepo: deps?.maskRepo,
        narrativeService: deps?.narrativeService,
        epochRepo: deps?.epochRepo,
        stageRepo: deps?.stageRepo
      };

      const result = await graphql({
        schema,
        source: query,
        rootValue,
        contextValue: context
      });

      return {
        data: result.data,
        errors: result.errors
      };
    } catch (error) {
      return reply.code(500).send({
        errors: [
          {
            message: error instanceof Error ? error.message : "Internal server error"
          }
        ]
      });
    }
  });
}
