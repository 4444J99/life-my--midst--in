/**
 * API Versioning Middleware
 *
 * Implements the hybrid URL + header versioning strategy per ADR-017.
 *
 * Version detection priority:
 * 1. URL path (`/v1/`) — highest priority
 * 2. `Accept-Version` header
 * 3. Default to latest stable version
 *
 * Response headers:
 * - X-API-Version: Current version number
 * - Deprecation: RFC 8594 deprecation date (if applicable)
 * - Sunset: RFC 8594 sunset date (if applicable)
 * - Link: Successor version URL (if applicable)
 *
 * @see DECISION-LOG.md ADR-017 for full versioning strategy
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

/**
 * API version configuration
 */
export interface APIVersionConfig {
  /** Major version number (e.g., 1) */
  version: number;
  /** Version status */
  status: "current" | "deprecated" | "sunset";
  /** Deprecation date (ISO 8601) for deprecated versions */
  deprecationDate?: string;
  /** Sunset date (ISO 8601) for versions being removed */
  sunsetDate?: string;
  /** URL for successor version */
  successorUrl?: string;
}

/**
 * Version registry - tracks all supported API versions
 */
export const VERSION_REGISTRY: Record<number, APIVersionConfig> = {
  1: {
    version: 1,
    status: "current",
    // No deprecation yet - v1 is the current stable version
  },
  // Future versions will be added here:
  // 2: {
  //   version: 2,
  //   status: "current",
  // },
};

/**
 * Current stable version (used as default)
 */
export const CURRENT_VERSION = 1;

/**
 * Extract API version from request URL path
 *
 * @param url Request URL
 * @returns Version number or null if not found
 */
export function extractVersionFromUrl(url: string): number | null {
  const match = url.match(/^\/v(\d+)\//);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Extract API version from Accept-Version header
 *
 * Supports formats:
 * - "1" (major version only)
 * - "1.2" (major.minor)
 * - "v1" (prefixed)
 *
 * @param header Accept-Version header value
 * @returns Version number or null if invalid
 */
export function extractVersionFromHeader(
  header: string | undefined
): number | null {
  if (!header) return null;

  // Remove 'v' prefix if present
  const cleaned = header.toLowerCase().replace(/^v/, "");

  // Parse major version (ignore minor)
  const majorMatch = cleaned.match(/^(\d+)/);
  if (majorMatch) {
    return parseInt(majorMatch[1], 10);
  }

  return null;
}

/**
 * Resolve the API version for a request
 *
 * Priority:
 * 1. URL path version
 * 2. Accept-Version header
 * 3. Default to current version
 *
 * @param request Fastify request
 * @returns Resolved version number
 */
export function resolveVersion(request: FastifyRequest): number {
  // 1. Check URL path
  const urlVersion = extractVersionFromUrl(request.url);
  if (urlVersion !== null && VERSION_REGISTRY[urlVersion]) {
    return urlVersion;
  }

  // 2. Check Accept-Version header
  const headerVersion = extractVersionFromHeader(
    request.headers["accept-version"] as string
  );
  if (headerVersion !== null && VERSION_REGISTRY[headerVersion]) {
    return headerVersion;
  }

  // 3. Default to current version
  return CURRENT_VERSION;
}

/**
 * Version context attached to requests
 */
export interface VersionContext {
  /** Resolved major version number */
  major: number;
  /** Minor version from header (default 0) */
  minor: number;
  /** Version configuration */
  config: APIVersionConfig;
  /** Whether version was specified explicitly */
  explicit: boolean;
  /** Source of version (url, header, default) */
  source: "url" | "header" | "default";
}

// Extend FastifyRequest to include version context
declare module "fastify" {
  interface FastifyRequest {
    apiVersion?: VersionContext;
  }
}

/**
 * Add version headers to response
 *
 * @param reply Fastify reply
 * @param config Version configuration
 */
function addVersionHeaders(reply: FastifyReply, config: APIVersionConfig): void {
  // Always add X-API-Version
  reply.header("X-API-Version", config.version.toString());

  // Add deprecation headers if applicable
  if (config.status === "deprecated" && config.deprecationDate) {
    // RFC 8594 Deprecation header format
    const deprecationDate = new Date(config.deprecationDate);
    reply.header("Deprecation", deprecationDate.toUTCString());
  }

  // Add sunset headers if applicable
  if (
    (config.status === "deprecated" || config.status === "sunset") &&
    config.sunsetDate
  ) {
    // RFC 8594 Sunset header format
    const sunsetDate = new Date(config.sunsetDate);
    reply.header("Sunset", sunsetDate.toUTCString());
  }

  // Add Link header for successor version
  if (config.successorUrl) {
    reply.header(
      "Link",
      `<${config.successorUrl}>; rel="successor-version"`
    );
  }
}

/**
 * Register versioning middleware on Fastify instance
 *
 * This middleware:
 * 1. Extracts API version from URL or header
 * 2. Attaches version context to request
 * 3. Adds version headers to response
 *
 * @param fastify Fastify instance
 */
export async function registerVersioningMiddleware(
  fastify: FastifyInstance
): Promise<void> {
  fastify.addHook("onRequest", async (request, reply) => {
    // Extract version from URL
    const urlVersion = extractVersionFromUrl(request.url);

    // Extract version from header
    const headerVersion = extractVersionFromHeader(
      request.headers["accept-version"] as string
    );

    // Extract minor version from header (e.g., "1.2" → 2)
    const minorVersion = (() => {
      const header = request.headers["accept-version"] as string;
      if (!header) return 0;
      const match = header.match(/^\d+\.(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    })();

    // Determine source and version
    let version: number;
    let source: "url" | "header" | "default";
    let explicit: boolean;

    if (urlVersion !== null && VERSION_REGISTRY[urlVersion]) {
      version = urlVersion;
      source = "url";
      explicit = true;
    } else if (headerVersion !== null && VERSION_REGISTRY[headerVersion]) {
      version = headerVersion;
      source = "header";
      explicit = true;
    } else {
      version = CURRENT_VERSION;
      source = "default";
      explicit = false;
    }

    const config = VERSION_REGISTRY[version];

    // Attach version context to request
    request.apiVersion = {
      major: version,
      minor: minorVersion,
      config,
      explicit,
      source,
    };

    // Add version headers to response
    addVersionHeaders(reply, config);
  });
}

/**
 * Create a version-specific route prefix
 *
 * @param version Major version number
 * @returns Route prefix string (e.g., "/v1")
 */
export function versionPrefix(version: number = CURRENT_VERSION): string {
  return `/v${version}`;
}

/**
 * Check if a version is deprecated
 *
 * @param version Version number
 * @returns True if version is deprecated or sunset
 */
export function isVersionDeprecated(version: number): boolean {
  const config = VERSION_REGISTRY[version];
  return config?.status === "deprecated" || config?.status === "sunset";
}

/**
 * Check if a version is still supported
 *
 * @param version Version number
 * @returns True if version exists and is not past sunset
 */
export function isVersionSupported(version: number): boolean {
  const config = VERSION_REGISTRY[version];
  if (!config) return false;

  // Check if past sunset date
  if (config.sunsetDate && new Date(config.sunsetDate) < new Date()) {
    return false;
  }

  return true;
}
