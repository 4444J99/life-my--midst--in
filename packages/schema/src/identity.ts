import { z } from "zod";

/**
 * Core identity invariants that define the unchanging essence of a person.
 * 
 * This represents the foundational philosophical and strategic core from which
 * all masks and presentations derive. These invariants should remain consistent
 * across all identity masks and presentations.
 * 
 * Properties:
 * - `thesis`: The core statement of identity (min 10 chars, typically 1-2 sentences)
 * - `invariants`: Fundamental truths that apply across all masks
 * - `master_keywords`: Primary conceptual/professional themes
 * - `intellectual_lineage`: Thought leaders, mentors, and philosophical influences
 * - `strategic_differentiators`: What uniquely distinguishes this person from peers
 * - `tensions`: Internal contradictions that don't resolve (e.g., "analytical but creative")
 * - `constraints`: Self-imposed limitations and non-negotiables
 * 
 * @example
 * const core = IdentityCoreSchema.parse({
 *   thesis: "Systems thinker translating complex ideas into actionable insights",
 *   invariants: ["Intellectual honesty", "Systems perspective"],
 *   master_keywords: ["systems", "architecture", "narrative"],
 *   intellectual_lineage: ["E.O. Wilson", "Donella Meadows"],
 *   strategic_differentiators: ["Cross-domain synthesis"],
 *   tensions: ["analytical yet creative", "pragmatic yet idealistic"],
 *   constraints: ["No deception", "Human-centered always"]
 * });
 */
export const IdentityCoreSchema = z.object({
  thesis: z.string().min(10),
  invariants: z.array(z.string()),
  master_keywords: z.array(z.string()),
  intellectual_lineage: z.array(z.string()),
  strategic_differentiators: z.array(z.string()),
  tensions: z.array(z.string()),
  constraints: z.array(z.string())
});

/**
 * Type representation of core identity invariants.
 * Immutable across all mask presentations.
 */
export type IdentityCore = z.infer<typeof IdentityCoreSchema>;

/**
 * Enumeration of supported external identity systems.
 * These are common professional and social platforms where identity can be verified.
 * 
 * Note: "linkdin" (typo) is included for backward compatibility with legacy data.
 * New systems should prefer "linkedin".
 * 
 * @example
 * const system = ExternalIdSystemSchema.parse("github"); // ✓
 */
export const ExternalIdSystemSchema = z.enum(["linkedin", "linkdin", "github", "orcid", "twitter", "custom"]);

/**
 * Schema for a reference to a user profile on an external system.
 * 
 * Used to link the CV identity to profiles on platforms like LinkedIn, GitHub, ORCID, etc.
 * This enables verification of claimed credentials and social proof.
 * 
 * Properties:
 * - `system`: Which platform this ID references
 * - `value`: The actual username, URL, or ID on that platform
 * - `label`: Optional human-readable description (e.g., "GitHub (primary)")
 * 
 * @example
 * const extId = ExternalIdSchema.parse({
 *   system: "github",
 *   value: "https://github.com/username",
 *   label: "GitHub (primary)"
 * });
 */
export const ExternalIdSchema = z.object({
  system: ExternalIdSystemSchema,
  value: z.string(),
  label: z.string().optional()
});

/**
 * Type representation of an external identity reference.
 * Typically used in arrays to link multiple external platforms.
 */
export type ExternalId = z.infer<typeof ExternalIdSchema>;

/**
 * Schema for the root identity entity.
 * 
 * Represents a unique person's cryptographic identity in the system.
 * The Identity is distinct from a Profile - an Identity is immutable and
 * represents "who you are", while a Profile is the data about what you've done.
 * 
 * Properties:
 * - `id`: UUID uniquely identifying this identity in the system
 * - `did`: W3C Decentralized Identifier (optional, for blockchain integration)
 * - `primaryWalletAddress`: Ethereum or other blockchain wallet (optional)
 * - `ensName`: Ethereum Name Service name (optional)
 * - `emailHash`: Hashed email for privacy-preserving identification
 * - `externalIds`: Links to profiles on other platforms (LinkedIn, GitHub, etc.)
 * 
 * @example
 * const identity = IdentitySchema.parse({
 *   id: "550e8400-e29b-41d4-a716-446655440000",
 *   did: "did:web:example.com:user123",
 *   externalIds: [
 *     { system: "github", value: "https://github.com/username" },
 *     { system: "linkedin", value: "https://linkedin.com/in/username" }
 *   ]
 * });
 */
export const IdentitySchema = z.object({
  id: z.string().uuid(),
  did: z.string().optional(),
  primaryWalletAddress: z.string().optional(),
  ensName: z.string().optional(),
  emailHash: z.string().optional(),
  externalIds: z.array(ExternalIdSchema).optional()
});

/**
 * Type representation of a root identity entity.
 * Used to type variables holding identity objects in consuming code.
 */
export type Identity = z.infer<typeof IdentitySchema>;
