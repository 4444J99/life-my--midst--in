import { z } from "zod";
import { StageSchema } from "./stage";

/**
 * Schema for a temporal epoch - a functional period in professional identity.
 * 
 * Epochs represent broad phases of professional development, intentionally
 * non-chronological. Rather than calendar-based (Jan 2020 - Dec 2022), epochs
 * are functional narratives of growth (Initiation → Expansion → Consolidation → Mastery).
 * 
 * Epochs answer the question: "What was I becoming during this period?"
 * They provide a narrative structure for understanding identity evolution across time.
 * 
 * **Standard Epoch Sequence**:
 * 1. **Initiation**: First engagement with a domain; foundational learning
 * 2. **Expansion**: Broadening scope; exploring boundaries and possibilities
 * 3. **Consolidation**: Deepening expertise; achieving depth in chosen areas
 * 4. **Divergence**: Exploring new directions; intentional shifts
 * 5. **Mastery**: Peak competence; teaching/mentoring others
 * 6. **Reinvention**: Intentional transformation; new domain entry
 * 7. **Transmission**: Sharing knowledge; legacy building
 * 8. **Legacy**: Long-term influence; sustained impact
 * 
 * Properties:
 * - `id`: Unique identifier for this epoch
 * - `name`: Display name (e.g., "Mastery")
 * - `summary`: Description of the epoch's character and purpose
 * - `order`: Relative ordering (lower = earlier in sequence)
 * - `stages`: Array of Stages that compose this epoch (optional nesting)
 * 
 * @example
 * const epoch = EpochSchema.parse({
 *   id: "epoch-mastery-001",
 *   name: "Mastery",
 *   summary: "Peak technical expertise with mentoring and architectural influence",
 *   order: 5,
 *   stages: [
 *     {
 *       id: "stage-leadership-001",
 *       title: "Team Leadership",
 *       order: 1
 *     }
 *   ]
 * });
 */
export const EpochSchema = z.object({
  id: z.string(),
  name: z.string(),
  summary: z.string().optional(),
  order: z.number().int(),
  stages: z.array(StageSchema).optional()
});

/**
 * Type representation of a temporal epoch.
 * A narrative period in professional development, used to structure identity evolution.
 */
export type Epoch = z.infer<typeof EpochSchema>;


/**
 * Schema for aetas (life-stage) lifecycle definitions.
 * 
 * Aetas represents the functional lifecycle stages of human capability development.
 * These are non-chronological—they represent narrative progression and capability
 * accumulation rather than calendar time.
 * 
 * Standard aetas sequence:
 * 1. **Initiation**: First engagement; foundational discovery
 * 2. **Emergence**: Growing competence; expanding horizons
 * 3. **Consolidation**: Deepening expertise; achieving depth
 * 4. **Expansion**: Broadening scope; exploring new territories
 * 5. **Mastery**: Peak competence; teaching others
 * 6. **Integration**: Synthesizing diverse capabilities; wholeness
 * 7. **Transmission**: Passing knowledge; legacy building
 * 8. **Stewardship**: Long-term care; sustaining systems
 * 
 * Properties:
 * - `id`: Unique identifier for this aetas
 * - `name`: Display name (e.g., "Mastery", "Integration")
 * - `latin_name`: Latin designation (e.g., "Magistralitas")
 * - `order`: Sequence position (lower = earlier)
 * - `description`: Narrative description of this life-stage
 * - `capability_profile`: What capabilities are characteristic of this stage
 * - `typical_age_range`: Rough age range (not required)
 * - `duration_months`: Typical duration in months
 * - `transitions_to`: Which aetas typically follow this one
 * - `markers`: Key achievements or milestones that signal this aetas
 * 
 * @example
 * const masteryAetas = AetasSchema.parse({
 *   id: "aetas-mastery-001",
 *   name: "Mastery",
 *   latin_name: "Magistralitas",
 *   order: 5,
 *   description: "Peak competence with mentoring and architectural influence",
 *   capability_profile: {
 *     technical_depth: "expert-level",
 *     leadership_scope: "team-to-org",
 *     teaching_ability: "mentoring-others"
 *   },
 *   typical_age_range: { min: 35, max: 50 },
 *   duration_months: 60,
 *   transitions_to: ["aetas-integration-001"],
 *   markers: ["Mentoring others", "Architectural decisions", "Industry recognition"]
 * });
 */
export const AetasSchema = z.object({
  id: z.string().describe("Unique identifier for this aetas"),
  name: z.string().describe("Display name of this life-stage"),
  latin_name: z.string().describe("Latin designation for this aetas"),
  order: z.number().int().describe("Sequence position in lifecycle"),
  description: z.string().describe("Narrative description of this aetas"),
  capability_profile: z.record(z.string()).describe("Characteristic capabilities at this stage"),
  typical_age_range: z.object({
    min: z.number().int().optional(),
    max: z.number().int().optional()
  }).optional().describe("Rough age range (informational only)"),
  duration_months: z.number().int().optional().describe("Typical duration in months"),
  transitions_to: z.array(z.string()).optional().describe("IDs of typical next aetas"),
  markers: z.array(z.string()).optional().describe("Key milestones that signal this aetas")
});

/**
 * Type representation of a life-stage (aetas).
 * Used when working with lifecycle and capability progression.
 */
export type Aetas = z.infer<typeof AetasSchema>;
