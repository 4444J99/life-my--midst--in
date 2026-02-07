# Hunter Protocol: Autonomous Job Search & Application

The Hunter Protocol is an autonomous job-searching agent that continuously monitors job boards, analyzes skill gaps, tailors resumes, and generates cover letters for job opportunities.

## Architecture

### Components

1. **SearchProvider** (`packages/core/src/search.ts`)
   - Abstract interface for job board integration
   - Concrete implementations: `SerperJobSearchProvider`, `MockJobSearchProvider`
   - Handles job discovery and metadata extraction

2. **HunterAgent** (`apps/orchestrator/src/agents/hunter.ts`)
   - Orchestrates the four core tools
   - Executes tasks asynchronously
   - Integrates with LLM for intelligent analysis

3. **JobHuntScheduler** (`apps/orchestrator/src/job-hunt-scheduler.ts`)
   - Manages recurring job hunts for multiple profiles
   - Supports configurable frequencies (daily, weekly, monthly)
   - Tracks execution history

4. **API Routes** (`apps/api/src/routes/jobs.ts`)
   - Job posting CRUD operations
   - Job application tracking
   - Webhook integration points

## Core Tools

### 1. find_jobs(keywords, location)

Searches for job postings matching the given criteria.

**Parameters:**
- `keywords` (string[]): Search terms (e.g., ["TypeScript", "React", "Engineer"])
- `location` (string, optional): Job location (e.g., "Remote", "San Francisco, CA")

**Returns:**
- Job postings with title, company, description, salary range, and URL

**Example Task:**
```json
{
  "id": "hunt-123",
  "role": "hunter",
  "description": "Search for TypeScript jobs in remote",
  "payload": {
    "profileId": "user-456",
    "action": "find_jobs",
    "keywords": ["TypeScript", "Senior Engineer"],
    "location": "Remote"
  }
}
```

### 2. analyze_gap(job_description, profile_id)

Analyzes the skill gap between job requirements and the user's profile.

**Parameters:**
- `jobDescription` (string): The full job posting text
- `profileId` (string): User profile ID

**Returns:**
```json
{
  "required": ["TypeScript", "React", "Node.js", "PostgreSQL"],
  "present": ["TypeScript", "React"],
  "missing": ["Node.js", "PostgreSQL"],
  "importance": "high"
}
```

**Importance Levels:**
- `critical`: More than 5 missing critical skills
- `high`: 3-5 missing skills
- `medium`: 1-2 missing skills
- `low`: No missing skills

### 3. tailor_resume(job_id, profile_id)

Selects the best identity mask and experience blocks to tailor the resume for a specific job.

**Parameters:**
- `jobPostingId` (string): The job posting ID
- `profileId` (string): User profile ID

**Returns:**
```json
{
  "maskId": "mask-789",
  "maskName": "Architect",
  "highlightedExperiences": ["exp-1", "exp-2", "exp-3"],
  "tailoringSummary": "This resume emphasizes your Architect aspects, highlighting 3 relevant experiences."
}
```

**Mask Selection Logic:**
- Matches job requirements against available masks
- Prioritizes masks with maximum skill overlap
- Preserves authenticity while optimizing presentation

### 4. write_cover_letter(job_id, profile_id)

Generates a personalized cover letter for the job opportunity.

**Parameters:**
- `jobPostingId` (string): The job posting ID
- `profileId` (string): User profile ID

**Returns:**
```json
{
  "applicationId": "app-999",
  "coverLetterLength": 2847,
  "preview": "Dear Hiring Manager, I am writing to express my strong interest in the Senior TypeScript Engineer position at TechCorp..."
}
```

**Cover Letter Generation:**
- Uses LLM (if available) for personalization
- Falls back to template if LLM unavailable
- Includes candidate name, relevant experience, and call-to-action

## Configuration

### Environment Variables

```bash
# Serper API for job search
SERPER_API_KEY=sk_...

# Job Hunt Scheduler
ORCH_JOB_HUNT_ENABLED=true
ORCH_API_BASE_URL=http://localhost:3001

# Agent Executor Mode (for cover letter/resume generation)
ORCH_AGENT_EXECUTOR=local  # or "oss", "stub", "none"

# LLM Configuration (for intelligent analysis)
LOCAL_LLM_API=ollama
LOCAL_LLM_URL=http://localhost:11434
LOCAL_LLM_MODEL=llama3.1:8b
LOCAL_LLM_MODEL_HUNTER=llama3.1:8b
```

