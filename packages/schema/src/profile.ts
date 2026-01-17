import { z } from "zod";
import { ExternalIdSchema, IdentityCoreSchema } from "./identity";
import { SkillSchema, ExperienceSchema, EducationSchema } from "./cv";

/**
 * Enumeration of profile visibility levels.
 * Controls who can view the profile and how it appears in search/discovery.
 * 
 * @example
 * const visibility = ProfileVisibilitySchema.parse("public"); // ✓
 */
export const ProfileVisibilitySchema = z.enum(["public", "unlisted", "private"]);

/**
 * Enumeration of standard CV/profile section types.
 * These represent traditional CV sections plus temporal and custom sections.
 * 
 * @example
 * const section = ProfileSectionTypeSchema.parse("experience"); // ✓
 */
export const ProfileSectionTypeSchema = z.enum([
  "experience",
  "education",
  "projects",
  "skills",
  "publications",
  "awards",
  "certifications",
  "socialLinks",
  "timeline",
  "customSection"
]);

/**
 * Schema for a single section entry in the profile's section ordering.
 * Allows customization of how standard sections appear and what custom sections exist.
 * 
 * Properties:
 * - `type`: Which section this entry represents
 * - `labelOverride`: Custom label if you want to rename the section
 * - `isVisible`: Whether this section should appear in outputs
 * - `sortOrder`: Position relative to other sections (lower = earlier)
 * - `customSectionId`: UUID of the custom section (if type="customSection")
 * 
 * @example
 * const entry = ProfileSectionEntrySchema.parse({
 *   type: "experience",
 *   labelOverride: "Work History",
 *   isVisible: true,
 *   sortOrder: 1
 * });
 */
export const ProfileSectionEntrySchema = z.object({
  type: ProfileSectionTypeSchema,
  labelOverride: z.string().optional(),
  isVisible: z.boolean(),
  sortOrder: z.number().int(),
  customSectionId: z.string().uuid().optional()
});

/**
 * Schema for the complete section ordering configuration.
 * Defines the structure and visibility of all sections in the profile.
 * 
 * @example
 * const order = ProfileSectionOrderSchema.parse({
 *   sections: [
 *     { type: "experience", isVisible: true, sortOrder: 1 },
 *     { type: "education", isVisible: true, sortOrder: 2 }
 *   ]
 * });
 */
export const ProfileSectionOrderSchema = z.object({
  sections: z.array(ProfileSectionEntrySchema)
});

/**
 * Schema for profile-level settings and configuration.
 * 
 * Properties:
 * - `visibility`: Public/unlisted/private access control
 * - `defaultThemeId`: Which theme to use for rendering
 * - `defaultLanguage`: Default language for output generation
 * - `sectionOrder`: How sections should be ordered and displayed
 * - `agentAccess`: Settings for autonomous agent access (if enabled)
 * 
 * @example
 * const settings = ProfileSettingsSchema.parse({
 *   visibility: "public",
 *   defaultLanguage: "en",
 *   sectionOrder: { sections: [] },
 *   agentAccess: {
 *     enabled: true,
 *     defaultMaskId: "mask-analyst-001",
 *     allowedScopes: ["read:profile", "write:narrative"]
 *   }
 * });
 */
export const ProfileSettingsSchema = z.object({
  visibility: ProfileVisibilitySchema,
  defaultThemeId: z.string().optional(),
  defaultLanguage: z.string().optional(),
  sectionOrder: ProfileSectionOrderSchema,
  agentAccess: z
    .object({
      enabled: z.boolean().default(false),
      defaultMaskId: z.string().optional(),
      allowedScopes: z.array(z.string()).default([])
    })
    .optional()
});

/**
 * Schema for a complete user profile.
 * 
 * A Profile represents the actual biographical data and professional information.
 * It's distinct from Identity (which is immutable and represents "who you are").
 * One Identity can have multiple Profiles if needed (though typically 1:1).
 * 
 * Properties:
 * - `id`: UUID uniquely identifying this profile
 * - `identityId`: UUID linking to the Identity this profile describes
 * - `did`: Optional W3C DID for this profile
 * - `slug`: URL-friendly identifier (e.g., "john-doe")
 * - `displayName`: Full name or display name
 * - `title`: Professional title (e.g., "Senior Engineer")
 * - `headline`: Short personal headline (e.g., "Building systems at scale")
 * - `summaryMarkdown`: Longer markdown biography/summary
 * - `avatarUrl`: Profile photo URL
 * - `coverImageUrl`: Cover/banner image URL
 * - `locationText`: Location string (city, country, etc.)
 * - `externalIds`: Links to profiles on other platforms
 * - `settings`: Profile-level configuration
 * - `isActive`: Whether this profile should be visible
 * - `createdAt`: ISO 8601 creation timestamp
 * - `updatedAt`: ISO 8601 last update timestamp
 * 
 * @example
 * const profile = ProfileSchema.parse({
 *   id: "550e8400-e29b-41d4-a716-446655440000",
 *   identityId: "650e8400-e29b-41d4-a716-446655440001",
 *   slug: "jane-doe",
 *   displayName: "Jane Doe",
 *   title: "Solutions Architect",
 *   headline: "Building customer success through elegant systems",
 *   settings: {
 *     visibility: "public",
 *     sectionOrder: { sections: [] }
 *   },
 *   createdAt: new Date().toISOString(),
 *   updatedAt: new Date().toISOString()
 * });
 */
export const ProfileSchema = z.object({
  id: z.string().uuid(),
  identityId: z.string().uuid(),
  did: z.string().optional(),
  slug: z.string(),
  displayName: z.string(),
  title: z.string().optional(),
  headline: z.string().optional(),
  summaryMarkdown: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  coverImageUrl: z.string().url().optional(),
  locationText: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional(),
  externalIds: z.array(ExternalIdSchema).optional(),
  // CV-related properties (optional - for compatibility with content-model)
  skills: z.array(SkillSchema).optional().describe("Professional skills and competencies"),
  experiences: z.array(ExperienceSchema).optional().describe("Work experiences and roles"),
  education: z.array(EducationSchema).optional().describe("Educational background"),
  languages: z.array(z.string()).optional().describe("Spoken/written languages"),
  interests: z.array(z.string()).optional().describe("Personal interests and hobbies"),
  personalThesis: IdentityCoreSchema.optional().describe("Personal identity core and guiding philosophy"),
  settings: ProfileSettingsSchema.optional(),
  isActive: z.boolean().default(true),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

/**
 * Type representation of a user profile.
 * The actual biography and professional information for a person.
 */
export type Profile = z.infer<typeof ProfileSchema>;
