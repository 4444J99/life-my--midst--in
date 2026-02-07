/**
 * Integration Operations Routes
 *
 * Complex operations for cloud storage integrations:
 * - DELETE /profiles/:profileId/integrations/:integrationId - Disconnect integration
 * - POST /profiles/:profileId/integrations/:integrationId/sync - Trigger sync
 * - POST /profiles/:profileId/integrations/:integrationId/refresh - Refresh token
 */

import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { artifactService } from "../../services/artifact-service";
import { SyncSchema, getOAuthConfig, getRevokeTokenUrl } from "./validation";

/**
 * Register integration operation routes.
 */
export async function registerIntegrationOperationRoutes(
  fastify: FastifyInstance
) {
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
        const existing = await artifactService.getIntegration(
          integrationId,
          profileId
        );
        if (!existing) {
          reply.code(404);
          return { ok: false, error: "integration_not_found" };
        }

        // Revoke OAuth tokens with provider before deleting
        const config = getOAuthConfig(existing.provider);
        if (config && existing.accessTokenEncrypted) {
          try {
            const { decrypt } = await import("@in-midst-my-life/core");
            const accessToken = decrypt<string>(existing.accessTokenEncrypted);

            // Attempt token revocation (best effort)
            const revocationUrl = getRevokeTokenUrl(existing.provider);
            if (revocationUrl) {
              await fetch(revocationUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                  token: accessToken, // allow-secret
                  client_id: config.clientId,
                  client_secret: config.clientSecret, // allow-secret
                }),
              }).catch((err: unknown) => {
                // Log but don't fail deletion if revocation fails
                request.log.warn({ err }, "Token revocation failed");
              });
            }
          } catch (decryptError: unknown) {
            // Log but continue with deletion even if decryption/revocation fails
            request.log.warn(
              { err: decryptError },
              "Token decryption/revocation error"
            );
          }
        }

        await artifactService.deleteIntegration(integrationId, profileId);

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

        // Task enqueueing deferred — orchestrator integration via HTTP webhook
        // When ready: POST to orchestrator with role="catcher", mode-based description,
        // and { integrationId, profileId } payload

        const taskId = randomUUID();

        return {
          ok: true,
          message: "Sync task enqueued - orchestrator integration in Phase 6+",
          taskId,
          mode: mode ?? "incremental",
          integrationId,
          profileId,
          status: "queued",
          estimatedTime: mode === "full" ? "10-30 minutes" : "2-5 minutes",
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

        // Check if refresh token exists
        if (!integration.refreshTokenEncrypted) {
          reply.code(400);
          return {
            ok: false,
            error: "no_refresh_token",
            message:
              "Integration does not have a refresh token. User must reconnect.",
          };
        }

        const config = getOAuthConfig(integration.provider);
        if (!config) {
          reply.code(500);
          return {
            ok: false,
            error: "provider_config_missing",
            message: "OAuth configuration not available for this provider",
          };
        }

        try {
          // Decrypt refresh token
          const { decrypt, encrypt } = await import("@in-midst-my-life/core");
          const refreshToken = decrypt<string>(integration.refreshTokenEncrypted);

          // Request new access token
          const tokenResponse = await fetch(config.tokenUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Accept: "application/json",
            },
            body: new URLSearchParams({
              grant_type: "refresh_token",
              refresh_token: refreshToken,
              client_id: config.clientId,
              client_secret: config.clientSecret, // allow-secret
            }),
          });

          if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json().catch(() => ({}));

            // If refresh token is invalid/expired, mark integration as expired
            if (
              errorData.error === "invalid_grant" ||
              tokenResponse.status === 401
            ) {
              await artifactService.updateIntegration(integrationId, profileId, {
                status: "expired",
                metadata: {
                  ...integration.metadata,
                  refresh_failed_at: new Date().toISOString(),
                  refresh_error: "invalid_grant",
                },
              });

              reply.code(401);
              return {
                ok: false,
                error: "refresh_token_expired",
                message:
                  "Refresh token is expired or invalid. User must reconnect.",
              };
            }

            reply.code(502);
            return {
              ok: false,
              error: "refresh_failed",
              message: `Token refresh failed: ${errorData.error || tokenResponse.statusText}`,
            };
          }

          const tokens = await tokenResponse.json();
          const {
            access_token,
            refresh_token: new_refresh_token,
            expires_in,
          } = tokens;

          if (!access_token) {
            reply.code(502);
            return {
              ok: false,
              error: "invalid_token_response",
              message: "Provider did not return an access token",
            };
          }

          // Encrypt new tokens
          const accessTokenEncrypted = encrypt(access_token);
          const refreshTokenEncrypted = new_refresh_token
            ? encrypt(new_refresh_token)
            : integration.refreshTokenEncrypted; // Keep old refresh token if not rotated

          // Calculate new expiration
          const tokenExpiresAt = expires_in
            ? new Date(Date.now() + expires_in * 1000).toISOString()
            : undefined;

          // Update integration with new tokens
          await artifactService.updateIntegration(integrationId, profileId, {
            accessTokenEncrypted,
            refreshTokenEncrypted,
            tokenExpiresAt,
            status: "active",
            metadata: {
              ...integration.metadata,
              last_token_refresh: new Date().toISOString(),
            },
          });

          return {
            ok: true,
            message: "Access token refreshed successfully",
            expiresAt: tokenExpiresAt,
          };
        } catch (fetchError: unknown) {
          request.log.error({ err: fetchError }, "Token refresh error");
          reply.code(502);
          return {
            ok: false,
            error: "refresh_request_failed",
            message:
              fetchError instanceof Error
                ? fetchError.message
                : "Failed to communicate with OAuth provider",
          };
        }
      } catch (err) {
        request.log.error(err);
        reply.code(500);
        return { ok: false, error: "failed_to_refresh_token" };
      }
    }
  );
}
