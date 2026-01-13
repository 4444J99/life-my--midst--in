import { z } from "zod";

/**
 * Schema for a single scaena (theatrical stage).
 *
 * Scaenae (plural of scaena) represent different contextual stages or venues where
 * different masks are appropriate. They answer the question: "In what context/venue
 * does this persona operate?"
 *
 * From the covenant, the standard scaenae are:
 * - **Academica**: Educational, scholarly, research contexts (universities, labs)
 * - **Technica**: Technical, engineering, architectural contexts (tech companies, open source)
 * - **Artistica**: Creative, artistic, expressive contexts (design, music, visual arts)
 * - **Civica**: Civic, organizational, governance contexts (non-profits, government, institutions)
 * - **Domestica**: Personal, family, intimate contexts (home, close relationships)
 * - **Occulta**: Hidden, private, internal contexts (personal reflection, therapy, journaling)
 *
 * These are not exclusive—personas can operate across multiple scaenae, and scaenae
 * can share personas. The taxonomy simply maps where each mask is visible.
 *
 * Properties:
 * - `id`: Unique identifier for this scaena
 * - `name`: Display name (e.g., "Academica", "Technica")
 * - `latin_name`: Latin designation
 * - `description`: What this stage/context represents
 * - `audience`: Who the audience typically is on this stage
 * - `formality_level`: How formal (casual, professional, formal, ritualistic)
 * - `visibility`: How public/private this stage is
 * - `typical_activities`: What typically happens on this stage
 * - `tone_expectations`: What tone/register is expected
 *
 * @example
 * const technica = ScaenaSchema.parse({
 *   id: "scaena-technica-001",
 *   name: "Technica",
 *   latin_name: "Technica",
 *   description: "Technical and engineering contexts",
 *   audience: "Engineers, architects, technical leaders",
 *   formality_level: "professional",
 *   visibility: "semi-public",
 *   typical_activities: ["Code review", "Architecture discussion", "System design"],
 *   tone_expectations: "Precise, technical, evidence-driven"
 * });
 */
export const ScaenaSchema = z.object({
  id: z.string().describe("Unique identifier for this scaena"),
  name: z.string().describe("Display name of this stage"),
  latin_name: z.string().describe("Latin designation (e.g., Technica, Academica)"),
  description: z.string().describe("What this stage/context represents"),
  audience: z.string().describe("Who the audience typically is on this stage"),
  formality_level: z.enum(["casual", "professional", "formal", "ritualistic"])
    .describe("How formal this context is"),
  visibility: z.enum(["private", "semi-private", "semi-public", "public"])
    .describe("How public or private this stage is"),
  typical_activities: z.array(z.string()).optional()
    .describe("What typically happens on this stage"),
  tone_expectations: z.string().optional()
    .describe("What tone/register is expected on this stage"),
  metadata: z.object({
    canonical: z.boolean().optional().describe("Whether this is a canonical/standard scaena"),
    color_theme: z.string().optional().describe("Visual color association"),
    icon: z.string().optional().describe("Icon or visual representation")
  }).optional()
});

/**
 * Type representation of a single theatrical stage.
 */
export type Scaena = z.infer<typeof ScaenaSchema>;

/**
 * Enumeration of the canonical scaenae (theatrical stages).
 *
 * These are the standard contextual venues from the covenant:
 * - **Academica**: Educational and scholarly contexts
 * - **Technica**: Technical and engineering contexts
 * - **Artistica**: Creative and artistic contexts
 * - **Civica**: Civic, organizational, and institutional contexts
 * - **Domestica**: Personal, family, and intimate contexts
 * - **Occulta**: Hidden, private, and internal contexts
 *
 * Custom scaenae can be defined, but these are the canonical ones.
 */
export const CanonicalScaenaType = z.enum([
  "Academica",
  "Technica",
  "Artistica",
  "Civica",
  "Domestica",
  "Occulta"
]);

/**
 * Type representation of canonical scaena names.
 */
export type CanonicalScaenaType = z.infer<typeof CanonicalScaenaType>;

/**
 * Schema for the complete scaenae taxonomy.
 *
 * This is the master directory of all theatrical stages/contexts where personas
 * can operate. It provides the spatial dimension of the theatrical system.
 *
 * Properties:
 * - `id`: Unique identifier for this taxonomy
 * - `version`: Version number for the taxonomy
 * - `scaenae`: Array of all defined scaenae
 * - `canonical_scaenae`: List of canonical scaenae names
 * - `custom_scaenae`: List of user-defined custom scaenae
 * - `created_at`: When this taxonomy was created
 * - `updated_at`: When this taxonomy was last updated
 *
 * @example
 * const taxonomy = ScaenaeTaxonomySchema.parse({
 *   id: "taxonomy-scaenae-001",
 *   version: 1,
 *   scaenae: [
 *     {
 *       id: "scaena-technica-001",
 *       name: "Technica",
 *       latin_name: "Technica",
 *       description: "Technical and engineering contexts",
 *       audience: "Engineers and technical leaders",
 *       formality_level: "professional",
 *       visibility: "semi-public"
 *     }
 *   ],
 *   canonical_scaenae: ["Academica", "Technica", "Artistica", "Civica", "Domestica", "Occulta"],
 *   custom_scaenae: [],
 *   created_at: "2024-01-01T00:00:00Z",
 *   updated_at: "2024-12-31T23:59:59Z"
 * });
 */
export const ScaenaeTaxonomySchema = z.object({
  id: z.string().describe("Unique identifier for this taxonomy"),
  version: z.number().int().min(1).describe("Version number of the taxonomy"),
  scaenae: z.array(ScaenaSchema).describe("All defined scaenae"),
  canonical_scaenae: z.array(CanonicalScaenaType).describe("Canonical scaena names"),
  custom_scaenae: z.array(z.string()).optional().describe("User-defined custom scaenae"),
  created_at: z.string().datetime().describe("When this taxonomy was created"),
  updated_at: z.string().datetime().describe("When this taxonomy was last updated"),
  metadata: z.object({
    description: z.string().optional().describe("Description of this taxonomy"),
    author: z.string().optional().describe("Creator/author of this taxonomy")
  }).optional()
});

/**
 * Type representation of the complete scaenae taxonomy.
 */
export type ScaenaeTaxonomy = z.infer<typeof ScaenaeTaxonomySchema>;
