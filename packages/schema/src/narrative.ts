import { z } from "zod";

/**
 * Schema for a single narrative block element.
 * 
 * Narrative blocks are atomic units of generated content used to compose
 * résumés, cover letters, biographies, and other text outputs. The narrative
 * engine takes profile data and transforms it into these blocks through
 * mask-based filtering and contextual weighting.
 * 
 * **Theatrical Extensions**:
 * Each block can include self-aware theatrical commentary that acknowledges
 * the performance nature of the narrative. This makes explicit what's implicit:
 * all presentation is a curated selection from a larger whole.
 * 
 * Properties:
 * - `title`: Block title/heading
 * - `body`: Markdown content body
 * - `tags`: Metadata tags for categorization and filtering
 * - `theatrical_metadata`: Optional theatrical framing and self-awareness
 *   - `mask_name`: Which persona this block is optimized for
 *   - `scaena`: Which theatrical stage this block is visible on
 *   - `aetas`: Which life-stage this belongs to
 *   - `performance_note`: Meta-theatrical commentary acknowledging curation
 *   - `authentic_caveat`: Transparency about what's emphasized/de-emphasized
 * - `weight`: Relative importance (0-100) for this block in mask context\n * - `priority`: Display priority (higher appears first)\n * \n * @example
n * const block = NarrativeBlockSchema.parse({
 *   title: \"Senior Systems Architect\",
 *   body: \"Led design of distributed systems serving 10M+ users...\",
 *   tags: [\"leadership\", \"architecture\", \"systems\"],
 *   theatrical_metadata: {
 *     mask_name: \"architect\",
 *     scaena: \"Technica\",
 *     aetas: \"Mastery\",
 *     performance_note: \"This role emphasizes architectural leadership\",
 *     authentic_caveat: \"All roles involved significant mentoring; this highlights the structural aspect\"
 *   },
 *   weight: 85,
 *   priority: 1
 * });
 */
export const NarrativeBlockSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  tags: z.array(z.string()).optional(),
  theatrical_metadata: z.object({
    mask_name: z.string().optional().describe("Which persona/mask this block is optimized for"),
    scaena: z.string().optional().describe("Which theatrical stage this is visible on"),
    aetas: z.string().optional().describe("Which life-stage this block belongs to"),
    performance_note: z.string().optional().describe("Meta-theatrical commentary acknowledging curation"),
    authentic_caveat: z.string().optional().describe("Transparency about what's emphasized vs. de-emphasized")
  }).optional().describe("Theatrical self-awareness metadata"),
  templateId: z.string().optional().describe("Template identifier for narrative sequencing (e.g., 'identity-mode', 'stage-arc', 'sequence')"),
  weight: z.number().int().min(0).max(100).optional().describe("Relative importance in mask context (0-100)"),
  priority: z.number().int().min(0).optional().describe("Display priority (higher = appears first)")
});

/**
 * Type representation of a single narrative block.
 */
export type NarrativeBlock = z.infer<typeof NarrativeBlockSchema>;

/**
 * Enumeration of narrative generation status.
 * Tracks the approval/review state of generated narratives.
 * 
 * - `draft`: Initially generated, not yet reviewed
 * - `approved`: Reviewed and accepted by the user
 * - `rejected`: Reviewed and rejected, needs regeneration
 * 
 * @example
 * const status = NarrativeStatusSchema.parse("approved"); // ✓
 */
export const NarrativeStatusSchema = z.enum(["draft", "approved", "rejected"]);

/**
 * Type representation of narrative approval status.
 */
export type NarrativeStatus = z.infer<typeof NarrativeStatusSchema>;

/**
 * Schema for a complete narrative snapshot.
 * 
 * A Narrative Snapshot represents a generated narrative for a profile,
 * potentially filtered through a specific mask. It's a point-in-time
 * snapshot of what the narrative engine produced, with approval tracking.
 * 
 * **Theatrical Framing**:
 * Each snapshot can include explicit theatrical framing that makes clear:
 * - This is a curated presentation (one view of many possible views)
 * - What mask/persona is being presented
 * - What stage/context this is appropriate for
 * - What was emphasized and what was de-emphasized
 * 
 * Properties:
 * - `id`: UUID identifying this snapshot
 * - `profileId`: UUID linking to the Profile
 * - `maskId`: Optional UUID of the Mask used to generate this
 * - `mask_name`: Human name of the mask for theatrical clarity
 * - `scaena`: Which theatrical stage this narrative is for
 * - `aetas`: Which life-stage(s) this emphasizes
 * - `status`: Approval status (draft/approved/rejected)
 * - `blocks`: Array of narrative blocks
 * - `theatrical_preamble`: Explicit statement about what's being presented
 * - `authentic_disclaimer`: Transparency about curation and selection
 * - `meta`: Additional metadata from generation process
 * - `createdAt`: ISO 8601 timestamp of generation
 * - `updatedAt`: ISO 8601 timestamp of last update
 * - `approvedAt`: ISO 8601 timestamp of approval (if approved)
 * - `approvedBy`: UUID/identifier of approver
 * - `revisionNote`: Human notes on why it was rejected
 * 
 * @example
 * const snapshot = NarrativeSnapshotSchema.parse({
 *   id: "750e8400-e29b-41d4-a716-446655440002",
 *   profileId: "550e8400-e29b-41d4-a716-446655440000",
 *   maskId: "mask-architect-001",
 *   mask_name: "The Technical Architect\",
 *   scaena: "Technica",
 *   aetas: ["Mastery\", \"Integration"],
 *   status: "approved",
 *   blocks: [
 *     { title: "Background", body: "...", tags: ["education"] }
 *   ],
 *   theatrical_preamble: "The following narrative presents me in the role of Technical Architect—focused on systems design and long-term strategy.",
 *   authentic_disclaimer: "This view emphasizes architectural thinking; it de-emphasizes mentoring and team-building which are equally important.\",
 *   createdAt: new Date().toISOString(),
 *   updatedAt: new Date().toISOString(),
 *   approvedAt: new Date().toISOString(),
 *   approvedBy: "user-123"
 * });
 */
export const NarrativeSnapshotSchema = z.object({
  id: z.string().uuid(),
  profileId: z.string().uuid(),
  maskId: z.string().optional(),
  mask_name: z.string().optional().describe("Human name of the mask for theatrical clarity"),
  scaena: z.string().optional().describe("Which theatrical stage this narrative is for"),
  aetas: z.array(z.string()).optional().describe("Which life-stages this emphasizes"),
  status: NarrativeStatusSchema,
  blocks: z.array(NarrativeBlockSchema),
  theatrical_preamble: z.string().optional().describe("Explicit statement about what's being presented"),
  authentic_disclaimer: z.string().optional().describe("Transparency about curation and selection"),
  meta: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  approvedAt: z.string().datetime().optional(),
  approvedBy: z.string().optional(),
  revisionNote: z.string().optional()
});

/**
 * Type representation of a complete narrative snapshot.
 * Generated narratives that can be approved or rejected by the user.
 */
export type NarrativeSnapshot = z.infer<typeof NarrativeSnapshotSchema>;
