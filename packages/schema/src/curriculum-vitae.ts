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
 *     employer: "TechCorp",\n *     title: "Senior ML Engineer",\n *     impact: "10x faster query processing"\n *   }\n * });\n */\nexport const CVEntrySchema = z.object({\n  id: z.string().describe(\"Unique identifier for this entry\"),\n  type: z.enum([\n    \"experience\",\n    \"achievement\",\n    \"skill\",\n    \"publication\",\n    \"project\",\n    \"education\",\n    \"certification\",\n    \"language\",\n    \"volunteer\",\n    \"award\",\n    \"custom\"\n  ]).describe(\"Category of this CV entry\"),\n  content: z.string().describe(\"Core narrative/description of what was done\"),\n  personae: z.array(z.string()).optional().describe(\"Mask archetypes this entry is relevant to\"),\n  aetas: z.array(z.string()).optional().describe(\"Life-stages this entry belongs to\"),\n  scaenae: z.array(z.string()).optional().describe(\"Theatrical stages where this entry is visible\"),\n  startDate: z.string().datetime().optional().describe(\"When this entry began\"),\n  endDate: z.string().datetime().optional().describe(\"When this entry ended\"),\n  priority: z.number().int().min(0).max(100).optional().describe(\"Weighting for prominence (0-100)\"),\n  tags: z.array(z.string()).optional().describe(\"Arbitrary metadata tags for filtering\"),\n  metadata: z.record(z.unknown()).optional().describe(\"Additional context (employer, title, impact, etc.)\")\n});\n\n/**\n * Type representation of a single CV entry.\n * Used throughout the application when working with individual CV entries.\n */\nexport type CVEntry = z.infer<typeof CVEntrySchema>;\n\n/**\n * Schema for the complete curriculum vitae multiplex.\n * \n * The CV Multiplex is the single source of truth—one master document that contains\n * all life experiences, tagged with multiple dimensions (personae, aetas, scaenae).\n * \n * Masks filter and weight entries from this master document to create context-specific\n * presentations. All filtered views are honest subsets of the same source.\n * \n * Properties:\n * - `id`: Unique identifier for this CV (typically the profile ID)\n * - `version`: Version number for tracking changes\n * - `entries`: Array of all CV entries, each tagged with multiple dimensions\n * - `metadata`: Global CV metadata (language, format preferences, etc.)\n * - `createdAt`: When this CV was created\n * - `updatedAt`: When this CV was last updated\n * \n * @example\n * const cv = CurriculumVitaeMultiplexSchema.parse({\n *   id: \"profile-123\",\n *   version: 1,\n *   entries: [\n *     {\n *       id: \"entry-001\",\n *       type: \"experience\",\n *       content: \"Lead engineering team...\",\n *       personae: [\"architect\", \"executor\"],\n *       aetas: [\"Mastery\"]\n *     },\n *     {\n *       id: \"entry-002\",\n *       type: \"achievement\",\n *       content: \"Published research on distributed systems...\",\n *       personae: [\"analyst\", \"interpreter\"],\n *       aetas: [\"Mastery\", \"Transmission\"]\n *     }\n *   ],\n *   createdAt: \"2024-01-01T00:00:00Z\",\n *   updatedAt: \"2024-12-31T23:59:59Z\"\n * });\n */\nexport const CurriculumVitaeMultiplexSchema = z.object({\n  id: z.string().describe(\"Profile ID this CV belongs to\"),\n  version: z.number().int().min(1).describe(\"Version number for tracking changes\"),\n  entries: z.array(CVEntrySchema).describe(\"All entries in the master CV\"),\n  metadata: z.object({\n    primaryLanguage: z.string().optional().describe(\"Primary language (e.g., 'en-US')\"),\n    formatPreferences: z.object({\n      dateFormat: z.string().optional().describe(\"How to format dates\"),\n      verbosity: z.enum([\"concise\", \"balanced\", \"detailed\"]).optional()\n    }).optional(),\n    lastModifiedBy: z.string().optional().describe(\"ID of user who last modified\")\n  }).optional(),\n  createdAt: z.string().datetime().describe(\"When this CV was created\"),\n  updatedAt: z.string().datetime().describe(\"When this CV was last modified\")\n});\n\n/**\n * Type representation of the complete curriculum vitae multiplex.\n * The master document containing all entries.\n */\nexport type CurriculumVitaeMultiplex = z.infer<typeof CurriculumVitaeMultiplexSchema>;\n\n/**\n * Helper schema for filtering CV entries by tags.\n * Used to determine which entries should appear in a given mask's presentation.\n */\nexport const CVFilterSchema = z.object({\n  includePersonae: z.array(z.string()).optional().describe(\"Only show entries tagged with these personae\"),\n  excludePersonae: z.array(z.string()).optional().describe(\"Hide entries tagged with these personae\"),\n  includeAetas: z.array(z.string()).optional().describe(\"Only show entries from these life-stages\"),\n  excludeAetas: z.array(z.string()).optional().describe(\"Hide entries from these life-stages\"),\n  includeScaenae: z.array(z.string()).optional().describe(\"Only show entries visible in these theatrical stages\"),\n  excludeScaenae: z.array(z.string()).optional().describe(\"Hide entries from these theatrical stages\"),\n  minPriority: z.number().int().min(0).max(100).optional().describe(\"Only show entries with priority >= this\"),\n  includeTags: z.array(z.string()).optional().describe(\"Only show entries with these tags\"),\n  excludeTags: z.array(z.string()).optional().describe(\"Hide entries with these tags\")\n});\n\n/**\n * Type representation of a CV filter.\n * Used when querying/filtering entries from the multiplex.\n */\nexport type CVFilter = z.infer<typeof CVFilterSchema>;\n"