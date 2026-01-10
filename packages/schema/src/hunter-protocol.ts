import { z } from "zod";

/**
 * Hunter Protocol Schema
 * Autonomous job-search agent that filters opportunities intelligently
 * instead of applying to 2000 jobs with zero callbacks
 */

// Job search and matching
export const JobListingSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  company: z.string(),
  location: z.string(),
  remote: z.enum(["fully", "hybrid", "onsite"]),
  description: z.string(),
  requirements: z.string(),
  salary_min: z.number().optional(),
  salary_max: z.number().optional(),
  currency: z.string().optional(),
  job_url: z.string().url(),
  posted_date: z.date(),
  application_deadline: z.date().optional(),
  source: z.enum(["linkedin", "indeed", "angellist", "wellfound", "other"]),
  company_industry: z.string().optional(),
  company_size: z.enum(["startup", "scale-up", "mid-market", "enterprise"]).optional(),
  technologies: z.string().array().optional(),
});

export type JobListing = z.infer<typeof JobListingSchema>;

// Gap analysis between job and candidate
export const SkillGapSchema = z.object({
  skill: z.string(),
  required_level: z.enum(["junior", "intermediate", "senior", "expert"]),
  candidate_level: z.enum(["junior", "intermediate", "senior", "expert"]).optional(),
  gap_severity: z.enum(["critical", "high", "medium", "low", "none"]),
  explanation: z.string(),
  learnable: z.boolean(), // Can be learned before applying
});

export type SkillGap = z.infer<typeof SkillGapSchema>;

export const CompatibilityAnalysisSchema = z.object({
  job_id: z.string().uuid(),
  profile_id: z.string().uuid(),
  persona_id: z.string(), // Which mask is this analysis for
  
  // Dimensional match scores (0-100)
  skill_match: z.number().min(0).max(100),
  cultural_match: z.number().min(0).max(100),
  growth_potential: z.number().min(0).max(100),
  compensation_fit: z.number().min(0).max(100),
  location_suitability: z.number().min(0).max(100),
  
  // Overall compatibility
  overall_score: z.number().min(0).max(100),
  recommendation: z.enum(["apply_now", "strong_candidate", "moderate_fit", "stretch_goal", "skip"]),
  
  // Detailed analysis
  skill_gaps: SkillGapSchema.array(),
  strengths: z.string().array(),
  concerns: z.string().array(),
  negotiation_points: z.string().array(), // Things to negotiate in offer
  
  // Resume tailoring
  suggested_mask: z.string(), // Which persona to use
  key_points_to_emphasize: z.string().array(),
  areas_to_de_emphasize: z.string().array(),
  
  // Timeline
  analysis_date: z.date(),
  effort_estimate_minutes: z.number().min(0), // Estimated application time
  
  // Metadata
  notes: z.string().optional(),
  red_flags: z.string().array().optional(), // Cultural red flags, salary banding, etc.
});

export type CompatibilityAnalysis = z.infer<typeof CompatibilityAnalysisSchema>;

// Application management
export const ApplicationSchema = z.object({
  id: z.string().uuid(),
  job_id: z.string().uuid(),
  profile_id: z.string().uuid(),
  persona_id: z.string(), // Which mask was used
  
  status: z.enum([
    "draft",
    "submitted",
    "screening",
    "interview",
    "offer",
    "rejected",
    "withdrawn",
    "archived",
  ]),
  
  // Application components
  resume_version: z.string(),
  cover_letter: z.string(),
  custom_answers: z.record(z.string()).optional(), // Answers to custom questions
  
  // Timeline
  application_date: z.date(),
  response_date: z.date().optional(),
  follow_up_dates: z.date().array().optional(),
  
  // Interview tracking
  interviews: z.object({
    round: z.number(),
    type: z.enum(["phone", "video", "onsite", "take_home", "other"]),
    scheduled_date: z.date(),
    completed_date: z.date().optional(),
    notes: z.string().optional(),
  }).array().optional(),
  
  // Feedback
  rejection_reason: z.string().optional(),
  offer_details: z.object({
    title: z.string(),
    salary: z.number(),
    equity_percentage: z.number().optional(),
    sign_on_bonus: z.number().optional(),
    notes: z.string().optional(),
  }).optional(),
  
  // Assessment
  compatibility_analysis: CompatibilityAnalysisSchema.optional(),
  personal_notes: z.string().optional(),
  recommendation: z.enum(["strong_yes", "yes", "maybe", "no"]).optional(),
});

export type Application = z.infer<typeof ApplicationSchema>;

