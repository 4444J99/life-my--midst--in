import { z } from "zod";
import { IntegrityProofSchema, CvEntityTypeSchema } from "./base";

export const SkillRefSchema = z.object({
  skillId: z.string().uuid().optional(),
  label: z.string(),
  weight: z.number().min(0).max(1).optional()
});

export type SkillRef = z.infer<typeof SkillRefSchema>;

export const MediaItemTypeSchema = z.enum(["image", "video", "audio", "embed", "file"]);

export const MediaItemSchema = z.object({
  id: z.string().uuid(),
  type: MediaItemTypeSchema,
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  title: z.string().optional(),
  description: z.string().optional()
});

export type MediaItem = z.infer<typeof MediaItemSchema>;

export const ExperienceEmploymentTypeSchema = z.enum([
  "full_time",
  "part_time",
  "freelance",
  "contract",
  "internship",
  "self_employed",
  "volunteer"
]);

export const ExperienceSchema = z.object({
  id: z.string().uuid(),
  profileId: z.string().uuid(),
  roleTitle: z.string(),
  organization: z.string(),
  organizationUrl: z.string().url().optional(),
  locationText: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  isCurrent: z.boolean(),
  employmentType: ExperienceEmploymentTypeSchema.optional(),
  descriptionMarkdown: z.string().optional(),
  highlights: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  skillsUsed: z.array(SkillRefSchema).optional(),
  integrity: IntegrityProofSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export type Experience = z.infer<typeof ExperienceSchema>;

export const EducationSchema = z.object({
  id: z.string().uuid(),
  profileId: z.string().uuid(),
  institution: z.string(),
  institutionUrl: z.string().url().optional(),
  degree: z.string().optional(),
  fieldOfStudy: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isCurrent: z.boolean(),
  thesisTitle: z.string().optional(),
  descriptionMarkdown: z.string().optional(),
  integrity: IntegrityProofSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export type Education = z.infer<typeof EducationSchema>;

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  profileId: z.string().uuid(),
  name: z.string(),
  subtitle: z.string().optional(),
  role: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isOngoing: z.boolean(),
  url: z.string().url().optional(),
  repoUrl: z.string().url().optional(),
  externalId: z.string().optional(),
  mediaGallery: z.array(MediaItemSchema).optional(),
  descriptionMarkdown: z.string().optional(),
  highlights: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  skillsUsed: z.array(SkillRefSchema).optional(),
  integrity: IntegrityProofSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export type Project = z.infer<typeof ProjectSchema>;

export const SkillCategorySchema = z.enum(["technical", "artistic", "theoretical", "research", "soft", "other"]);
export const SkillLevelSchema = z.enum(["novice", "intermediate", "advanced", "expert"]);

export const SkillSchema = z.object({
  id: z.string().uuid(),
  profileId: z.string().uuid(),
  name: z.string(),
  category: SkillCategorySchema.optional(),
  level: SkillLevelSchema.optional(),
  yearsOfExperience: z.number().min(0).optional(),
  lastUsedDate: z.string().optional(),
  isPrimary: z.boolean(),
  integrity: IntegrityProofSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export type Skill = z.infer<typeof SkillSchema>;

export const PublicationTypeSchema = z.enum(["journal", "conference", "book", "chapter", "exhibition", "other"]);

export const PublicationSchema = z.object({
  id: z.string().uuid(),
  profileId: z.string().uuid(),
  title: z.string(),
  venue: z.string().optional(),
  publicationType: PublicationTypeSchema.optional(),
  date: z.string().optional(),
  url: z.string().url().optional(),
  doi: z.string().optional(),
  authors: z.array(z.string()).optional(),
  abstractMarkdown: z.string().optional(),
  integrity: IntegrityProofSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export type Publication = z.infer<typeof PublicationSchema>;

export const AwardSchema = z.object({
  id: z.string().uuid(),
  profileId: z.string().uuid(),
  title: z.string(),
  issuer: z.string().optional(),
  date: z.string().optional(),
  url: z.string().url().optional(),
  descriptionMarkdown: z.string().optional(),
  integrity: IntegrityProofSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export type Award = z.infer<typeof AwardSchema>;

export const CertificationSchema = z.object({
  id: z.string().uuid(),
  profileId: z.string().uuid(),
  name: z.string(),
  issuer: z.string(),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  credentialId: z.string().optional(),
  credentialUrl: z.string().url().optional(),
  integrity: IntegrityProofSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export type Certification = z.infer<typeof CertificationSchema>;

export const SocialLinkPlatformSchema = z.enum([
  "website",
  "github",
  "linkedin",
  "twitter",
  "instagram",
  "mastodon",
  "bluesky",
  "youtube",
  "custom"
]);

export const SocialLinkSchema = z.object({
  id: z.string().uuid(),
  profileId: z.string().uuid(),
  platform: SocialLinkPlatformSchema,
  label: z.string().optional(),
  url: z.string().url(),
  sortOrder: z.number().int(),
  integrity: IntegrityProofSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export type SocialLink = z.infer<typeof SocialLinkSchema>;

export const CustomSectionSchema = z.object({
  id: z.string().uuid(),
  profileId: z.string().uuid(),
  title: z.string(),
  contentMarkdown: z.string(),
  sortOrder: z.number().int(),
  integrity: IntegrityProofSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export type CustomSection = z.infer<typeof CustomSectionSchema>;

export const VerifiableCredentialStatusSchema = z.enum(["valid", "revoked", "expired", "unknown"]);

export const VerifiableCredentialSchema = z.object({
  id: z.string().uuid(),
  issuerIdentityId: z.string().uuid(),
  subjectProfileId: z.string().uuid(),
  types: z.array(z.string()),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  credentialSubject: z.record(z.unknown()),
  proof: z.record(z.unknown()),
  summary: z.string().optional(),
  status: VerifiableCredentialStatusSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export type VerifiableCredential = z.infer<typeof VerifiableCredentialSchema>;

export const AttestationVisibilitySchema = z.enum(["public", "private", "issuer_only"]);

export const AttestationLinkSchema = z.object({
  id: z.string().uuid(),
  profileId: z.string().uuid().optional(),
  credentialId: z.string().uuid(),
  entityType: CvEntityTypeSchema,
  entityId: z.string().uuid(),
  visibility: AttestationVisibilitySchema,
  labelOverride: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export type AttestationLink = z.infer<typeof AttestationLinkSchema>;

export const ContentEdgeSchema = z.object({
  id: z.string().uuid(),
  profileId: z.string().uuid(),
  fromType: CvEntityTypeSchema,
  fromId: z.string().uuid(),
  toType: CvEntityTypeSchema,
  toId: z.string().uuid(),
  relationType: z.string(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export type ContentEdge = z.infer<typeof ContentEdgeSchema>;

export const ContentRevisionSchema = z.object({
  id: z.string().uuid(),
  profileId: z.string().uuid(),
  entityType: CvEntityTypeSchema,
  entityId: z.string().uuid(),
  data: z.record(z.unknown()),
  createdAt: z.string().datetime()
});

export type ContentRevision = z.infer<typeof ContentRevisionSchema>;
