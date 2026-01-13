import { z } from "zod";

/**
 * Common validation schemas used across the schema package.
 */

/**
 * UUID schema - validates RFC 4122 compliant UUIDs
 */
export const UUIDSchema = z.string().uuid().describe("RFC 4122 compliant UUID");

/**
 * ISO 8601 timestamp schema
 */
export const TimestampSchema = z.string().datetime().describe("ISO 8601 datetime string");

/**
 * Slug schema - URL-friendly identifier
 */
export const SlugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).describe("URL-friendly slug");

/**
 * Email schema - basic email validation
 */
export const EmailSchema = z.string().email().describe("Valid email address");

/**
 * URL schema - validates absolute URLs
 */
export const URLSchema = z.string().url().describe("Valid absolute URL");

/**
 * Generic ID schema - can be UUID or custom ID string
 */
export const IDSchema = z.string().min(1).max(255).describe("Unique identifier");
