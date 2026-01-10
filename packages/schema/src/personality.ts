import { z } from "zod";

export const PersonalitySchema = z.object({
  id: z.string(),
  label: z.string(),
  orientation: z.string().optional(),
  summary: z.string().optional()
});

export type Personality = z.infer<typeof PersonalitySchema>;
