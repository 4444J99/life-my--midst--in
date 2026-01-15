/**
 * Analytics Event Schema
 * 
 * Defines all trackable user events in the in–midst–my–life system.
 * Events are structured to support both quantitative analysis and qualitative insights.
 */

import { z } from 'zod';

// ═════════════════════════════════════════════════════════════════════════
// EVENT CATEGORIES
// ═════════════════════════════════════════════════════════════════════════

export const EventCategorySchema = z.enum([
  'user',                    // User authentication & account management
  'profile',                 // Profile creation & updates
  'cv',                      // CV/Resume operations
  'hunter',                  // Job search & application workflow
  'interview',               // Inverted interview interactions
  'feature',                 // Feature usage
  'error',                   // Error tracking
  'performance',             // Performance metrics
  'engagement',              // User engagement & retention
  'feedback',                // Explicit user feedback
]);

export type EventCategory = z.infer<typeof EventCategorySchema>;

// ═════════════════════════════════════════════════════════════════════════
// USER EVENTS
// ═════════════════════════════════════════════════════════════════════════

export const UserEventSchema = z.object({
  name: z.enum([
    'user_signup',           // New user registration
    'user_login',            // User logs in
    'user_logout',           // User logs out
    'user_delete_account',   // User deletes their account
    'user_update_profile',   // User updates personal info
    'user_invite_sent',      // User shares profile link
    'user_onboarding_completed', // Completes initial setup
  ]),
  userId: z.string().uuid(),
  metadata: z.object({
    source: z.enum(['email', 'oauth', 'direct']).optional(),
    invitationCode: z.string().optional(),
    referralSource: z.string().optional(),
    properties: z.record(z.any()).optional(),
  }).optional(),
  timestamp: z.date(),
});

// ═════════════════════════════════════════════════════════════════════════
// PROFILE EVENTS
// ═════════════════════════════════════════════════════════════════════════

export const ProfileEventSchema = z.object({
  name: z.enum([
    'profile_created',
    'profile_updated',
    'profile_viewed',
    'profile_shared',
    'persona_created',
    'persona_selected',
    'persona_deleted',
    'aetas_updated',
    'narrative_created',
    'narrative_updated',
  ]),
  userId: z.string().uuid(),
  profileId: z.string().uuid(),
  metadata: z.object({
    personaId: z.string().optional(),
    personaName: z.string().optional(),
    aetasId: z.string().optional(),
    narrativeCount: z.number().optional(),
    entriesAdded: z.number().optional(),
    shareMethod: z.enum(['link', 'email', 'social']).optional(),
    viewerType: z.enum(['self', 'recruiter', 'employer', 'other']).optional(),
  }).optional(),
  timestamp: z.date(),
});

// ═════════════════════════════════════════════════════════════════════════
// CV/RESUME EVENTS
// ═════════════════════════════════════════════════════════════════════════

export const CVEventSchema = z.object({
  name: z.enum([
    'cv_entry_added',        // Add experience/skill to CV
    'cv_entry_updated',      // Update CV entry
    'cv_entry_deleted',      // Delete CV entry
    'cv_entry_tagged',       // Tag entry with persona/aetas/scaena
    'cv_filtered',           // Generate filtered resume
    'cv_exported',           // Export to PDF/JSON-LD
    'resume_generated',      // Generate persona-specific resume
    'resume_viewed',         // User views their resume
    'resume_downloaded',     // User downloads resume
  ]),
  userId: z.string().uuid(),
  profileId: z.string().uuid(),
  metadata: z.object({
    entryType: z.string().optional(),
    personaId: z.string().optional(),
    filterCount: z.number().optional(),
    exportFormat: z.enum(['pdf', 'json-ld', 'docx']).optional(),
    viewDuration: z.number().optional(), // milliseconds
    downloadCount: z.number().optional(),
  }).optional(),
  timestamp: z.date(),
});

// ═════════════════════════════════════════════════════════════════════════
// HUNTER PROTOCOL EVENTS
// ═════════════════════════════════════════════════════════════════════════