### Programmatic Configuration

**Start Job Hunt for a Profile:**
```typescript
import { JobHuntScheduler } from "./job-hunt-scheduler";

const scheduler = new JobHuntScheduler(queue, store, runStore, {
  jobs: [
    {
      profileId: "user-123",
      keywords: ["TypeScript", "Senior Engineer"],
      location: "Remote",
      frequency: "weekly",
      autoApply: false,
      minSalary: 150000,
      maxSalary: 250000
    }
  ],
  apiBaseUrl: "http://localhost:3001"
});

scheduler.start();
```

**Check Status:**
```typescript
const status = scheduler.getStatus("user-123");
console.log(status);
// {
//   profileId: "user-123",
//   keywords: [...],
//   frequency: "weekly",
//   lastRun: "2024-01-15T10:30:00Z",
//   isActive: true
// }
```

## API Endpoints

### Job Postings

**Create Job Posting:**
```
POST /jobs/postings
Content-Type: application/json

{
  "profileId": "user-123",
  "title": "Senior TypeScript Engineer",
  "company": "TechCorp",
  "location": "Remote",
  "salaryRange": "$150k - $200k",
  "descriptionMarkdown": "..."
}
```

**List Job Postings:**
```
GET /jobs/postings?profileId=user-123&status=active
```

**Get Job Posting:**
```
GET /jobs/postings/{id}
```

### Job Applications

**Create Application:**
```
POST /jobs/applications
Content-Type: application/json

{
  "profileId": "user-123",
  "jobPostingId": "job-456",
  "status": "draft",
  "coverLetterMarkdown": "..."
}
```

**Get Applications:**
```
GET /jobs/applications?profileId=user-123&status=applied
```

**Update Application Status:**
```
PATCH /jobs/applications/{id}
Content-Type: application/json

{
  "status": "applied",
  "appliedAt": "2024-01-15T14:30:00Z"
}
```

## Integration Examples

### Example 1: Auto-Apply Workflow

```typescript
// 1. Schedule job hunts
const scheduler = new JobHuntScheduler(queue, store, runStore, {
  jobs: [
    {
      profileId: "user-123",
      keywords: ["TypeScript", "React"],
      location: "Remote",
      frequency: "daily",
      autoApply: true
    }
  ]
});
scheduler.start();

// 2. Worker processes hunter tasks
// 3. Results stored in database
// 4. Manual review workflow (or auto-apply if enabled)
```

### Example 2: Gap Analysis for Learning

```typescript
// Analyze what you need to learn for a dream job
const gapTask: AgentTask = {
  id: "gap-123",
  role: "hunter",
  description: "Analyze skill gap for dream job",
  payload: {
    profileId: "user-123",
    action: "analyze_gap",
    jobDescription: "... full job posting text ..."
  }
};

const result = await hunterAgent.execute(gapTask);
// Use result.output.missing to identify learning priorities
```

### Example 3: Resume Tailoring for Specific Role

```typescript
// Tailor resume for a specific job opportunity
const tailorTask: AgentTask = {
  id: "tailor-456",
  role: "hunter",
  description: "Tailor resume for TechCorp role",
  payload: {
    profileId: "user-123",
    action: "tailor_resume",
    jobPostingId: "job-789"
  }
};

const result = await hunterAgent.execute(tailorTask);
// Use result.output.maskId and highlightedExperiences to render custom resume
```

## Job Search Frequencies

### Daily
- High-frequency monitoring
- Best for: Active job search, competitive markets
- Use case: Looking for roles in hot markets (San Francisco, NYC)

### Weekly
- Balanced monitoring
- Best for: Steady job search, passive exploration
- Use case: Default setting, sustainable for background process

### Monthly
- Low-frequency monitoring
- Best for: Passive job monitoring
- Use case: Always-on but low noise level

## Error Handling

The Hunter agent gracefully handles common failure modes:

