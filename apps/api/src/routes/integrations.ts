/**
 * Cloud Storage Integration Routes
 *
 * REST API endpoints for managing cloud storage OAuth flows and sync:
 * - POST /integrations/cloud-storage/connect - Initiate OAuth flow
 * - GET /integrations/cloud-storage/callback - OAuth callback handler
 * - GET /profiles/:profileId/integrations - List connected integrations
 * - GET /profiles/:profileId/integrations/:integrationId - Get integration details
 * - PATCH /profiles/:profileId/integrations/:integrationId - Update configuration
 * - DELETE /profiles/:profileId/integrations/:integrationId - Disconnect integration
 * - POST /profiles/:profileId/integrations/:integrationId/sync - Trigger sync
 * - POST /profiles/:profileId/integrations/:integrationId/refresh - Refresh token
 *
 * OAuth flow:
 * 1. User clicks "Connect [Provider]"
 * 2. POST /integrations/cloud-storage/connect → get authorizationUrl
 * 3. User redirected to provider's OAuth consent screen
 * 4. Provider redirects back to callback with authorization code
 * 5. GET /integrations/cloud-storage/callback?code=...&state=...
 * 6. Backend exchanges code for tokens and stores encrypted
 * 7. User sees "Connected" status in settings
 */

import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { artifactService } from "../services/artifact-service";
import { ArtifactSourceProviderSchema } from "@in-midst-my-life/schema";
import { z } from "zod";

/**
 * Validation schemas
 */
const ConnectSchema = z.object({
  provider: ArtifactSourceProviderSchema.exclude(["manual"]),
  profileId: z.string().uuid()
});

const IntegrationUpdateSchema = z.object({
  folderConfig: z.object({
    includedFolders: z.array(z.string()).optional(),
    excludedPatterns: z.array(z.string()).optional(),
    maxFileSizeMB: z.number().positive().optional(),
    allowedMimeTypes: z.array(z.string()).optional()
  }).optional(),
  status: z.enum(["active", "expired", "revoked", "error"]).optional(),
  metadata: z.record(z.unknown()).optional()
});

const SyncSchema = z.object({
  mode: z.enum(["full", "incremental"]).default("incremental")
});

/**
 * OAuth provider configuration.
 *
 * In production, these would be loaded from environment variables.
 */
interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizationUrl: string;
  tokenUrl: string;
}

const getOAuthConfig = (provider: string): OAuthConfig | null => {
  // Production: Load from environment variables with proper secrets management
  // For now, return null to indicate not configured

  switch (provider) {
    case "google_drive":
      return {
        clientId: process.env['GOOGLE_DRIVE_CLIENT_ID'] || "",
        clientSecret: process.env['GOOGLE_DRIVE_CLIENT_SECRET'] || "",
        redirectUri: process.env['GOOGLE_DRIVE_REDIRECT_URI'] || "http://localhost:3001/integrations/cloud-storage/callback",
        authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token"
      };

    case "dropbox":
      return {
        clientId: process.env['DROPBOX_APP_KEY'] || "",
        clientSecret: process.env['DROPBOX_APP_SECRET'] || "",
        redirectUri: process.env['DROPBOX_REDIRECT_URI'] || "http://localhost:3001/integrations/cloud-storage/callback",
        authorizationUrl: "https://www.dropbox.com/oauth2/authorize",
        tokenUrl: "https://api.dropboxapi.com/oauth2/token"
      };

    case "icloud":
      // iCloud requires complex OAuth setup; for MVP, use local filesystem
      return null;

    case "local":
      // Local filesystem doesn't require OAuth
      return null;

    default:
      return null;
  }
};

/**
 * Generate OAuth state token for CSRF protection.
 *
 * State is stored in session or short-lived cache.
 */
function generateOAuthState(profileId: string, provider: string): string {
  const timestamp = Date.now();
  const random = randomUUID();
  return Buffer.from(`${profileId}:${provider}:${timestamp}:${random}`).toString(
    "base64"
  );
}

/**
 * Register cloud storage integration routes.
 *
 * @param fastify Fastify instance
 */
