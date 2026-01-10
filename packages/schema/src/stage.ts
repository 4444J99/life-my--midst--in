import { z } from "zod";

/**
 * Schema for a career stage or milestone.
 * 
 * A Stage represents a specific phase within an Epoch. While Epochs are broad
 * functional periods (e.g., "Mastery"), Stages are more granular milestones
 * within those periods (e.g., "Led team of 5", "Achieved certification").
 * 
 * Stages are intentionally non-chronological - they represent functional development
 * steps rather than calendar dates. Multiple stages can exist simultaneously,
 * and they emphasize narrative progression over temporal ordering.
 * 
 * Properties:
 * - `id`: Unique identifier for this stage
 * - `title`: Display name (e.g., "Team Leadership")
 * - `summary`: Description of what characterizes this stage
 * - `tags`: Metadata tags for filtering and categorization
 * - `epochId`: Reference to parent Epoch (if applicable)
 * - `order`: Relative ordering within parent Epoch (lower = earlier)
 * 
 * @example
 * const stage = StageSchema.parse({
 *   id: "stage-leadership-001",
 *   title: "Team Leadership",
 *   summary: "Built and mentored engineering teams of 5-10 people",
 *   tags: ["leadership", "management", "mentoring"],
 *   epochId: "epoch-mastery-001",
 *   order: 2
 * });
 */
export const StageSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string().optional(),
  tags: z.array(z.string()).optional(),
  epochId: z.string().optional(),
  order: z.number().int().optional()
});

/**
 * Type representation of a career stage.
 * Stages are milestones or phases within the larger narrative of identity development.
 */
export type Stage = z.infer<typeof StageSchema>;
