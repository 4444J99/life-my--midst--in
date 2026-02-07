# Hunter Protocol Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                      │
│         Pricing → Checkout → Dashboard → Hunter UI          │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway (Fastify)                     │
│  Auth → Request Validation → Routing → Response Formatting  │
└────────────┬────────────────┬────────────────┬──────────────┘
             │                │                │
             ▼                ▼                ▼
   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
   │   Billing    │   │   Licensing  │   │   Hunter     │
   │   Service    │   │   Service    │   │   Service    │
   └──────┬───────┘   └──────┬───────┘   └──────┬───────┘
          │                  │                  │
          │                  │                  │
   ┌──────▼──────────────────▼──────────────────▼─────┐
   │          Repository Layer (Data Access)         │
   │  Subscriptions  │  RateLimits  │  Jobs  │ ... │
   └──────┬──────────────────┬──────────────────┬─────┘
          │                  │                  │
          └──────┬───────────┴──────────────┬──┘
                 ▼                          ▼
        ┌──────────────────┐        ┌──────────────────┐
        │   PostgreSQL     │        │   Redis (Cache)  │
        │  (Subscriptions, │        │ (Job Rankings,   │
        │   Jobs, Apps)    │        │  Session Tokens) │
        └──────────────────┘        └──────────────────┘
```

## Core Services

### 1. Hunter Service

**Location:** `apps/api/src/services/hunter.ts`

**Responsibilities:**
- Analyze skill gaps (analyzeGap)
- Search and rank jobs (findJobs)
- Tailor resumes (tailorResume)
- Generate cover letters (generateCoverLetter)
- Orchestrate applications (submitApplication)

**Dependencies:**
- ProfileRepository - Access user profile data
- JobRepository - Access job listings
- SubscriptionRepository - Check user tier
- LicensingService - Enforce quotas
- DocumentGenerator - Create documents

**Key Methods:**

```
analyzeGap(profileId, targetRole)
  → Fetch profile
  → Call CompatibilityAnalyzer
  → Return CompatibilityReport

findJobs(profileId, criteria)
  → Enforce quota (checkAndConsume)
  → Search job provider
  → Rank by compatibility
  → Return RankedJob[]

tailorResume(profileId, jobId)
  → Enforce quota (resume_tailoring)
  → Fetch profile + job
  → Generate tailored document
  → Return TailoredResume

generateCoverLetter(profileId, jobId)
  → Check tier availability
  → Enforce quota (cover_letter_generation)
  → Fetch profile + job
  → Generate personalized letter
  → Return GeneratedCoverLetter

submitApplication(profileId, jobId)
  → Fetch profile + job
  → Check auto-apply availability
  → Generate materials (or use custom)
  → Persist submission record
  → Return ApplicationSubmissionResult
```

### 2. Licensing Service

**Location:** `packages/core/src/licensing/licensing-service.ts`

**Responsibilities:**
- Check quota availability
- Consume quota (atomic increment)
- Track usage per feature per user
- Get tier entitlements

**Quota System:**

```typescript
FREE Tier:
- hunter_job_searches: 5/month
- resume_tailoring: 0
- cover_letter_generation: 0
- auto_apply: 0

PRO Tier:
- hunter_job_searches: unlimited
- resume_tailoring: 5/month
- cover_letter_generation: 3/month
- auto_apply: 5/month

ENTERPRISE Tier:
- All features: unlimited
```

**Atomic Quota Enforcement:**

```sql
-- PostgreSQL ON CONFLICT for atomic increment
INSERT INTO rate_limits (profile_id, feature, month, usage)
VALUES ($1, $2, $3, 1)
ON CONFLICT (profile_id, feature, month)
DO UPDATE SET usage = usage + 1
RETURNING usage;
```

Ensures concurrent requests don't bypass quota.

### 3. Job Search Provider

**Location:** `apps/api/src/services/job-search-provider.ts`

**Responsibilities:**
- Search job listings by criteria
- Interface with job board APIs (LinkedIn, Indeed, etc.)
- Mock provider for development

**Current State:** Mock provider with hardcoded jobs

**Future Integration:**

```typescript
// LinkedIn API
async linkedinSearch(criteria) {
  const client = new LinkedInClient(this.config.linkedinApiKey);
  return await client.search(criteria);
}

// Indeed API
async indeedSearch(criteria) {
  return await axios.get('https://indeed.com/api/search', {
    params: {
      q: criteria.keywords.join(' '),
      l: criteria.location
    }
  });
}

// Google Jobs API
async googleJobsSearch(criteria) {
  // Parse Google Jobs SERP results
}
```

### 4. Document Generator

**Location:** `packages/core/src/hunter-protocol/document-generator.ts`

**Responsibilities:**
- Generate tailored resumes
- Generate personalized cover letters
- Support multiple formats (Markdown, PDF, DOCX)

**Algorithm:**

```
Resume Tailoring:
1. Extract user's experience/skills/education
2. Parse job description (NLP)
3. Extract required keywords
4. Rank user's content by relevance to job
5. Reorder sections (most relevant first)
6. Emphasize matching skills
7. Calculate confidence score
8. Return formatted document

