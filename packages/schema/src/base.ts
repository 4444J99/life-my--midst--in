import { z } from "zod";

/**
 * Enumeration of all valid CV entity types in the system.
 * 
 * These types represent different components that can appear in a CV profile,
 * from traditional sections (experience, education) to blockchain-inspired
 * verification layers (verificationLog, verifiableCredential).
 * 
 * @example
 * const type = CvEntityTypeSchema.parse("experience"); // ✓
 * const invalid = CvEntityTypeSchema.parse("invalid"); // ✗ throws
 */
export const CvEntityTypeSchema = z.enum([
  "profile",
  "experience",
  "education",
  "project",
  "publication",
  "award",
  "certification",
  "skill",
  "socialLink",
  "customSection",
  "timelineEvent",
  "verificationLog",
  "verifiableCredential",
  "attestationLink"
]);

/**
 * Type representation of valid CV entity types.
 * Use to type variables that should only contain valid entity type strings.
 * 
 * @example
 * const entityType: CvEntityType = "experience";
 */
export type CvEntityType = z.infer<typeof CvEntityTypeSchema>;

/**
 * Schema for cryptographic integrity proofs attached to CV entities.
 * 
 * Represents a blockchain-inspired hash-and-signature mechanism for verifying
 * that a specific CV entity hasn't been tampered with. The proof includes:
 * - A hash of the entity's contents
 * - A cryptographic signature (typically using the identity's private key)
 * - The DID that issued the proof
 * - Optional JWK public key for verification
 * - ISO 8601 timestamp
 * 
 * @example
 * const proof = IntegrityProofSchema.parse({
 *   hash: "sha256:abc123...",
 *   signature: "sig_xyz...",
 *   did: "did:web:example.com:user123",
 *   timestamp: new Date().toISOString()
 * });
 */
export const IntegrityProofSchema = z.object({
  hash: z.string(),
  signature: z.string(),
  did: z.string(),
  publicKeyJwk: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime()
});

/**
 * Type representation of an integrity proof object.
 * Typically attached to CV entities that need cryptographic verification.
 */
export type IntegrityProof = z.infer<typeof IntegrityProofSchema>;
