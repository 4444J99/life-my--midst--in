import { z } from "zod";

/**
 * Schema for an identity mask - a contextual presentation of self.
 * 
 * Masks are the core innovation of this system. Rather than maintaining separate CVs,
 * a single source-of-truth profile is filtered/transformed through masks to create
 * context-specific presentations. Each mask represents a different facet of identity
 * optimized for different audiences.
 * 
 * Properties:
 * - `id`: Unique identifier for this mask
 * - `name`: Human-readable name (e.g., "Technical Lead", "Academic Researcher")
 * - `ontology`: The conceptual framework this mask operates within (e.g., "professional", "academic")
 * - `functional_scope`: What professional/personal domains this mask covers
 * - `stylistic_parameters`: How to present content (tone, rhetoric, detail level)
 *   - `tone`: Desired tone/voice (e.g., "authoritative", "collaborative", "exploratory")
 *   - `rhetorical_mode`: Style of argumentation (e.g., "technical", "narrative", "analytical")
 *   - `compression_ratio`: How compressed content should be (0=verbose, 1=minimal)
 * - `activation_rules`: When this mask should be suggested
 *   - `contexts`: Tags/audience types that activate this mask
 *   - `triggers`: Keywords or patterns that activate this mask
 * - `filters`: What profile data to include/exclude
 *   - `include_tags`: Only show items tagged with these (empty = all)
 *   - `exclude_tags`: Never show items tagged with these
 *   - `priority_weights`: Relative importance of different entities
 * - `redaction`: Privacy controls (optional)
 *   - `private_tags`: Tags that should be hidden in this mask
 *   - `excluded_entities`: Specific item IDs to completely remove
 *   - `obfuscate_dates`: Show only years, not exact dates
 * 
 * @example
 * const academicMask = MaskSchema.parse({
 *   id: "mask-academic-001",
 *   name: "Academic Researcher",
 *   nomen: "Vir Investigationis",  // Latin: "Person of Investigation"
 *   role_vector: "Original research, publication, knowledge advancement in specialized domain",
 *   tone_register: "Scholarly, precise, evidence-driven, peer-focused",
 *   visibility_scope: ["Academica", "Technica"],  // visible on academic and technical stages
 *   motto: "Veritas est lux mea",  // Latin: "Truth is my light"
 *   ontology: "academic",
 *   functional_scope: "research, publications, teaching",
 *   stylistic_parameters: {
 *     tone: "scholarly",
 *     rhetorical_mode: "analytical",
 *     compression_ratio: 0.7
 *   },
 *   activation_rules: {
 *     contexts: ["academic", "research", "university"],
 *     triggers: ["PhD", "publication", "tenure"]
 *   },
 *   filters: {
 *     include_tags: ["academic", "research", "teaching"],
 *     exclude_tags: ["commercial", "product"],
 *     priority_weights: { "publications": 2, "talks": 1.5 }
 *   },
 *   redaction: {
 *     obfuscate_dates: false
 *   }
 * });
 */
export const MaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  // Theatrical metadata (explicit self-awareness of performance)
  nomen: z.string().describe("Latin name of this theatrical persona"),
  role_vector: z.string().describe("Functional vector: what this mask does and enables"),
  tone_register: z.string().describe("Tonal register: how this mask speaks and presents"),
  visibility_scope: z.array(z.string()).describe("Scaenae (theatrical stages) where this mask is visible and appropriate"),
  motto: z.string().optional().describe("Latin epigraph or guiding principle for this persona"),
  
  // Existing functional parameters
  ontology: z.string(),
  functional_scope: z.string(),
  stylistic_parameters: z.object({
    tone: z.string(),
    rhetorical_mode: z.string(),
    compression_ratio: z.number().min(0).max(1)
  }),
  activation_rules: z.object({
    contexts: z.array(z.string()),
    triggers: z.array(z.string())
  }),
  filters: z.object({
    include_tags: z.array(z.string()),
    exclude_tags: z.array(z.string()),
    priority_weights: z.record(z.number())
  }),
  redaction: z.object({
    private_tags: z.array(z.string()).optional(),
    excluded_entities: z.array(z.string()).optional(),
    obfuscate_dates: z.boolean().optional()
  }).optional()
});

/**
 * Type representation of a mask object.
 * Used to type variables holding mask data throughout the application.
 */
export type Mask = z.infer<typeof MaskSchema>;

/**
 * Enumeration of the 15 standard mask archetypes.
 * 
 * These masks represent different cognitive, expressive, and operational modes
 * that can be applied to present identity. They are functional (not branded)
 * and can be composed to create nuanced presentations.
 * 
 * **Cognitive Masks** (How you think and analyze):
 * - `analyst`: Data-driven, evidence-based perspective
 * - `synthesist`: Pattern-finding, connective perspective
 * - `observer`: Witnessing, descriptive perspective
 * - `strategist`: Long-term, goal-oriented perspective
 * - `speculator`: Exploratory, hypothetical perspective
 * - `interpreter`: Meaning-making, contextual perspective
 * 
 * **Expressive Masks** (How you create and communicate):
 * - `artisan`: Craft-focused, quality-obsessed perspective
 * - `architect`: Design-focused, structural perspective
 * - `narrator`: Story-telling, narrative perspective
 * - `provoker`: Challenging, provocative perspective
 * - `mediator`: Bridging, reconciliatory perspective
 * 
 * **Operational Masks** (How you execute and maintain):
 * - `executor`: Action-oriented, implementation perspective
 * - `steward`: Care-taking, preservation perspective
 * - `integrator`: Systems-connecting, holistic perspective
 * - `custodian`: Guarding, protective perspective
 * - `calibrator`: Balancing, optimization perspective
 * 
 * @example
 * const maskType = MaskType.parse("analyst"); // ✓
 * const masks: MaskType[] = ["analyst", "architect"];
 */
export const MaskType = z.enum([
  "analyst",
  "synthesist",
  "observer",
  "strategist",
  "speculator",
  "interpreter",
  "artisan",
  "architect",
  "narrator",
  "provoker",
  "mediator",
  "executor",
  "steward",
  "integrator",
  "custodian",
  "calibrator"
]);

/**
 * Type representation of a mask archetype.
 * Use to ensure variables only hold valid mask type strings.
 */
export type MaskType = z.infer<typeof MaskType>;