export const HunterEventSchema = z.object({
  name: z.enum([
    'hunter_search_initiated',     // User starts job search
    'hunter_search_completed',     // Search returns results
    'hunter_job_viewed',           // User views job details
    'hunter_compatibility_analyzed', // User analyzes fit
    'hunter_resume_tailored',      // Resume generated for job
    'hunter_cover_letter_generated', // Cover letter created
    'hunter_application_drafted',  // Application prepared
    'hunter_application_submitted', // Application sent
    'hunter_batch_created',        // Batch application set up
    'hunter_batch_submitted',      // Batch applications sent
    'hunter_response_tracked',     // Received interview/rejection
  ]),
  userId: z.string().uuid(),
  profileId: z.string().uuid(),
  metadata: z.object({
    jobId: z.string().optional(),
    jobTitle: z.string().optional(),
    company: z.string().optional(),
    compatibilityScore: z.number().min(0).max(100).optional(),
    searchDuration: z.number().optional(), // milliseconds
    resultsCount: z.number().optional(),
    filterCount: z.number().optional(),
    batchSize: z.number().optional(),
    personaUsed: z.string().optional(),
    responseStatus: z.enum(['interview', 'rejection', 'pending']).optional(),
  }).optional(),
  timestamp: z.date(),
});

// ═════════════════════════════════════════════════════════════════════════
// INTERVIEW EVENTS
// ═════════════════════════════════════════════════════════════════════════

export const InterviewEventSchema = z.object({
  name: z.enum([
    'interview_session_started',
    'interview_session_completed',
    'interview_question_answered',
    'interview_score_calculated',
    'interview_report_generated',
    'interview_shared',
  ]),
  userId: z.string().uuid(),
  profileId: z.string().uuid(),
  metadata: z.object({
    sessionId: z.string().optional(),
    interviewerType: z.enum(['recruiter', 'employer', 'self']).optional(),
    questionsAnswered: z.number().optional(),
    overallScore: z.number().min(0).max(100).optional(),
    cultureFit: z.number().min(0).max(100).optional(),
    growthPotential: z.number().min(0).max(100).optional(),
    sessionDuration: z.number().optional(), // milliseconds
    sharedWith: z.string().optional(),
  }).optional(),
  timestamp: z.date(),
});

// ═════════════════════════════════════════════════════════════════════════
// FEATURE USAGE EVENTS
// ═════════════════════════════════════════════════════════════════════════

export const FeatureEventSchema = z.object({
  name: z.enum([
    'feature_used',          // Generic feature usage
    'feature_discovered',    // User finds new feature
    'feature_abandoned',     // User starts but doesn't complete
    'feature_shared',        // User shares feature with others
    'feature_tutorial_viewed', // User watches tutorial
    'feature_documentation_opened', // User reads docs
  ]),
  userId: z.string().uuid(),
  profileId: z.string().uuid().optional(),
  metadata: z.object({
    featureName: z.string(),
    featureVersion: z.string().optional(),
    usageDuration: z.number().optional(), // milliseconds
    completionRate: z.number().min(0).max(1).optional(), // 0-1
    successfulCompletion: z.boolean().optional(),
    tutorialName: z.string().optional(),
    documentationPage: z.string().optional(),
  }).optional(),
  timestamp: z.date(),
});

// ═════════════════════════════════════════════════════════════════════════
// ERROR & PERFORMANCE EVENTS
// ═════════════════════════════════════════════════════════════════════════

export const ErrorEventSchema = z.object({
  name: z.enum([
    'error_occurred',        // General error
    'api_error',             // API request failed
    'validation_error',      // User input validation failed
    'network_error',         // Network connectivity issue
  ]),
  userId: z.string().uuid(),
  profileId: z.string().uuid().optional(),
  metadata: z.object({
    errorType: z.string(),
    errorMessage: z.string(),
    errorCode: z.string().optional(),
    errorStack: z.string().optional(),
    apiEndpoint: z.string().optional(),
    statusCode: z.number().optional(),
    userAction: z.string().optional(), // What was user doing
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  }).optional(),
  timestamp: z.date(),
});

export const PerformanceEventSchema = z.object({
  name: z.enum([
    'page_load_time',
    'api_response_time',
    'search_duration',
    'database_query_time',
  ]),
  userId: z.string().uuid(),
  metadata: z.object({
    page: z.string().optional(),
    endpoint: z.string().optional(),
    duration: z.number(), // milliseconds
    metric: z.string(),
    slow: z.boolean().optional(), // If duration > threshold
    threshold: z.number().optional(),
  }).optional(),
  timestamp: z.date(),
});

// ═════════════════════════════════════════════════════════════════════════
// ENGAGEMENT & FEEDBACK EVENTS
// ═════════════════════════════════════════════════════════════════════════

