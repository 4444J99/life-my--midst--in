import { z } from "zod";

export const SettingSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string().optional(),
  tags: z.array(z.string()).optional()
});

export type Setting = z.infer<typeof SettingSchema>;
