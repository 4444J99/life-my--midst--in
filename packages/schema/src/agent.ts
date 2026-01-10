import { z } from "zod";

/**
 * Enumeration of agent response completion statuses.
 * 
 * Tracks the outcome of an agent's work:
 * - `completed`: Task fully completed as requested
 * - `partial`: Task partially completed; some requested items done
 * - `blocked`: Task blocked by dependencies or missing information
 * - `failed`: Task failed to complete (check error logs)
 * 
 * @example
 * const status = AgentResponseStatusSchema.parse("completed"); // ✓
 */
export const AgentResponseStatusSchema = z.enum(["completed", "partial", "blocked", "failed"]);

export const AgentResponseContextSchema = z.object({
  sources: z.array(z.string()).default([]),
  assumptions: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([]),
  references: z.array(z.string()).default([])
});

export const AgentResponseStrategySchema = z.object({
  summary: z.string().min(1),
  steps: z.array(z.string()).default([])
});

export const AgentResponseArtifactSchema = z.object({
  type: z.string().min(1),
  path: z.string().optional(),
  description: z.string().optional(),
  payload: z.record(z.unknown()).optional()
});

export const AgentResponseDeliverableSchema = z.object({
  summary: z.string().min(1),
  artifacts: z.array(AgentResponseArtifactSchema).default([]),
  notes: z.array(z.string()).default([])
});

export const AgentResponseContinuitySchema = z.object({
  nextSteps: z.array(z.string()).default([]),
  openQuestions: z.array(z.string()).default([]),
  handoffNotes: z.array(z.string()).default([])
});

export const AgentResponseMetadataSchema = z.object({
  taskId: z.string().optional(),
  agentRole: z.string().optional(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  durationMs: z.number().int().positive().optional()
});

export const AgentDefinitionSchema = z.object({
  id: z.string().min(1),
  role: z.string().min(1),
  purpose: z.string().optional(),
  inputs: z.array(z.string()).default([]),
  outputs: z.array(z.string()).default([]),
  capabilities: z.array(z.string()).default([]),
  tools: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional()
});

export const AgentRegistrySchema = z.object({
  version: z.string().optional(),
  agents: z.record(AgentDefinitionSchema),
  metadata: z.record(z.unknown()).optional()
});

export const AgentResponseSchema = z.object({
  status: AgentResponseStatusSchema,
  interpretation: z.string().min(1),
  context: AgentResponseContextSchema,
  strategy: AgentResponseStrategySchema,
  deliverable: AgentResponseDeliverableSchema,
  continuity: AgentResponseContinuitySchema,
  risks: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).optional(),
  metadata: AgentResponseMetadataSchema.optional()
});

export type AgentResponseStatus = z.infer<typeof AgentResponseStatusSchema>;
export type AgentResponseContext = z.infer<typeof AgentResponseContextSchema>;
export type AgentResponseStrategy = z.infer<typeof AgentResponseStrategySchema>;
export type AgentResponseArtifact = z.infer<typeof AgentResponseArtifactSchema>;
export type AgentResponseDeliverable = z.infer<typeof AgentResponseDeliverableSchema>;
export type AgentResponseContinuity = z.infer<typeof AgentResponseContinuitySchema>;
export type AgentResponseMetadata = z.infer<typeof AgentResponseMetadataSchema>;
export type AgentResponse = z.infer<typeof AgentResponseSchema>;
export type AgentDefinition = z.infer<typeof AgentDefinitionSchema>;
export type AgentRegistry = z.infer<typeof AgentRegistrySchema>;
