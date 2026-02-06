/**
 * Authentication middleware for Fastify
 * Handles JWT token verification and authorization checks
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { JWTAuth, Permission, hasPermission } from '../services/auth';

/**
 * Extend FastifyRequest to include authenticated user claims
 * (declared in types.d.ts via module augmentation)
 */

/**
 * Factory function to create JWT authentication middleware
 */
export function createAuthMiddleware(jwtAuth: JWTAuth) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip JWT verification if user is already set (e.g. by test mock hook)
    if (request.user) return;

    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return reply.code(401).send({
        ok: false,
        error: 'unauthorized',
        message: 'Authorization header required',
      });
    }

    const token = JWTAuth.extractToken(authHeader); // allow-secret
    if (!token) {
      return reply.code(401).send({
        ok: false,
        error: 'invalid_token',
        message: 'Invalid authorization header format',
      });
    }

    const claims = await jwtAuth.verifyToken(token);
    if (!claims) {
      return reply.code(401).send({
        ok: false,
        error: 'token_verification_failed',
        message: 'Token verification failed',
      });
    }

    // Attach claims to request
    request.user = claims;
  };
}

/**
 * Optional authentication middleware - doesn't fail if token is missing
 */
export function createOptionalAuthMiddleware(jwtAuth: JWTAuth) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    // Skip if user is already set (e.g. by test mock hook)
    if (request.user) return;
    void _reply;

    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return; // No token provided, continue as unauthenticated
    }

    const token = JWTAuth.extractToken(authHeader); // allow-secret
    if (!token) {
      return; // Invalid format, continue as unauthenticated
    }

    const claims = await jwtAuth.verifyToken(token);
    if (claims) {
      request.user = claims; // Attach if valid
    }
  };
}

/**
 * Factory function to create permission-based authorization middleware
 */
export function createPermissionMiddleware(requiredPermissions: Permission | Permission[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.code(401).send({
        ok: false,
        error: 'unauthorized',
        message: 'Authentication required',
      });
    }

    const permissions = Array.isArray(requiredPermissions)
      ? requiredPermissions
      : [requiredPermissions];

    const hasAllPermissions = permissions.every((permission) =>
      hasPermission(request.user!, permission),
    );

    if (!hasAllPermissions) {
      return reply.code(403).send({
        ok: false,
        error: 'forbidden',
        message: 'Insufficient permissions',
      });
    }
  };
}

/**
 * Owner-only middleware - ensures user can only access their own profile
 */
export function createOwnershipMiddleware() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.code(401).send({
        ok: false,
        error: 'unauthorized',
        message: 'Authentication required',
      });
    }

    const params = request.params as Record<string, string | undefined>;
    const body = request.body as Record<string, unknown> | undefined;
    const resourceOwnerId =
      params['profileId'] ??
      params['id'] ??
      (typeof body?.['profileId'] === 'string' ? body['profileId'] : undefined);

    // Admin can access any resource
    if (request.user.roles?.includes('admin')) {
      return;
    }

    // User ID must match resource owner
    if (request.user.sub !== resourceOwnerId && request.user.profileId !== resourceOwnerId) {
      return reply.code(403).send({
        ok: false,
        error: 'forbidden',
        message: "Cannot access other user's profile",
      });
    }
  };
}

/**
 * Rate limiting decorator
 * Prevents brute force attacks on login endpoint
 */
export class RateLimiter {
  private attempts = new Map<string, { count: number; resetAt: number }>();
  private maxAttempts: number;
  private windowMs: number;

  constructor(maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  /**
   * Check if a request should be rate limited
   */
  isLimited(key: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);

    // Clean up expired records
    if (record && now > record.resetAt) {
      this.attempts.delete(key);
      return false;
    }

    if (!record) {
      this.attempts.set(key, { count: 1, resetAt: now + this.windowMs });
      return false;
    }

    // Increment counter
    record.count++;
    return record.count > this.maxAttempts;
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string): void {
    this.attempts.delete(key);
  }
}

/**
 * Create rate limiting middleware
 */
export function createRateLimitMiddleware(
  limiter: RateLimiter,
  keyExtractor: (request: FastifyRequest) => string,
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const key = keyExtractor(request);

    if (limiter.isLimited(key)) {
      return reply.code(429).send({
        ok: false,
        error: 'too_many_requests',
        message: 'Too many requests, please try again later',
      });
    }
  };
}