Cover Letter Generation:
1. Extract hiring manager name (if available)
2. Identify company culture indicators
3. Match user's experience to job requirements
4. Compose personalized narrative
5. Include specific accomplishments
6. Apply tone/template styling
7. Return formatted document
```

## Data Models

### Job Listing

```typescript
interface Job {
  id: string;
  title: string;
  company: string;
  description: string;
  requiredSkills: string[];
  location: string;
  salary: {
    min: number;
    max: number;
    currency: string;
  };
  postDate: Date;
  url: string;
  source: 'linkedin' | 'indeed' | 'company' | 'other';
  hiringManager?: string;
}
```

### Application Submission

```typescript
interface ApplicationSubmission {
  id: string;
  profileId: string;
  jobId: string;
  resume: string;
  coverLetter: string;
  submittedAt: Date;
  status: 'submitted' | 'reviewing' | 'rejected' | 'accepted';
  submissionType: 'manual' | 'auto';
  confirmationCode: string;
  appliedVia?: string;
}
```

### Rate Limit (Quota)

```typescript
interface RateLimit {
  profileId: string;
  feature: 'hunter_job_searches' | 'resume_tailoring' | 'cover_letter_generation' | 'auto_apply';
  month: Date; // First day of month
  usage: number;
  limit: number;
}
```

## Quota Enforcement Flow

```
┌──────────────────────────────────┐
│  User Initiates Action           │
│  (findJobs, tailorResume, etc)   │
└──────────────┬───────────────────┘
               │
               ▼
    ┌──────────────────────┐
    │ Get User Subscription│
    │ (to determine tier)  │
    └──────────┬───────────┘
               │
               ▼
    ┌──────────────────────────────┐
    │ Check Feature Availability   │
    │ in Tier (e.g., cover letters │
    │ not available in FREE)       │
    └──────────┬───────────────────┘
               │ Available?
          ┌────┴────┐
          │          │
         Yes         No ────→ FeatureNotAvailableError
          │
          ▼
    ┌──────────────────────────────┐
    │ Call checkAndConsume()       │
    │ (atomic increment via        │
    │ PostgreSQL ON CONFLICT)      │
    └──────────┬───────────────────┘
               │
               ▼
    ┌──────────────────────────────┐
    │ Within Quota?                │
    └──────────┬───────────────────┘
               │
          ┌────┴────┐
          │          │
         Yes         No ────→ QuotaExceededError
          │
          ▼
    ┌──────────────────────┐
    │ Proceed with Action  │
    │ (e.g., generate      │
    │ resume, submit job)  │
    └──────────────────────┘
```

## Scaling Considerations

### Current (Phase 1)
- Single PostgreSQL instance
- InMemory repositories for testing
- Mock job provider

### Phase 2 Improvements
- **Connection Pooling:** PgBouncer for PostgreSQL
- **Caching Layer:** Redis for job rankings, user profiles
- **Search Optimization:** Elasticsearch for job search (100k+ jobs)
- **Async Processing:** Bull queue for resume/letter generation
- **Rate Limiting:** Distributed rate limiter (Redis-based)

### Phase 3+ (High Scale)
- **Microservices:** Separate Hunter, Billing, User services
- **Event Streaming:** Kafka for job events, application tracking
- **Data Warehouse:** Snowflake for analytics
- **API Gateway:** Kong or Ambassador for routing
- **CDN:** CloudFront for static assets

## Security

### Authentication
- JWT tokens (expires in 24 hours)
- Refresh tokens for session extension
- User ownership validation on all operations

### Authorization
- Role-based access control (user vs admin)
- Ownership checks (user can only access own data)
- Tier-based feature access (quota system)

### Data Protection
- Passwords hashed with bcrypt
- Sensitive data encrypted at rest (profile details)
- HTTPS for all API calls
- CORS configured for production domains
- SQL injection prevention (parameterized queries)

### Audit Trail
- All quota consumptions logged
- Application submissions tracked with confirmation codes
- Failed attempts recorded for security analysis

## Performance

### Query Optimization
- Indexes on: profile_id, job_id, user_id, feature, month
- Foreign key relationships indexed
- Job search results paginated (20 per page)

### Caching
- Job search results cached 1 hour (Redis)
- User profiles cached 30 minutes
- Tier/quota info cached 5 minutes

### Concurrency
- Rate limits use PostgreSQL ON CONFLICT (atomic)
- Job updates use optimistic locking
- No N+1 queries (eager loading)

## Monitoring

### Metrics
- Job search latency (p50, p99)
- Resume generation time
- Quota consumption rate
- Application submission success rate
- Error rates by type

### Logging
- Structured JSON logging
- Correlation IDs for request tracing
- Error severity levels (INFO, WARN, ERROR)

### Alerts
- Quota enforcement failures
- Job API integration errors
- Generation service slowdowns
- High error rates (>5% of requests)
