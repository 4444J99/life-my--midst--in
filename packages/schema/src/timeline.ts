import { z } from "zod";

export const TimelineEntityKindSchema = z.enum([
  "experience",
  "education",
  "project",
  "publication",
  "award",
  "certification",
  "custom"
]);

export const TimelineEventSchema = z.object({
  id: z.string().uuid(),
  profileId: z.string().uuid(),
  entityKind: TimelineEntityKindSchema,
  entityId: z.string().uuid().optional(),
  title: z.string(),
  startDate: z.string(),
  endDate: z.string().optional(),
  descriptionMarkdown: z.string().optional(),
  tags: z.array(z.string()).optional(),
  lane: z.number().int().optional(),
  importance: z.number().min(0).max(1).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export type TimelineEvent = z.infer<typeof TimelineEventSchema>;
