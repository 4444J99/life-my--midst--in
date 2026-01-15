import { z } from "zod";

export const JobPostingSchema = z.object({
  id: z.string().uuid(),
  profileId: z.string().uuid(),
  title: z.string(),
  company: z.string(),
  descriptionMarkdown: z.string().optional(),
  url: z.string().url().optional(),
  salaryRange: z.string().optional(),
  location: z.string().optional(),
  remote: z.enum(["fully", "hybrid", "onsite", "any"]).optional(),
  vectors: z.array(z.number()).optional(),
  status: z.enum(["active", "closed", "applied", "ignored"]).default("active"),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export type JobPosting = z.infer<typeof JobPostingSchema>;

export const JobApplicationSchema = z.object({
  id: z.string().uuid(),
  profileId: z.string().uuid(),
  jobPostingId: z.string().uuid(),
  status: z.enum(["draft", "applied", "interviewing", "offer", "rejected", "withdrawn"]).default("draft"),
  coverLetterMarkdown: z.string().optional(),
  resumeSnapshotId: z.string().uuid().optional(),
  appliedAt: z.string().datetime().optional(),
  notes: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export type JobApplication = z.infer<typeof JobApplicationSchema>;