**Missing Profile:**
```json
{
  "status": "failed",
  "notes": "Could not fetch profile for gap analysis"
}
```

**API Connection Issues:**
```json
{
  "status": "failed",
  "notes": "Job search failed: connection timeout"
}
```

**Invalid Job Description:**
```json
{
  "status": "failed",
  "notes": "No job description provided for gap analysis"
}
```

Failures are tracked in run history but don't stop the scheduler from continuing.

## Data Models

### JobPosting
```typescript
interface JobPosting {
  id: string; // UUID
  profileId: string;
  title: string;
  company: string;
  descriptionMarkdown?: string;
  url?: string;
  salaryRange?: string;
  location?: string;
  vectors?: number[]; // For semantic search
  status: "active" | "closed" | "applied" | "ignored";
  createdAt: string; // ISO 8601
  updatedAt: string;
}
```

### JobApplication
```typescript
interface JobApplication {
  id: string; // UUID
  profileId: string;
  jobPostingId: string;
  status: "draft" | "applied" | "interviewing" | "offer" | "rejected" | "withdrawn";
  coverLetterMarkdown?: string;
  resumeSnapshotId?: string; // Reference to exported resume
  appliedAt?: string; // ISO 8601
  notes?: string; // User notes
  createdAt: string;
  updatedAt: string;
}
```

## Testing

### Unit Tests
```bash
# Test hunter agent
pnpm --filter @in-midst-my-life/orchestrator test -- hunter.test.ts

# Test job hunt scheduler
pnpm --filter @in-midst-my-life/orchestrator test -- job-hunt-scheduler.test.ts

# Test search providers
pnpm --filter @in-midst-my-life/core test -- search.test.ts
```

### Integration Tests
```bash
# Full job hunt workflow (requires live DB)
INTEGRATION_POSTGRES_URL=postgresql://... pnpm integration
```

## Future Enhancements

### Phase 1 (Current)
- ✅ Job discovery (Serper API)
- ✅ Skill gap analysis
- ✅ Resume tailoring
- ✅ Cover letter generation
- ✅ Job hunt scheduling

### Phase 2 (Planned)
- [ ] Auto-apply with CAPTCHA solving
- [ ] Application tracking (status updates via email)
- [ ] Interview preparation (mock interviews, Q&A)
- [ ] Multiple job board support (LinkedIn, Indeed, Glassdoor)
- [ ] Salary negotiation guidance

### Phase 3 (Future)
- [ ] Autonomous LinkedIn outreach
- [ ] Recruiter engagement automation
- [ ] Offer comparison and negotiation
- [ ] Post-hire onboarding assistance

## Troubleshooting

### "No keywords provided for job search"
Ensure `keywords` array is non-empty in the task payload.

### "Could not fetch profile for gap analysis"
Verify the `profileId` exists and is accessible. Check API connectivity.

### "Job search failed: connection timeout"
- Check Serper API key is valid
- Verify network connectivity
- Check rate limiting (Serper has API rate limits)

### Cover letters not generating
- Ensure LLM is running (if using local LLM)
- Check `ORCH_AGENT_EXECUTOR` configuration
- System will fall back to template if LLM unavailable

## Performance Considerations

- **Job Search**: ~500ms per search (Serper API)
- **Gap Analysis**: ~1-2s with LLM analysis
- **Resume Tailoring**: ~1-2s with LLM
- **Cover Letter**: ~3-5s with LLM generation

**Optimization Tips:**
- Use `MockJobSearchProvider` for testing
- Cache job postings to avoid duplicate searches
- Batch profile updates for multiple job applications
- Use weekly frequency by default to minimize API calls

## Security

- **API Keys**: Store `SERPER_API_KEY` in `.env` (never commit)
- **Rate Limiting**: Respect Serper API rate limits
- **Data Privacy**: Job applications stored in user's database
- **Resume Tailoring**: Never exposes raw profile data to external APIs

## Contributing

To extend the Hunter Protocol:

1. **Add new job board**: Implement `JobSearchProvider` interface
2. **Add new analysis tool**: Extend `HunterAgent` with new action
3. **Customize cover letters**: Override `generateCoverLetterTemplate()` method
4. **Add new mask logic**: Extend `tailorResume()` selection algorithm
