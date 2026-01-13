import { z } from "zod";

/**
 * Schema for a single persona entry in the tabula personarum.
 *
 * The tabula personarum ("table of persons") is the rogue's gallery or index
 * that catalogs all the masks a person wears. Each entry describes one theatrical
 * persona with its full theatrical and functional metadata.
 *
 * Properties:
 * - `id`: Unique identifier for this persona
 * - `nomen`: Latin theatrical name (e.g., "Vir Architectus" = "The Architect")
 * - `everyday_name`: Common name used in everyday contexts (e.g., "The Technical Lead")
 * - `role_vector`: What this mask does and its functional purpose
 * - `tone_register`: How this mask speaks and its tonal/rhetorical register
 * - `visibility_scope`: Which scaenae (theatrical stages) this mask operates in
 * - `motto`: Latin epigraph or guiding principle
 * - `description`: Longer narrative description of this persona
 * - `active`: Whether this persona is currently active
 * - `created_at`: When this persona was defined
 * - `updated_at`: When this persona was last modified
 *
 * @example
 * const persona = TabulaPersonarumEntrySchema.parse({
 *   id: "persona-architect-001",
 *   nomen: "Vir Architectus",
 *   everyday_name: "The Technical Architect",
 *   role_vector: "Design complex systems, define technical strategy, mentor architects",
 *   tone_register: "Authoritative, structural, long-term strategic perspective",
 *   visibility_scope: ["Technica", "Civica"],
 *   motto: "Soliditas in fundamento",
 *   description: "This persona represents deep technical authority...",
 *   active: true,
 *   created_at: "2024-01-01T00:00:00Z",
 *   updated_at: "2024-01-15T10:30:00Z"
 * });
 */
export const TabulaPersonarumEntrySchema = z.object({
  id: z.string().describe("Unique identifier for this persona"),
  nomen: z.string().describe("Latin theatrical name of this persona"),
  everyday_name: z.string().describe("Common/everyday name for this persona"),
  role_vector: z.string().describe("What this mask does and enables"),
  tone_register: z.string().describe("How this mask speaks and its rhetorical register"),
  visibility_scope: z.array(z.string()).describe("Scaenae where this mask is appropriate and visible"),
  motto: z.string().optional().describe("Latin epigraph or guiding principle"),
  description: z.string().optional().describe("Longer narrative description of this persona"),
  active: z.boolean().default(true).describe("Whether this persona is currently active"),
  created_at: z.string().datetime().describe("When this persona was defined"),
  updated_at: z.string().datetime().describe("When this persona was last modified")
});

/**
 * Type representation of a single persona entry.
 * Used when working with individual personas in the mask index.
 */
export type TabulaPersonarumEntry = z.infer<typeof TabulaPersonarumEntrySchema>;

/**
 * Schema for a single resonance entry.
 *
 * Resonance tracks how well this persona aligns with external opportunities,
 * audiences, or contexts. It's used by the Inverted Interview and job matching
 * systems to determine which masks are most appropriate.
 *
 * Properties:
 * - `persona_id`: Which persona this resonance relates to
 * - `context`: What context/opportunity this resonance is measured for
 * - `fit_score`: How well this persona fits (0-100)
 * - `alignment_keywords`: Keywords that activate this persona
 * - `misalignment_keywords`: Keywords that deactivate this persona
 * - `last_used`: When this persona was last activated
 * - `success_count`: How many successful matches with this persona
 * - `feedback`: User feedback on how well this persona performs
 */
export const PersonaResonanceSchema = z.object({
  persona_id: z.string().describe("ID of the persona this resonance relates to"),
  context: z.string().describe("Context/opportunity this resonance is measured for"),
  fit_score: z.number().int().min(0).max(100).describe("Fit score (0-100)"),
  alignment_keywords: z.array(z.string()).optional().describe("Keywords that activate this persona"),
  misalignment_keywords: z.array(z.string()).optional().describe("Keywords that deactivate this persona"),
  last_used: z.string().datetime().optional().describe("When this persona was last activated"),
  success_count: z.number().int().min(0).optional().describe("Number of successful matches"),
  feedback: z.string().optional().describe("User feedback on persona performance")
});

/**
 * Type representation of persona resonance data.
 * Used for tracking and optimizing persona performance.
 */
export type PersonaResonance = z.infer<typeof PersonaResonanceSchema>;

/**
 * Schema for the complete tabula personarum (table of persons).
 *
 * This is the master directory/index of all theatrical personas a person assumes.
 * It serves as the rogue's gallery that documents the dramatis personae of
 * a complete human.
 *
 * Properties:
 * - `id`: Unique identifier (typically the profile ID)
 * - `personas`: Array of all active personas
 * - `persona_count`: Number of defined personas
 * - `current_primary`: ID of the currently primary/active persona
 * - `resonances`: Historical resonance data for optimization
 * - `created_at`: When this index was created
 * - `updated_at`: When this index was last updated
 * - `metadata`: Additional metadata about the persona index
 *
 * @example
 * const index = TabulaPersonarumSchema.parse({
 *   id: "profile-123",
 *   personas: [
 *     {
 *       id: "persona-architect-001",
 *       nomen: "Vir Architectus",
 *       everyday_name: "The Architect",
 *       role_vector: "Design systems, mentor engineers..."
 *     },
 *     {
 *       id: "persona-researcher-001",
 *       nomen: "Vir Investigationis",
 *       everyday_name: "The Researcher",
 *       role_vector: "Conduct original research, publish..."
 *     }
 *   ],
 *   persona_count: 2,
 *   current_primary: "persona-architect-001",
 *   created_at: "2024-01-01T00:00:00Z",
 *   updated_at: "2024-12-31T23:59:59Z"
 * });
 */
export const TabulaPersonarumSchema = z.object({
  id: z.string().describe("Profile ID this index belongs to"),
  personas: z.array(TabulaPersonarumEntrySchema).describe("All defined personas"),
  persona_count: z.number().int().min(0).describe("Total number of personas"),
  current_primary: z.string().optional().describe("ID of currently primary persona"),
  resonances: z.array(PersonaResonanceSchema).optional().describe("Historical resonance data"),
  created_at: z.string().datetime().describe("When this index was created"),
  updated_at: z.string().datetime().describe("When this index was last modified"),
  metadata: z.object({
    last_resonance_update: z.string().datetime().optional(),
    most_used_persona: z.string().optional(),
    total_persona_activations: z.number().int().min(0).optional()
  }).optional()
});

/**
 * Type representation of the complete tabula personarum.
 * The master directory of all theatrical personas.
 */
export type TabulaPersonarum = z.infer<typeof TabulaPersonarumSchema>;
