import {
  MaskSchema,
  ProfileSchema,
  ExperienceSchema,
  EducationSchema,
  ProjectSchema,
  SkillSchema,
  PublicationSchema,
  AwardSchema,
  CertificationSchema,
  CustomSectionSchema,
  SocialLinkSchema,
  TimelineEventSchema,
  VerificationLogSchema,
  VerifiableCredentialSchema,
  AttestationLinkSchema,
  ContentEdgeSchema,
  ContentRevisionSchema,
  CvEntityTypeSchema
} from "@in-midst-my-life/schema";
import { z } from "zod";
import { EpochSchema } from "@in-midst-my-life/schema";
import { StageSchema } from "@in-midst-my-life/schema";

/**
 * Base pagination parameters for list endpoints.
 * All taxonomy list endpoints support offset/limit.
 */
export const PaginationSchema = z.object({
  offset: z.coerce.number().min(0).default(0),
  limit: z.coerce.number().min(1).max(100).default(20)
});

/**
 * Query parameters for mask listing.
 * Supports pagination, filtering by ontology/tags, and text search.
 */
export const MaskQuerySchema = PaginationSchema.extend({
  /** Filter by mask ontology (cognitive, expressive, operational) */
  ontology: z.string().optional(),
  /** Filter by mask tag (e.g., "leadership", "analysis") */
  tag: z.string().optional(),
  /** Full-text search on mask name and functional_scope */
  search: z.string().optional(),
  /** Sort field: "name", "ontology", or "functional_scope" (default: "name") */
  sortBy: z.enum(["name", "ontology", "functional_scope"]).optional(),
  /** Sort order: "asc" or "desc" (default: "asc") */
  sortOrder: z.enum(["asc", "desc"]).default("asc")
});

/**
 * Query parameters for epoch listing.
 * Supports pagination and filtering by stage count/order.
 */
export const EpochQuerySchema = PaginationSchema.extend({
  /** Filter epochs that contain a specific stage ID */
  stageId: z.string().optional(),
  /** Sort field: "order", "name" (default: "order") */
  sortBy: z.enum(["order", "name"]).default("order"),
  /** Sort order: "asc" or "desc" (default: "asc") */
  sortOrder: z.enum(["asc", "desc"]).default("asc")
});

/**
 * Query parameters for stage listing.
 * Supports pagination, filtering by epoch, and text search.
 */
export const StageQuerySchema = PaginationSchema.extend({
  /** Filter stages belonging to a specific epoch ID */
  epochId: z.string().optional(),
  /** Filter stages by tag */
  tag: z.string().optional(),
  /** Full-text search on stage title and summary */
  search: z.string().optional(),
  /** Sort field: "order", "title" (default: "order") */
  sortBy: z.enum(["order", "title"]).default("order"),
  /** Sort order: "asc" or "desc" (default: "asc") */
  sortOrder: z.enum(["asc", "desc"]).default("asc")
});

export const MaskCreateSchema = MaskSchema;
export const MaskUpdateSchema = MaskSchema.partial();

export const StageCreateSchema = StageSchema;
export const StageUpdateSchema = StageSchema.partial();

export const MaskSelectionSchema = z.object({
  contexts: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  limit: z.coerce.number().min(1).max(100).default(50)
});

export const EpochCreateSchema = EpochSchema;
export const EpochUpdateSchema = EpochSchema.partial();

export const ProfileCreateSchema = ProfileSchema;
export const ProfileUpdateSchema = ProfileSchema.partial();

export const CvEntityTypeParamSchema = CvEntityTypeSchema;

export const ExperienceCreateSchema = ExperienceSchema;
export const ExperienceUpdateSchema = ExperienceSchema.partial();
export const EducationCreateSchema = EducationSchema;
export const EducationUpdateSchema = EducationSchema.partial();
export const ProjectCreateSchema = ProjectSchema;
export const ProjectUpdateSchema = ProjectSchema.partial();
export const SkillCreateSchema = SkillSchema;
export const SkillUpdateSchema = SkillSchema.partial();
export const PublicationCreateSchema = PublicationSchema;
export const PublicationUpdateSchema = PublicationSchema.partial();
export const AwardCreateSchema = AwardSchema;
export const AwardUpdateSchema = AwardSchema.partial();
export const CertificationCreateSchema = CertificationSchema;
export const CertificationUpdateSchema = CertificationSchema.partial();
export const CustomSectionCreateSchema = CustomSectionSchema;
export const CustomSectionUpdateSchema = CustomSectionSchema.partial();
export const SocialLinkCreateSchema = SocialLinkSchema;
export const SocialLinkUpdateSchema = SocialLinkSchema.partial();
export const TimelineEventCreateSchema = TimelineEventSchema;
export const TimelineEventUpdateSchema = TimelineEventSchema.partial();
export const VerificationLogCreateSchema = VerificationLogSchema;
export const VerificationLogUpdateSchema = VerificationLogSchema.partial();