// Hunter Protocol search and filter
export const HunterSearchFilterSchema = z.object({
  // Keywords and content
  keywords: z.string().array(),
  exclude_keywords: z.string().array().optional(),
  
  // Location
  locations: z.string().array().optional(),
  remote_requirement: z.enum(["fully", "hybrid", "onsite", "any"]).optional(),
  
  // Role characteristics
  seniority_levels: z.enum(["junior", "mid", "senior", "lead", "director"]).array().optional(),
  employment_type: z.enum(["full-time", "contract", "temporary", "part-time"]).array().optional(),
  
  // Company
  company_sizes: z.enum(["startup", "scale-up", "mid-market", "enterprise"]).array().optional(),
  industries: z.string().array().optional(),
  company_age_years: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
  }).optional(),
  
  // Compensation
  min_salary: z.number().optional(),
  max_salary: z.number().optional(),
  currency: z.string().optional(),
  
  // Technology stack
  required_technologies: z.string().array().optional(),
  nice_to_have_technologies: z.string().array().optional(),
  
  // Compatibility thresholds
  min_compatibility_score: z.number().min(0).max(100).optional(),
  require_growth_opportunity: z.boolean().optional(),
  
  // Sources to search
  sources: z.enum(["linkedin", "indeed", "angellist", "wellfound", "other"]).array().optional(),
  
  // Posting recency
  posted_within_days: z.number().optional(),
});

export type HunterSearchFilter = z.infer<typeof HunterSearchFilterSchema>;

// Hunter Protocol agent task
export const HunterTaskSchema = z.object({
  id: z.string().uuid(),
  profile_id: z.string().uuid(),
  status: z.enum(["pending", "running", "completed", "failed", "paused"]),
  
  // Task configuration
  task_type: z.enum([
    "search_jobs",
    "analyze_compatibility",
    "generate_applications",
    "follow_up",
    "bulk_analysis",
  ]),
  
  search_filter: HunterSearchFilterSchema,
  
  // Progress
  created_at: z.date(),
  started_at: z.date().optional(),
  completed_at: z.date().optional(),
  progress_percent: z.number().min(0).max(100).optional(),
  
  // Results
  jobs_found: z.number().optional(),
  jobs_analyzed: z.number().optional(),
  applications_submitted: z.number().optional(),
  
  // Configuration
  auto_apply: z.boolean().default(false), // If true, automatically apply to strong matches
  compatibility_threshold: z.number().min(0).max(100).default(70),
  max_applications_per_day: z.number().default(5),
  
  // Error handling
  errors: z.object({
    message: z.string(),
    timestamp: z.date(),
    source: z.string(),
  }).array().optional(),
  
  // Metadata
  notes: z.string().optional(),
  cost_estimate_credits: z.number().optional(), // API calls estimation
});

export type HunterTask = z.infer<typeof HunterTaskSchema>;

// Hunter Protocol report/summary
export const HunterReportSchema = z.object({
  id: z.string().uuid(),
  profile_id: z.string().uuid(),
  period: z.object({
    start_date: z.date(),
    end_date: z.date(),
  }),
  
  // Search statistics
  searches_performed: z.number(),
  total_jobs_found: z.number(),
  jobs_analyzed: z.number(),
  applications_submitted: z.number(),
  
  // Quality metrics
  avg_compatibility_score: z.number().min(0).max(100),
  strong_matches_found: z.number(), // Score ≥ 80
  moderate_matches_found: z.number(), // Score 60-79
  
  // Outcome tracking
  applications_rejected: z.number(),
  interviews_scheduled: z.number(),
  offers_received: z.number(),
  offers_accepted: z.number(),
  
  // Top opportunities
  top_opportunities: z.object({
    job_id: z.string().uuid(),
    title: z.string(),
    company: z.string(),
    compatibility_score: z.number(),
    status: z.string(),
  }).array(),
  
  // Recommendations
  trending_skills: z.string().array(),
  growth_areas: z.string().array(),
  market_insights: z.string().array(),
  
  // Performance
  response_rate: z.number().min(0).max(100).optional(), // % of applications that got response
  interview_rate: z.number().min(0).max(100).optional(), // % of applications → interviews
  offer_rate: z.number().min(0).max(100).optional(), // % of interviews → offers
});

export type HunterReport = z.infer<typeof HunterReportSchema>;

// Export all types
export const HunterProtocolSchema = z.object({
  listings: JobListingSchema.array(),
  compatibilities: CompatibilityAnalysisSchema.array(),
  applications: ApplicationSchema.array(),
  tasks: HunterTaskSchema.array(),
  reports: HunterReportSchema.array(),
});

export type HunterProtocol = z.infer<typeof HunterProtocolSchema>;