export const EngagementEventSchema = z.object({
  name: z.enum([
    'user_returned',         // User comes back after gap
    'streak_maintained',     // User on login streak
    'milestone_achieved',    // User reaches milestone (N jobs applied, etc)
    'feature_adoption',      // User tries new feature
    'retention_risk',        // Signs of disengagement
  ]),
  userId: z.string().uuid(),
  metadata: z.object({
    daysSinceLastVisit: z.number().optional(),
    streakDays: z.number().optional(),
    milestoneType: z.string().optional(),
    milestoneValue: z.number().optional(),
    riskScore: z.number().min(0).max(100).optional(),
  }).optional(),
  timestamp: z.date(),
});

export const FeedbackEventSchema = z.object({
  name: z.enum([
    'feedback_submitted',
    'bug_reported',
    'feature_requested',
    'rating_provided',
    'survey_completed',
  ]),
  userId: z.string().uuid(),
  metadata: z.object({
    feedbackType: z.enum(['suggestion', 'bug', 'feature_request', 'general']).optional(),
    rating: z.number().min(1).max(5).optional(),
    message: z.string().optional(),
    context: z.string().optional(), // What page/feature
    contactAllowed: z.boolean().optional(),
    email: z.string().optional(),
  }).optional(),
  timestamp: z.date(),
});

// ═════════════════════════════════════════════════════════════════════════
// UNIFIED EVENT SCHEMA
// ═════════════════════════════════════════════════════════════════════════

export const EventSchema = z.intersection(
  z.union([
    UserEventSchema,
    ProfileEventSchema,
    CVEventSchema,
    HunterEventSchema,
    InterviewEventSchema,
    FeatureEventSchema,
    ErrorEventSchema,
    PerformanceEventSchema,
    EngagementEventSchema,
    FeedbackEventSchema,
  ]),
  z.object({
    eventId: z.string().uuid(),
    category: EventCategorySchema,
    environment: z.enum(['development', 'staging', 'production']),
    userAgent: z.string().optional(),
    ipAddress: z.string().optional(),
    sessionId: z.string().uuid().optional(),
  })
);

export type AnalyticsEvent = z.infer<typeof EventSchema>;

// ═════════════════════════════════════════════════════════════════════════
// ANALYTICS SERVICE INTERFACE
// ═════════════════════════════════════════════════════════════════════════

export interface AnalyticsService {
  /**
   * Track an event
   * @param event Event to track
   */
  trackEvent(event: Omit<AnalyticsEvent, 'eventId' | 'timestamp' | 'environment'>): Promise<void>;

  /**
   * Batch track multiple events
   * @param events Array of events
   */
  trackEvents(events: Omit<AnalyticsEvent, 'eventId' | 'timestamp' | 'environment'>[]): Promise<void>;

  /**
   * Identify a user
   * @param userId User ID
   * @param properties User properties
   */
  identify(userId: string, properties: Record<string, any>): Promise<void>;

  /**
   * Create an analytics session
   * @param userId User ID
   * @param metadata Session metadata
   * @returns Session ID
   */
  createSession(userId: string, metadata?: Record<string, any>): string;

  /**
   * Get user analytics data
   * @param userId User ID
   * @param from Start date
   * @param to End date
   */
  getUserAnalytics(userId: string, from: Date, to: Date): Promise<any>;

  /**
   * Get system-wide analytics
   * @param from Start date
   * @param to End date
   */
  getSystemAnalytics(from: Date, to: Date): Promise<any>;
}

// ═════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════

/**
 * Create an event with automatic fields
 */
export function createEvent(
  event: Omit<AnalyticsEvent, 'eventId' | 'timestamp'>,
  environment: 'development' | 'staging' | 'production' = 'production'
): AnalyticsEvent {
  return {
    ...event,
    eventId: crypto.randomUUID(),
    timestamp: new Date(),
    environment,
  } as AnalyticsEvent;
}

/**
 * Event builder for fluent API
 */
export class EventBuilder {
  private event: Partial<AnalyticsEvent> = {
    timestamp: new Date(),
    environment: 'production',
  };

  setCategory(category: EventCategory): this {
    this.event.category = category;
    return this;
  }

  setUserId(userId: string): this {
    this.event.userId = userId;
    return this;
  }

  setProfileId(profileId: string): this {
    (this.event as any).profileId = profileId;
    return this;
  }

  setMetadata(metadata: Record<string, any>): this {
    (this.event as any).metadata = metadata;
    return this;
  }

  build(): Omit<AnalyticsEvent, 'eventId'> {
    return {
      ...this.event,
      timestamp: this.event.timestamp || new Date(),
    } as Omit<AnalyticsEvent, 'eventId'>;
  }
}