export const VerifiableCredentialCreateSchema = VerifiableCredentialSchema;
export const VerifiableCredentialUpdateSchema = VerifiableCredentialSchema.partial();
export const AttestationLinkCreateSchema = AttestationLinkSchema;
export const AttestationLinkUpdateSchema = AttestationLinkSchema.partial();

export const ContentEdgeCreateSchema = ContentEdgeSchema;
export const ContentEdgeUpdateSchema = ContentEdgeSchema.partial();
export const ContentRevisionCreateSchema = ContentRevisionSchema;

export const NarrativeTimelineEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string().optional(),
  start: z.string(),
  end: z.string().optional(),
  tags: z.array(z.string()).optional(),
  stageId: z.string().optional(),
  epochId: z.string().optional(),
  settingId: z.string().optional()
});

export const NarrativeRequestSchema = z.object({
  maskId: z.string().optional(),
  contexts: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  timeline: z.array(NarrativeTimelineEntrySchema).default([])
});

/**
 * Schema for CV/résumé narrative generation request.
 * Generates narrative blocks suitable for résumé/CV composition.
 */
export const NarrativeGenerateRequestSchema = z.object({
  /** Optional mask ID to filter narrative through (e.g., 'analyst', 'architect') */
  maskId: z.string().optional(),
  /** Activation contexts (e.g., 'technical', 'leadership', 'analysis') */
  contexts: z.array(z.string()).default([]),
  /** Priority tags to emphasize (e.g., 'impact', 'innovation', 'reliability') */
  tags: z.array(z.string()).default([]),
  /** Timeline entries (experiences, projects, etc.) to include in generation */
  timeline: z.array(NarrativeTimelineEntrySchema).default([]),
  /** Limit number of blocks to generate (default: 10, max: 50) */
  limit: z.coerce.number().min(1).max(50).default(10),
  /** Whether to include metadata about mask/personality/epoch scoring (default: false) */
  includeMeta: z.boolean().default(false)
});

export const ProfileBundleSchema = z.object({
  "@context": z.record(z.string()).default({}),
  bundleVersion: z.string(),
  exportedAt: z.string().datetime(),
  profile: ProfileSchema,
  cv: z.object({
    experiences: z.array(ExperienceSchema).default([]),
    educations: z.array(EducationSchema).default([]),
    projects: z.array(ProjectSchema).default([]),
    skills: z.array(SkillSchema).default([]),
    publications: z.array(PublicationSchema).default([]),
    awards: z.array(AwardSchema).default([]),
    certifications: z.array(CertificationSchema).default([]),
    customSections: z.array(CustomSectionSchema).default([]),
    socialLinks: z.array(SocialLinkSchema).default([]),
    timelineEvents: z.array(TimelineEventSchema).default([]),
    verificationLogs: z.array(VerificationLogSchema).default([]),
    credentials: z.array(VerifiableCredentialSchema).default([]),
    attestations: z.array(AttestationLinkSchema).default([]),
    edges: z.array(ContentEdgeSchema).default([]),
    revisions: z.array(ContentRevisionSchema).default([])
  }),
  taxonomy: z
    .object({
      masks: z.array(MaskSchema).default([]),
      epochs: z.array(EpochSchema).default([]),
      stages: z.array(StageSchema).default([])
    })
    .optional()
});

export const ImportModeSchema = z.enum(["merge", "replace"]);

export const ProfileImportRequestSchema = z.object({
  mode: ImportModeSchema.default("merge"),
  dryRun: z.boolean().default(false),
  bundle: ProfileBundleSchema
});

export const ProfileRestoreRequestSchema = z.object({
  snapshotId: z.string().uuid(),
  dryRun: z.boolean().default(false)
});
