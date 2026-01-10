import { z } from 'zod';
import { UUIDSchema, TimestampSchema } from './common';

/**
 * Persona Collaboration
 * Users can request feedback on their personas from trusted advisors
 */

export const PersonaFeedbackRequestSchema = z.object({
  id: UUIDSchema,
  profileId: UUIDSchema,
  personaId: z.string(),
  advisorEmail: z.string().email(),
  shareToken: z.string().uuid(),
  status: z.enum(['pending', 'viewed', 'responded', 'declined']),
  message: z.string().max(500).optional(),
  sharedAt: TimestampSchema,
  expiresAt: TimestampSchema,
  respondedAt: TimestampSchema.optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export type PersonaFeedbackRequest = z.infer<typeof PersonaFeedbackRequestSchema>;

export const PersonaFeedbackSchema = z.object({
  id: UUIDSchema,
  requestId: UUIDSchema,
  profileId: UUIDSchema,
  personaId: z.string(),
  advisorId: UUIDSchema,
  isAnonymous: z.boolean().default(false),
  rating: z.number().min(1).max(5),
  strengths: z.array(z.string()).max(5),
  areasForGrowth: z.array(z.string()).max(5),
  feedback: z.string().max(2000),
  suggestedImprovements: z.array(z.string()).max(3),
  wouldRecommend: z.boolean(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export type PersonaFeedback = z.infer<typeof PersonaFeedbackSchema>;

export const PersonaVersionSchema = z.object({
  id: UUIDSchema,
  profileId: UUIDSchema,
  personaId: z.string(),
  version: z.number().min(1),
  name: z.string(),
  description: z.string(),
  toneRegister: z.string().optional(),
  coreValues: z.array(z.string()),
  visibilityScope: z.enum(['private', 'advisors', 'employers', 'public']),
  snapshot: z.record(z.any()),
  feedbackSummary: z.object({
    totalFeedback: z.number(),
    averageRating: z.number().min(1).max(5),
    keyThemes: z.array(z.string()),
  }).optional(),
  createdAt: TimestampSchema,
});

export type PersonaVersion = z.infer<typeof PersonaVersionSchema>;

/**
 * User-to-User Connections
 * Track connections and their status
 */

export const UserConnectionSchema = z.object({
  id: UUIDSchema,
  userId: UUIDSchema,
  connectedUserId: UUIDSchema,
  status: z.enum(['pending', 'connected', 'blocked']),
  initiatedBy: UUIDSchema,
  message: z.string().max(500).optional(),
  createdAt: TimestampSchema,
  connectedAt: TimestampSchema.optional(),
  updatedAt: TimestampSchema,
});

export type UserConnection = z.infer<typeof UserConnectionSchema>;

/**
 * Public Profile Settings
 * Control what's visible publicly
 */

export const PublicProfileSettingsSchema = z.object({
  id: UUIDSchema,
  profileId: UUIDSchema,
  userId: UUIDSchema,
  isPublic: z.boolean().default(false),
  profileSlug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  bio: z.string().max(500).optional(),
  visiblePersonas: z.array(z.string()),
  visibleExperiences: z.array(UUIDSchema),
  allowMessaging: z.boolean().default(true),
  allowMentorshipRequests: z.boolean().default(true),
  indexInSearchEngines: z.boolean().default(false),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export type PublicProfileSettings = z.infer<typeof PublicProfileSettingsSchema>;

/**
 * Public Profile View Analytics
 * Track who viewed public profiles
 */

export const ProfileViewSchema = z.object({
  id: UUIDSchema,
  publicProfileId: UUIDSchema,
  viewerId: UUIDSchema.optional(),
  visitorId: z.string().optional(),
  viewedAt: TimestampSchema,
  timeSpentSeconds: z.number().optional(),
  source: z.enum(['search', 'discovery', 'direct', 'referral', 'integration']).optional(),
});

export type ProfileView = z.infer<typeof ProfileViewSchema>;

/**
 * Mentorship Models
 */

export const MentorProfileSchema = z.object({
  id: UUIDSchema,
  userId: UUIDSchema,
  profileId: UUIDSchema,
  areasOfExpertise: z.array(z.string()).min(1).max(10),
  yearsOfExperience: z.number().min(0).max(70),
  bio: z.string().max(1000).optional(),
  availability: z.enum(['limited', 'moderate', 'available', 'unavailable']),
  mentorshipStyle: z.enum(['directive', 'coaching', 'collaborative', 'hands-on']),
  specialties: z.array(z.string()).max(5),
  menteeBackground: z.array(z.string()).optional(),
  commitmentLevel: z.enum(['casual', 'committed', 'intensive']).default('committed'),
  successMetrics: z.array(z.string()).optional(),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().default(0),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export type MentorProfile = z.infer<typeof MentorProfileSchema>;

export const MenteeGoalSchema = z.object({
  id: UUIDSchema,
  userId: UUIDSchema,
  profileId: UUIDSchema,
  goals: z.array(z.string()).min(1).max(5),
  challengeAreas: z.array(z.string()).max(5),
  desiredMentorExpertise: z.array(z.string()).min(1).max(5),
  timelineWeeks: z.number().min(4).max(104),
  commitment: z.enum(['casual', 'committed', 'intensive']),
  learningStyle: z.array(z.enum(['reading', 'discussion', 'practice', 'observation'])),
  budget: z.enum(['none', 'modest', 'flexible']).optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export type MenteeGoal = z.infer<typeof MenteeGoalSchema>;

export const MentorshipRequestSchema = z.object({
  id: UUIDSchema,
  mentorId: UUIDSchema,
  menteeId: UUIDSchema,
  mentorProfileId: UUIDSchema,
  menteeGoalId: UUIDSchema,
  status: z.enum(['pending', 'accepted', 'declined', 'completed']),
  matchScore: z.number().min(0).max(100).optional(),
  matchReasoning: z.string().max(500).optional(),
  menteeMessage: z.string().max(500).optional(),
  mentorResponse: z.string().max(500).optional(),
  startDate: TimestampSchema.optional(),
  endDate: TimestampSchema.optional(),
  createdAt: TimestampSchema,
  respondedAt: TimestampSchema.optional(),
  updatedAt: TimestampSchema,
});

export type MentorshipRequest = z.infer<typeof MentorshipRequestSchema>;

export const MentorshipSessionSchema = z.object({
  id: UUIDSchema,
  mentorshipId: UUIDSchema,
  mentorId: UUIDSchema,
  menteeId: UUIDSchema,
  scheduledAt: TimestampSchema,
  duration: z.number(),
  format: z.enum(['video', 'audio', 'chat', 'in-person']),
  topic: z.string(),
  notes: z.string().optional(),
  completed: z.boolean().default(false),
  createdAt: TimestampSchema,
});

export type MentorshipSession = z.infer<typeof MentorshipSessionSchema>;

export const MentorshipReviewSchema = z.object({
  id: UUIDSchema,
  mentorshipId: UUIDSchema,
  mentorId: UUIDSchema,
  menteeId: UUIDSchema,
  rating: z.number().min(1).max(5),
  review: z.string().max(1000),
  goalsAchieved: z.array(z.string()),
  wouldRecommend: z.boolean(),
  createdAt: TimestampSchema,
});

export type MentorshipReview = z.infer<typeof MentorshipReviewSchema>;

/**
 * Community Contributions
 */

export const ContributionSchema = z.object({
  id: UUIDSchema,
  userId: UUIDSchema,
  type: z.enum(['feedback_given', 'mentoring', 'content_created', 'community_moderation', 'integration_shared']),
  recipientId: UUIDSchema.optional(),
  description: z.string(),
  points: z.number().min(0),
  verifiedAt: TimestampSchema.optional(),
  createdAt: TimestampSchema,
});

export type Contribution = z.infer<typeof ContributionSchema>;

export const BadgeSchema = z.object({
  id: UUIDSchema,
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  requirement: z.enum(['contributions', 'mentoring', 'feedback', 'integration']),
  requirementValue: z.number(),
});

export type Badge = z.infer<typeof BadgeSchema>;

export const UserBadgeSchema = z.object({
  id: UUIDSchema,
  userId: UUIDSchema,
  badgeId: UUIDSchema,
  earnedAt: TimestampSchema,
});

export type UserBadge = z.infer<typeof UserBadgeSchema>;

/**
 * Integration Models
 */

export const ExternalAccountSchema = z.object({
  id: UUIDSchema,
  userId: UUIDSchema,
  profileId: UUIDSchema,
  provider: z.enum(['github', 'linkedin', 'twitter', 'portfolio']),
  externalId: z.string(),
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: TimestampSchema.optional(),
  scope: z.array(z.string()),
  isActive: z.boolean().default(true),
  syncedAt: TimestampSchema.optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export type ExternalAccount = z.infer<typeof ExternalAccountSchema>;

export const IntegrationLogSchema = z.object({
  id: UUIDSchema,
  accountId: UUIDSchema,
  action: z.enum(['sync_started', 'sync_completed', 'sync_failed', 'data_imported', 'data_exported']),
  status: z.enum(['pending', 'success', 'failure']),
  dataImported: z.number().optional(),
  error: z.string().optional(),
  createdAt: TimestampSchema,
});

export type IntegrationLog = z.infer<typeof IntegrationLogSchema>;

/**
 * Exports
 */

export const CollaborationSchemas = {
  PersonaFeedbackRequest: PersonaFeedbackRequestSchema,
  PersonaFeedback: PersonaFeedbackSchema,
  PersonaVersion: PersonaVersionSchema,
  UserConnection: UserConnectionSchema,
  PublicProfileSettings: PublicProfileSettingsSchema,
  ProfileView: ProfileViewSchema,
  MentorProfile: MentorProfileSchema,
  MenteeGoal: MenteeGoalSchema,
  MentorshipRequest: MentorshipRequestSchema,
  MentorshipSession: MentorshipSessionSchema,
  MentorshipReview: MentorshipReviewSchema,
  Contribution: ContributionSchema,
  Badge: BadgeSchema,
  UserBadge: UserBadgeSchema,
  ExternalAccount: ExternalAccountSchema,
  IntegrationLog: IntegrationLogSchema,
};