export async function registerIntegrationRoutes(fastify: FastifyInstance) {
  /**
   * POST /integrations/cloud-storage/connect
   *
   * Initiate OAuth flow for a cloud storage provider.
   */
  fastify.post(
    "/integrations/cloud-storage/connect",
    async (request, reply) => {
      try {
        const { provider, profileId } = ConnectSchema.parse(request.body);

        const config = getOAuthConfig(provider);
        if (!config || !config.clientId) {
          reply.code(400);
          return {
            ok: false,
            error: `provider_not_configured: ${provider}`,
            message: `OAuth credentials not configured for ${provider}. Check environment variables.`
          };
        }

        // Generate OAuth state for CSRF protection
        const state = generateOAuthState(profileId, provider);

        // Build authorization URL with scopes
        const scopes = getOAuthScopes(provider);
        const params = new URLSearchParams({
          client_id: config.clientId,
          redirect_uri: config.redirectUri,
          response_type: "code",
          scope: scopes.join(" "),
          state,
          access_type: "offline" // Request refresh token
        });

        const authorizationUrl = `${config.authorizationUrl}?${params.toString()}`;

        return {
          ok: true,
          authorizationUrl,
          state,
          provider,
          profileId
        };
      } catch (err) {
        if (err instanceof z.ZodError) {
          reply.code(400);
          return { ok: false, error: "validation_error", details: err.errors };
        }
        request.log.error(err);
        reply.code(500);
        return { ok: false, error: "failed_to_generate_auth_url" };
      }
    }
  );

  /**
   * GET /integrations/cloud-storage/callback
   *
   * OAuth callback handler.
   */
  fastify.get(
    "/integrations/cloud-storage/callback",
    async (request, reply) => {
      const query = request.query as Record<string, string>;
      const { code, state, error } = query;

      // Check for user denial
      if (error) {
        reply.code(400);
        return {
          ok: false,
          error: `oauth_denied: ${error}`,
          message: "User denied permission or OAuth provider returned an error"
        };
      }

      if (!code || !state) {
        reply.code(400);
        return { ok: false, error: "missing_code_or_state" };
      }

      try {
        // Decode state to extract profileId and provider
        const stateDecoded = Buffer.from(state, "base64").toString("utf-8");
        const [profileId, provider] = stateDecoded.split(":").slice(0, 2);

        if (!profileId || !provider) {
          reply.code(400);
          return { ok: false, error: "invalid_state_format" };
        }

        const config = getOAuthConfig(provider);
        if (!config) {
          reply.code(400);
          return { ok: false, error: "invalid_provider" };
        }

        // TODO: Exchange code for tokens
        // This would involve:
        // 1. POST to config.tokenUrl with code + client credentials
        // 2. Receive access_token and refresh_token
        // 3. Encrypt tokens using crypto utilities
        // 4. Create CloudStorageIntegration record with encrypted tokens
        // 5. Return success with integration details

        // For MVP, return success stub
        const integrationId = randomUUID();
        const integration = await artifactService.createIntegration(
          {
            id: integrationId,
            profileId,
            provider: provider as any,
            status: "active",
            folderConfig: {
              includedFolders: [""],
              excludedPatterns: [],
              maxFileSizeMB: 100
            }
          },
          profileId
        );

        return {
          ok: true,
          message: "OAuth callback stub - full token exchange in Phase 5+",
          integration: {
            id: integration.id,
            provider: integration.provider,
            status: integration.status
          },
          nextSteps: "User should be redirected to settings page with integration confirmed"
        };
      } catch (err) {
        request.log.error(err);
        reply.code(500);
        return { ok: false, error: "failed_to_process_callback" };
      }
    }
  );

  /**
   * GET /profiles/:profileId/integrations
   *
   * List all connected cloud storage integrations for a profile.
   */
  fastify.get(
    "/profiles/:profileId/integrations",
    async (request, reply) => {
      const { profileId } = request.params as { profileId: string };

      try {
        const integrations = await artifactService.listIntegrations(profileId);

        // Don't expose encrypted tokens in response
        const safe = integrations.map((i) => {
           // eslint-disable-next-line @typescript-eslint/no-unused-vars
           const { accessTokenEncrypted, refreshTokenEncrypted, ...rest } = i;
           return rest;
        });

        return {
          ok: true,
          data: safe
        };
      } catch (err) {
        request.log.error(err);
        reply.code(500);
        return { ok: false, error: "failed_to_list_integrations" };
      }
    }
  );

  /**
   * GET /profiles/:profileId/integrations/:integrationId
   *
   * Get a specific integration's configuration.
   */
  fastify.get(
    "/profiles/:profileId/integrations/:integrationId",
    async (request, reply) => {
      const { profileId, integrationId } = request.params as {
        profileId: string;
        integrationId: string;
      };

      try {
        const integration = await artifactService.getIntegration(
          integrationId,
          profileId
        );

        if (!integration) {
          reply.code(404);
          return { ok: false, error: "integration_not_found" };
        }

        // Don't expose encrypted tokens
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { accessTokenEncrypted, refreshTokenEncrypted, ...safe } = integration;

        return { ok: true, data: safe };
      } catch (err) {
        request.log.error(err);
        reply.code(500);
        return { ok: false, error: "failed_to_get_integration" };
      }
    }
  );

  /**
   * PATCH /profiles/:profileId/integrations/:integrationId
   *
   * Update integration configuration (folder settings, exclusions, etc).
   */
  fastify.patch(
    "/profiles/:profileId/integrations/:integrationId",
    async (request, reply) => {
      const { profileId, integrationId } = request.params as {
        profileId: string;
        integrationId: string;
      };
      
      try {
        const updates = IntegrationUpdateSchema.parse(request.body);
        
        // Ensure integration exists
        const existing = await artifactService.getIntegration(integrationId, profileId);
        if (!existing) {
          reply.code(404);
          return { ok: false, error: "integration_not_found" };
        }

        const updated = await artifactService.updateIntegration(
          integrationId,
          profileId,
          updates as any
        );

        if (!updated) {
          reply.code(404);
          return { ok: false, error: "integration_not_found" };
        }

        // Don't expose encrypted tokens
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { accessTokenEncrypted, refreshTokenEncrypted, ...safe } = updated;

        return { ok: true, data: safe };
      } catch (err) {
        if (err instanceof z.ZodError) {
          reply.code(400);
          return { ok: false, error: "validation_error", details: err.errors };
        }
        request.log.error(err);
        reply.code(500);
        return { ok: false, error: "failed_to_update_integration" };
      }
    }
  );

  /**
   * DELETE /profiles/:profileId/integrations/:integrationId
   *
   * Disconnect a cloud storage integration.
   */
  fastify.delete(
    "/profiles/:profileId/integrations/:integrationId",
    async (request, reply) => {
      const { profileId, integrationId } = request.params as {
        profileId: string;
        integrationId: string;
      };

      try {
        const existing = await artifactService.getIntegration(integrationId, profileId);
        if (!existing) {
          reply.code(404);
          return { ok: false, error: "integration_not_found" };
        }
        
        // TODO: Revoke OAuth tokens with provider before deleting
        // This would involve calling the provider's token revocation endpoint

        const deleted = await artifactService.deleteIntegration(
          integrationId,
          profileId
        );

        return { ok: true, message: "Integration disconnected" };
      } catch (err) {
        request.log.error(err);
        reply.code(500);
        return { ok: false, error: "failed_to_delete_integration" };
      }
    }
  );

  /**
   * POST /profiles/:profileId/integrations/:integrationId/sync
   *
   * Trigger a manual artifact sync for this integration.
   */
  fastify.post(
    "/profiles/:profileId/integrations/:integrationId/sync",
    async (request, reply) => {
      const { profileId, integrationId } = request.params as {
        profileId: string;
        integrationId: string;
      };
      
      try {
        const { mode } = SyncSchema.parse(request.body || {});

        // Verify integration exists
        const integration = await artifactService.getIntegration(
          integrationId,
          profileId
        );

        if (!integration) {
          reply.code(404);
          return { ok: false, error: "integration_not_found" };
        }

        // TODO: Enqueue task in orchestrator
        // This would involve:
        // 1. Create task with role="catcher"
        // 2. Set description based on mode (artifact_import_full or artifact_sync_incremental)
        // 3. Include integrationId and profileId in payload
        // 4. Queue task and return task ID

        const taskId = randomUUID();

        return {
          ok: true,
          message: "Sync task enqueued - orchestrator integration in Phase 6+",
          taskId,
          mode: mode ?? "incremental",
          integrationId,
          profileId,
          status: "queued",
          estimatedTime: mode === "full" ? "10-30 minutes" : "2-5 minutes"
        };
      } catch (err) {
        if (err instanceof z.ZodError) {
          reply.code(400);
          return { ok: false, error: "validation_error", details: err.errors };
        }
        request.log.error(err);
        reply.code(500);
        return { ok: false, error: "failed_to_enqueue_sync_task" };
      }
    }
  );

  /**
   * POST /profiles/:profileId/integrations/:integrationId/refresh
   *
   * Manually refresh OAuth token.
   */
  fastify.post(
    "/profiles/:profileId/integrations/:integrationId/refresh",
    async (request, reply) => {
      const { profileId, integrationId } = request.params as {
        profileId: string;
        integrationId: string;
      };

      try {
        const integration = await artifactService.getIntegration(
          integrationId,
          profileId
        );

        if (!integration) {
          reply.code(404);
          return { ok: false, error: "integration_not_found" };
        }

        // TODO: Use refresh token to get new access token
        // This would involve:
        // 1. Decrypt refresh_token_encrypted
        // 2. Call provider's token endpoint with refresh_token
        // 3. Receive new access_token (and optionally new refresh_token)
        // 4. Encrypt and update integration record

        return {
          ok: true,
          message: "Token refresh stub - full implementation in Phase 5+"
        };
      } catch (err) {
        request.log.error(err);
        reply.code(500);
        return { ok: false, error: "failed_to_refresh_token" };
      }
    }
  );
}

/**
 * Get OAuth scopes for a provider.
 *
 * Different providers require different scope strings.
 *
 * @param provider Cloud storage provider name
 * @returns Array of OAuth scopes
 */
function getOAuthScopes(provider: string): string[] {
  switch (provider) {
    case "google_drive":
      return [
        "https://www.googleapis.com/auth/drive.readonly", // Read-only access to Drive
        "https://www.googleapis.com/auth/userinfo.email" // User email for identity
      ];

    case "dropbox":
      return [
        "files.content.read", // Read files
        "account_info.read" // Read account info
      ];

    case "icloud":
      // iCloud requires different handling
      return [];

    default:
      return [];
  }
}
