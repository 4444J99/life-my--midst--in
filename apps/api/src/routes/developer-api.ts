/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { FastifyInstance } from 'fastify';
import { z } from 'zod';

/**
 * Developer/Third-Party API
 * OAuth 2.0 provider for third-party integrations
 */

// Schemas
const CreateOAuthAppSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  redirectUris: z.array(z.string().url()),
  permissions: z.array(
    z.enum(['read:profile', 'read:personas', 'write:feedback', 'read:messages']),
  ),
});

type CreateOAuthAppRequest = z.infer<typeof CreateOAuthAppSchema>;

interface OAuthApp {
  id: string;
  userId: string;
  name: string;
  description: string;
  clientId: string;
  clientSecret: string;
  redirectUris: string[];
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
  revokedAt?: Date;
}

// Mock storage
const oauthApps = new Map<string, OAuthApp>();
const authorizationCodes = new Map<string, { userId: string; clientId: string; expiresAt: Date }>();
const accessTokens = new Map<string, { userId: string; clientId: string; permissions: string[] }>();

export function developerApiRoutes(fastify: FastifyInstance, _opts: unknown, done: () => void) {
  /**
   * Create OAuth Application
   * POST /developers/apps
   */
  fastify.post<{ Body: CreateOAuthAppRequest }>(
    '/developers/apps',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name', 'redirectUris', 'permissions'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            description: { type: 'string', maxLength: 500 },
            redirectUris: { type: 'array', items: { type: 'string', format: 'uri' } },
            permissions: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['read:profile', 'read:personas', 'write:feedback', 'read:messages'],
              },
            },
          },
        },
        response: {
          201: {
            type: 'object',
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const createRequest = CreateOAuthAppSchema.parse(request.body);
        if (!request.user?.sub) {
          return reply.code(401).send({ error: 'Authentication required' });
        }
        const userId = request.user.sub;

        const appId = crypto.randomUUID();
        const clientId = `imml_${crypto.getRandomValues(new Uint8Array(16)).join('')}`;
        const clientSecret = `secret_${crypto.getRandomValues(new Uint8Array(32)).join('')}`;

        const app: OAuthApp = {
          id: appId,
          userId,
          name: createRequest.name,
          description: createRequest.description,
          clientId,
          clientSecret,
          redirectUris: createRequest.redirectUris,
          permissions: createRequest.permissions,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        oauthApps.set(appId, app);

        fastify.log.info({
          msg: 'OAuth app created',
          appId,
          clientId,
          userId,
        });

        reply.code(201).send({
          id: appId,
          clientId,
          clientSecret, // Only returned once
          name: app.name,
          description: app.description,
          redirectUris: app.redirectUris,
          permissions: app.permissions,
          createdAt: app.createdAt,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({
            error: 'Invalid request',
            details: error.errors,
          });
        } else {
          fastify.log.error(error);
          reply.code(500).send({
            error: 'Failed to create OAuth app',
          });
        }
      }
    },
  );

  /**
   * List OAuth Applications
   * GET /developers/apps
   */
  fastify.get(
    '/developers/apps',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              apps: { type: 'array' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.user?.sub) {
        return reply.code(401).send({ error: 'Authentication required' });
      }
      const userId = request.user.sub;

      const userApps = Array.from(oauthApps.values())
        .filter((app) => app.userId === userId && !app.revokedAt)
        .map((app) => ({
          id: app.id,
          clientId: app.clientId,
          name: app.name,
          description: app.description,
          redirectUris: app.redirectUris,
          permissions: app.permissions,
          createdAt: app.createdAt,
          updatedAt: app.updatedAt,
        }));

      reply.send({
        apps: userApps,
        total: userApps.length,
      });
    },
  );

  /**
   * OAuth Authorization Endpoint
   * GET /oauth/authorize
   */
  fastify.get(
    '/oauth/authorize',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['client_id', 'redirect_uri', 'response_type', 'scope'],
          properties: {
            client_id: { type: 'string' },
            redirect_uri: { type: 'string', format: 'uri' },
            response_type: { type: 'string', enum: ['code'] },
            scope: { type: 'string' },
            state: { type: 'string' },
          },
        },
        response: {
          302: { description: 'Redirect with authorization code' },
          400: { description: 'Invalid request' },
        },
      },
    },
    async (request, reply) => {
      const { client_id, redirect_uri, state } = request.query as {
        client_id?: string;
        redirect_uri?: string;
        scope?: string;
        state?: string;
      };

      // Find app
      const app = Array.from(oauthApps.values()).find((a) => a.clientId === client_id);

      if (!app || !redirect_uri) {
        return reply.code(400).send({
          error: 'invalid_request',
        });
      }

      // Validate redirect URI
      if (!app.redirectUris.includes(redirect_uri)) {
        return reply.code(400).send({
          error: 'invalid_grant',
        });
      }

      // In production, show user consent screen here
      // For now, generate auth code
      const authCode = crypto.randomUUID();
      if (!request.user?.sub) {
        return reply.code(401).send({ error: 'Authentication required' });
      }
      const userId = request.user.sub;

      authorizationCodes.set(authCode, {
        userId,
        clientId: client_id!,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      });

      // Redirect with code
      const redirectUrl = new URL(redirect_uri);
      redirectUrl.searchParams.append('code', authCode);
      if (state) redirectUrl.searchParams.append('state', state);

      return reply.redirect(redirectUrl.toString());
    },
  );

  /**
   * OAuth Token Endpoint
   * POST /oauth/token
   */
  fastify.post(
    '/oauth/token',
    {
      schema: {
        body: {
          type: 'object',
          required: ['grant_type', 'client_id', 'client_secret'],
          properties: {
            grant_type: { type: 'string', enum: ['authorization_code', 'refresh_token'] },
            client_id: { type: 'string' },
            client_secret: { type: 'string' },
            code: { type: 'string' },
            refresh_token: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
          },
          400: { description: 'Invalid grant' },
        },
      },
    },
    async (request, reply) => {
      const { grant_type, client_id, client_secret, code } = request.body as {
        grant_type?: string;
        client_id?: string;
        client_secret?: string;
        code?: string;
        refresh_token?: string;
      };

      // Find app
      const app = Array.from(oauthApps.values()).find(
        (a) => a.clientId === client_id && a.clientSecret === client_secret,
      );

      if (!app) {
        return reply.code(400).send({
          error: 'invalid_client',
        });
      }

      let userId: string | null = null;

      // Handle authorization code grant
      if (grant_type === 'authorization_code') {
        const authData = authorizationCodes.get(code || '');

        if (!authData || new Date() > authData.expiresAt) {
          return reply.code(400).send({
            error: 'invalid_grant',
          });
        }

        userId = authData.userId;
        authorizationCodes.delete(code!);
      }

      // Handle refresh token grant
      if (grant_type === 'refresh_token') {
        // Validate refresh token (simplified)
        userId = request.user?.sub || null;
      }

      if (!userId) {
        return reply.code(400).send({
          error: 'invalid_grant',
        });
      }

      // Generate tokens
      const accessToken = crypto.randomUUID();
      const newRefreshToken = crypto.randomUUID();
      const expiresIn = 3600; // 1 hour

      accessTokens.set(accessToken, {
        userId,
        clientId: client_id!,
        permissions: app.permissions,
      });

      fastify.log.info({
        msg: 'OAuth token issued',
        clientId: client_id,
        userId,
        permissions: app.permissions,
      });

      reply.send({
        access_token: accessToken,
        refresh_token: newRefreshToken,
        token_type: 'Bearer',
        expires_in: expiresIn,
      });
    },
  );

  /**
   * Validate Access Token
   * GET /oauth/token/introspect
   */
  fastify.post(
    '/oauth/token/introspect',
    {
      schema: {
        body: {
          type: 'object',
          required: ['token'],
          properties: {
            token: { type: 'string' }, // allow-secret
          },
        },
        response: {
          200: {
            type: 'object',
          },
        },
      },
    },
    async (request, reply) => {
      const { token } = request.body as { token?: string };

      const tokenData = accessTokens.get(token || '');

      if (!tokenData) {
        return reply.send({
          active: false,
        });
      }

      reply.send({
        active: true,
        sub: tokenData.userId,
        client_id: tokenData.clientId,
        scope: tokenData.permissions.join(' '),
        token_type: 'Bearer',
      });
    },
  );

  /**
   * Get User Profile (Protected)
   * GET /user/profile
   * Requires: read:profile scope
   */
  fastify.get(
    '/user/profile',
    {
      schema: {
        response: {
          200: {
            type: 'object',
          },
          401: { description: 'Unauthorized' },
        },
      },
    },
    async (request, reply) => {
      const authHeader = request.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(401).send({
          error: 'unauthorized',
        });
      }

      const token = authHeader.slice(7); // allow-secret
      const tokenData = accessTokens.get(token);

      if (!tokenData || !tokenData.permissions.includes('read:profile')) {
        return reply.code(401).send({
          error: 'insufficient_scope',
        });
      }

      // Return mock user profile
      reply.send({
        id: tokenData.userId,
        name: 'John Doe',
        email: 'john@example.com',
        avatar: 'https://example.com/avatar.jpg',
        createdAt: '2024-01-01T00:00:00Z',
      });
    },
  );

  /**
   * Get User Personas (Protected)
   * GET /user/personas
   * Requires: read:personas scope
   */
  fastify.get(
    '/user/personas',
    {
      schema: {
        response: {
          200: {
            type: 'object',
          },
          401: { description: 'Unauthorized' },
        },
      },
    },
    async (request, reply) => {
      const authHeader = request.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(401).send({
          error: 'unauthorized',
        });
      }

      const token = authHeader.slice(7); // allow-secret
      const tokenData = accessTokens.get(token);

      if (!tokenData || !tokenData.permissions.includes('read:personas')) {
        return reply.code(401).send({
          error: 'insufficient_scope',
        });
      }

      // Return mock personas
      reply.send({
        personas: [
          {
            id: '1',
            name: 'Engineer',
          },
          {
            id: '2',
            name: 'Architect',
          },
        ],
      });
    },
  );

  /**
   * Revoke OAuth App
   * DELETE /developers/apps/:appId
   */
  fastify.delete<{ Params: { appId: string } }>(
    '/developers/apps/:appId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['appId'],
          properties: {
            appId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request, reply) => {
      const { appId } = request.params;
      if (!request.user?.sub) {
        return reply.code(401).send({ error: 'Authentication required' });
      }
      const userId = request.user.sub;

      const app = oauthApps.get(appId);

      if (!app || app.userId !== userId) {
        return reply.code(404).send({
          error: 'App not found',
        });
      }

      // Revoke app (soft delete)
      app.revokedAt = new Date();

      fastify.log.info({
        msg: 'OAuth app revoked',
        appId,
        userId,
      });

      reply.send({
        message: 'App revoked successfully',
      });
    },
  );

  done();
}
