import { z } from "zod";

/**
 * Schema for a single entry in the curriculum vitae multiplex.
 *
 * Each entry in the master CV is tagged with metadata that allows it to be
 * filtered and presented through different masks. This enables one source of truth
 * with many honest views.
 *
 * Properties:
 * - `id`: Unique identifier for this entry
 * - `type`: What kind of entry (experience, achievement, skill, publication, etc.)
 * - `content`: The core narrative/description of this entry
 * - `personae`: Which masks/personas this entry is tagged with (empty = all masks)
 * - `aetas`: Which life-stages this entry belongs to (empty = all stages)
 * - `scaenae`: Which theatrical stages this entry is visible in (empty = all stages)
 * - `startDate`: When this entry begins (optional)
 * - `endDate`: When this entry ends (optional)
 * - `priority`: Relative weighting for this entry (0-100; higher = more prominent)
 * - `tags`: Arbitrary metadata tags for additional filtering
 * - `metadata`: Additional contextual data (employer, location, etc.)
 *
 * @example
 * const entry = CVEntrySchema.parse({
 *   id: "entry-001",
 *   type: "experience",
 *   content: "Built machine learning pipeline serving 10M requests/day",
 *   personae: ["analyst", "architect", "executor"],
 *   aetas: ["Mastery", "Integration"],
 *   scaenae: ["Technica", "Civica"],
 *   startDate: "2021-01-01",
 *   endDate: "2024-12-31",
 *   priority: 85,
 *   tags: ["machine-learning", "infrastructure", "leadership"],
 *   metadata: {
 *     employer: "TechCorp",
 *     title: "Senior ML Engineer",
 *     impact: "10x faster query processing"
 *   }
 * });
 */
export const CVEntrySchema = z.object({
  id: z.string().describe("Unique identifier for this entry"),
  type: z.enum([
    "experience",
    "achievement",
    "skill",
    "publication",
    "project",
    "education",
    "certification",
    "language",
    "volunteer",
    "award",
    "custom"
  ]).describe("Category of this CV entry"),
  content: z.string().describe("Core narrative/description of what was done"),
  personae: z.array(z.string()).optional().describe("Mask archetypes this entry is relevant to"),
  aetas: z.array(z.string()).optional().describe("Life-stages this entry belongs to"),
  scaenae: z.array(z.string()).optional().describe("Theatrical stages where this entry is visible"),
  startDate: z.string().datetime().optional().describe("When this entry began"),
  endDate: z.string().datetime().optional().describe("When this entry ended"),
  priority: z.number().int().min(0).max(100).optional().describe("Weighting for prominence (0-100)"),
  tags: z.array(z.string()).optional().describe("Arbitrary metadata tags for filtering"),
  metadata: z.record(z.unknown()).optional().describe("Additional context (employer, title, impact, etc.)")
});

/**
 * Type representation of a single CV entry.
 * Used throughout the application when working with individual CV entries.
 */
export type CVEntry = z.infer<typeof CVEntrySchema>;

/**
 * Schema for the complete curriculum vitae multiplex.
 *
 * The CV Multiplex is the single source of truth—one master document that contains
 * all life experiences, tagged with multiple dimensions (personae, aetas, scaenae).
 *
 * Masks filter and weight entries from this master document to create context-specific
 * presentations. All filtered views are honest subsets of the same source.
 *
 * Properties:
 * - `id`: Unique identifier for this CV (typically the profile ID)
 * - `version`: Version number for tracking changes
 * - `entries`: Array of all CV entries, each tagged with multiple dimensions
 * - `metadata`: Global CV metadata (language, format preferences, etc.)
 * - `createdAt`: When this CV was created
 * - `updatedAt`: When this CV was last updated
 *
 * @example
 * const cv = CurriculumVitaeMultiplexSchema.parse({
 *   id: "profile-123",
 *   version: 1,
 *   entries: [
 *     {
 *       id: "entry-001",
 *       type: "experience",
 *       content: "Lead engineering team...",
 *       personae: ["architect", "executor"],
 *       aetas: ["Mastery"]
 *     },
 *     {
 *       id: "entry-002",
 *       type: "achievement",
 *       content: "Published research on distributed systems...",
 *       personae: ["analyst", "interpreter"],
 *       aetas: ["Mastery", "Transmission"]
 *     }
 *   ],
 *   createdAt: "2024-01-01T00:00:00Z",
 *   updatedAt: "2024-12-31T23:59:59Z"
 * });
 */
export const CurriculumVitaeMultiplexSchema = z.object({
  id: z.string().describe("Profile ID this CV belongs to"),
  version: z.number().int().min(1).describe("Version number for tracking changes"),
  entries: z.array(CVEntrySchema).describe("All entries in the master CV"),
  metadata: z.object({
    primaryLanguage: z.string().optional().describe("Primary language (e.g., 'en-US')"),
    formatPreferences: z.object({
      dateFormat: z.string().optional().describe("How to format dates"),
      verbosity: z.enum(["concise", "balanced", "detailed"]).optional()
    }).optional(),
    lastModifiedBy: z.string().optional().describe("ID of user who last modified")
  }).optional(),
  createdAt: z.string().datetime().describe("When this CV was created"),
  updatedAt: z.string().datetime().describe("When this CV was last modified")
});

/**
 * Type representation of the complete curriculum vitae multiplex.
 * The master document containing all entries.
 */
export type CurriculumVitaeMultiplex = z.infer<typeof CurriculumVitaeMultiplexSchema>;

/**
 * Helper schema for filtering CV entries by tags.
 * Used to determine which entries should appear in a given mask's presentation.
 */
export const CVFilterSchema = z.object({
  includePersonae: z.array(z.string()).optional().describe("Only show entries tagged with these personae"),
  excludePersonae: z.array(z.string()).optional().describe("Hide entries tagged with these personae"),
  includeAetas: z.array(z.string()).optional().describe("Only show entries from these life-stages"),
  excludeAetas: z.array(z.string()).optional().describe("Hide entries from these life-stages"),
  includeScaenae: z.array(z.string()).optional().describe("Only show entries visible in these theatrical stages"),
  excludeScaenae: z.array(z.string()).optional().describe("Hide entries from these theatrical stages"),
  minPriority: z.number().int().min(0).max(100).optional().describe("Only show entries with priority >= this"),
  includeTags: z.array(z.string()).optional().describe("Only show entries with these tags"),
  excludeTags: z.array(z.string()).optional().describe("Hide entries with these tags")
});

/**
 * Type representation of a CV filter.
 * Used when querying/filtering entries from the multiplex.
 */
export type CVFilter = z.infer<typeof CVFilterSchema>;
