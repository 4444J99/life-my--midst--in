/**
 * JWT Authentication service for API security.
 * Provides token generation, verification, and middleware for protected endpoints.
 */

import * as jose from "jose";
import type { JWTPayload } from "jose";

export interface AuthConfig {
  /**
   * JWT signing secret (should be strong and random)
   */
  secret: string; // allow-secret

  /**
   * Token expiration time (in seconds, default 3600 = 1 hour)
   */
  expiresIn?: number;

  /**
   * Refresh token expiration (in seconds, default 7 days)
   */
  refreshExpiresIn?: number;

  /**
   * Issuer identifier
   */
  issuer?: string;

  /**
   * Audience identifier
   */
  audience?: string;
}

export interface UserClaims extends JWTPayload {
  /**
   * User ID
   */
  sub: string;

  /**
   * User email
   */
  email: string;

  /**
   * User roles
   */
  roles: string[];

  /**
   * User permissions
   */
  permissions: string[];

  /**
   * Profile ID
   */
  profileId?: string;
}

export interface AuthToken {
  /**
   * Access token (short-lived)
   */
  accessToken: string;

  /**
   * Refresh token (long-lived)
   */
  refreshToken?: string;

  /**
   * Token type (typically "Bearer")
   */
  tokenType: string;

  /**
   * Expiration timestamp (Unix seconds)
   */
  expiresIn: number;
}

/**
 * JWT authentication service
 */
export class JWTAuth {
  private config: AuthConfig;
  private secret: Uint8Array; // allow-secret

  constructor(config: AuthConfig) {
    if (!config.secret || config.secret.length < 32) {
      throw new Error("JWT secret must be at least 32 characters long");
    }

    this.config = {
      expiresIn: 3600, // 1 hour
      refreshExpiresIn: 604800, // 7 days
      issuer: "in-midst-my-life-api",
      ...config
    };

    // Convert string secret to Uint8Array for jose
    this.secret = new TextEncoder().encode(this.config.secret); // allow-secret
  }

  /**
   * Generate JWT tokens for a user
   */
  async generateTokens(claims: UserClaims): Promise<AuthToken> {
    const now = Math.floor(Date.now() / 1000);
    const accessExpiresAt = now + (this.config.expiresIn || 3600);
    const refreshExpiresAt = now + (this.config.refreshExpiresIn || 604800);

    // Create access token
    const accessToken = await new jose.SignJWT({
      ...claims,
      type: "access"
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setIssuer(this.config.issuer || "in-midst-my-life-api")
      .setAudience(this.config.audience || "in-midst-my-life-api")
      .setExpirationTime(accessExpiresAt)
      .sign(this.secret);

    // Create refresh token
    const refreshToken = await new jose.SignJWT({
      sub: claims.sub,
      type: "refresh"
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setIssuer(this.config.issuer || "in-midst-my-life-api")
      .setExpirationTime(refreshExpiresAt)
      .sign(this.secret);

    return {
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      expiresIn: this.config.expiresIn || 3600
    };
  }

  /**
   * Verify a JWT token
   */
  async verifyToken(token: string): Promise<UserClaims | null> { // allow-secret
    try {
      const verified = await jose.jwtVerify(token, this.secret, {
        issuer: this.config.issuer || "in-midst-my-life-api",
        audience: this.config.audience || "in-midst-my-life-api"
      });

      return verified.payload as UserClaims;
    } catch (error) {
      console.warn("Token verification failed", error);
      return null;
    }
  }

  /**
   * Refresh an access token using a refresh token
   */
  async refreshAccessToken(refreshToken: string, claims: UserClaims): Promise<AuthToken | null> {
    const verified = await this.verifyToken(refreshToken);

    if (!verified || verified.type !== "refresh") {
      return null;
    }

    // Generate new access token with updated claims
    return this.generateTokens(claims);
  }

  /**
   * Decode token without verification (use with caution)
   */
  decodeToken(token: string): UserClaims | null { // allow-secret
    try {
      const decoded = jose.decodeJwt(token);
      return decoded as UserClaims;
    } catch {
      return null;
    }
  }

  /**
   * Check if a token is expired
   */
  isTokenExpired(token: string): boolean { // allow-secret
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) return true;

    const now = Math.floor(Date.now() / 1000);
    return decoded.exp <= now;
  }

  /**
   * Extract token from Authorization header
   */
  static extractToken(authHeader?: string): string | null {
    if (!authHeader) return null;

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
      return null;
    }

    return parts[1];
  }
}

/**
 * User roles for authorization
 */
export enum UserRole {
  /**
   * Admin with full system access
   */
  ADMIN = "admin",

  /**
   * User who owns/manages a profile
   */
  OWNER = "owner",

  /**
   * Verified user with profile access
   */
  USER = "user",

  /**
   * Public visitor with read-only access
   */
  GUEST = "guest"
}

/**
 * User permissions
 */
export enum Permission {
  // Profile permissions
  READ_PROFILE = "read:profile",
  WRITE_PROFILE = "write:profile",
  DELETE_PROFILE = "delete:profile",

  // Mask permissions
  READ_MASK = "read:mask",
  WRITE_MASK = "write:mask",
  DELETE_MASK = "delete:mask",

  // Timeline permissions
  READ_TIMELINE = "read:timeline",
  WRITE_TIMELINE = "write:timeline",

  // Narrative permissions
  READ_NARRATIVE = "read:narrative",
  WRITE_NARRATIVE = "write:narrative",
  APPROVE_NARRATIVE = "approve:narrative",

  // Admin permissions
  ADMIN_ACCESS = "admin:access"
}

/**
 * Role-based permission mapping
 */
export const RolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    Permission.READ_PROFILE,
    Permission.WRITE_PROFILE,
    Permission.DELETE_PROFILE,
    Permission.READ_MASK,
    Permission.WRITE_MASK,
    Permission.DELETE_MASK,
    Permission.READ_TIMELINE,
    Permission.WRITE_TIMELINE,
    Permission.READ_NARRATIVE,
    Permission.WRITE_NARRATIVE,
    Permission.APPROVE_NARRATIVE,
    Permission.ADMIN_ACCESS
  ],
  [UserRole.OWNER]: [
    Permission.READ_PROFILE,
    Permission.WRITE_PROFILE,
    Permission.READ_MASK,
    Permission.WRITE_MASK,
    Permission.READ_TIMELINE,
    Permission.WRITE_TIMELINE,
    Permission.READ_NARRATIVE,
    Permission.WRITE_NARRATIVE,
    Permission.APPROVE_NARRATIVE
  ],
  [UserRole.USER]: [
    Permission.READ_PROFILE,
    Permission.WRITE_PROFILE,
    Permission.READ_MASK,
    Permission.READ_TIMELINE,
    Permission.READ_NARRATIVE,
    Permission.WRITE_NARRATIVE
  ],
  [UserRole.GUEST]: [Permission.READ_PROFILE, Permission.READ_MASK, Permission.READ_TIMELINE]
};

/**
 * Check if a user has a specific permission
 */
export function hasPermission(claims: UserClaims, permission: Permission): boolean {
  if (!claims.permissions) return false;
  return claims.permissions.includes(permission);
}

/**
 * Get permissions for a user role
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return RolePermissions[role] || [];
}
