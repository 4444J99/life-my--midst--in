# Job Integration Guide

This guide explains how to set up real job data integration for the Hunter Protocol.

## Architecture Overview

The Hunter Protocol uses a pluggable job search provider architecture:

```
Web App (Job Search UI)
    ↓ HTTP
API Layer (apps/api)
    ↓ JobSearchProvider.search()
Core Layer (packages/core)
    ↓ createJobSearchProvider()
    ├─ Serper API (Real Jobs) ← Current Production
    ├─ Mock Provider (Development)
    └─ [TODO] LinkedIn, Indeed, etc.
```

## Current Support

### ✅ Production: Serper API

**Status:** Fully implemented and ready

**What it does:**
- Aggregates jobs from Google Jobs, LinkedIn, Indeed, and other sources
- Comprehensive search with keywords, location, job type filters
- Returns detailed job listings with salary info, company details, and posting dates

**Setup:**

1. **Get API Key:**
   - Visit [serper.dev](https://serper.dev)
   - Sign up for free account
   - Copy your API key from dashboard

2. **Set Environment Variable:**
   ```bash
   # In .env.local (development)
   SERPER_API_KEY=your_api_key_here

   # Or for production
   export SERPER_API_KEY=your_api_key_here
   ```

3. **Enable in API Service:**
   - The `JobSearchProvider` in `/apps/api/src/services/job-search-provider.ts` automatically detects the API key
   - If `SERPER_API_KEY` is set, real job data is used
   - Falls back to mock data if key is missing or API fails

4. **Verify Setup:**
   ```bash
   # Start the API
   pnpm --filter @in-midst-my-life/api dev

   # Test job search endpoint
   curl -X POST http://localhost:3001/profiles/{profileId}/hunter/search \
     -H "Content-Type: application/json" \
     -d '{
       "keywords": ["TypeScript", "React"],
       "locations": ["Remote"],
       "remote_requirement": "fully"
     }'
   ```

   Should return real jobs from Serper API instead of mock data.

## Development Workflow

### Development (Mock Data)
```bash
# No environment variables needed
# Use default mock jobs for testing
pnpm dev
```

### Testing with Serper
```bash
# Set API key
export SERPER_API_KEY=your_key_here

# Run tests
pnpm test

# Run integration tests
pnpm integration
```

### Production Deployment
```bash
# Set API key in production environment
# (via environment variables, secrets manager, etc.)

# Deploy normally
pnpm build && pnpm start
```

## Adding New Job Sources

### Overview

The architecture is designed for pluggable providers. To add LinkedIn, Indeed, or other sources:

1. **Create Provider Class** in `packages/core/src/job-providers/`:
   ```typescript
   // packages/core/src/job-providers/linkedin.ts

   import type { JobSearchService, HunterSearchFilter } from "../types";
   import type { JobListing } from "@in-midst-my-life/schema";

   export class LinkedInJobSearchProvider implements JobSearchService {
     name = "linkedin";
     private apiKey: string; // allow-secret

     constructor(apiKey: string) { // allow-secret
       this.apiKey = apiKey; // allow-secret
     }

     async search(filter: HunterSearchFilter): Promise<JobListing[]> {
       // Implementation: Call LinkedIn API, transform response
       // Return JobListing[]
     }
   }
   ```

2. **Update Factory** in `packages/core/src/hunter-protocol/job-search.ts`:
   ```typescript
   import { LinkedInJobSearchProvider } from "../job-providers/linkedin";

   export function createJobSearchProvider(useProduction = false): JobSearchService {
     if (useProduction) {
       const providers: JobSearchService[] = [];

       // Add Serper (existing)
       if (process.env['SERPER_API_KEY']) {
         providers.push(new ProductionJobSearchProvider(process.env['SERPER_API_KEY']));
       }

       // Add LinkedIn (new)
       if (process.env['LINKEDIN_API_KEY']) {
         providers.push(new LinkedInJobSearchProvider(process.env['LINKEDIN_API_KEY']));
       }

       // Add Indeed (new)
       if (process.env['INDEED_API_KEY']) {
         providers.push(new IndeedJobSearchProvider(process.env['INDEED_API_KEY']));
       }

       // Return aggregated provider if multiple sources
       if (providers.length > 1) {
         return new AggregatedJobSearchProvider(providers);
       }

       return providers[0] || new MockJobSearchProvider();
     }

     return new MockJobSearchProvider();
   }
   ```

3. **Implement Aggregation** in `packages/core/src/job-providers/aggregated.ts`:
   ```typescript
   export class AggregatedJobSearchProvider implements JobSearchService {
     name = "aggregated";

     constructor(private providers: JobSearchService[]) {}

     async search(filter: HunterSearchFilter): Promise<JobListing[]> {
       // Call all providers in parallel
       const results = await Promise.all(
         this.providers.map(p => p.search(filter).catch(() => []))
       );

       // Flatten and deduplicate by job URL
       const combined = results.flat();
       const seen = new Set<string>();

       return combined.filter(job => {
         if (seen.has(job.job_url)) return false;
         seen.add(job.job_url);
         return true;
       });
     }
   }
   ```

4. **Add Tests** in `packages/core/test/job-providers/linkedin.test.ts`:
   ```typescript
   describe("LinkedInJobSearchProvider", () => {
     it("searches for jobs", async () => {
       const provider = new LinkedInJobSearchProvider("test-key");
       const results = await provider.search({
         keywords: ["TypeScript"],
         locations: ["Remote"],
         remote_requirement: "fully"
       });

       expect(results.length).toBeGreaterThan(0);
       expect(results[0]).toHaveProperty("title");
       expect(results[0]).toHaveProperty("job_url");
     });
   });
   ```

5. **Update Environment**:
   ```bash
   # .env.local or production secrets
   SERPER_API_KEY=...
   LINKEDIN_API_KEY=...
   INDEED_API_KEY=...
   ```

### Recommended Provider Priority

1. **Serper API** (Recommended - Free tier available, aggregates multiple sources)
2. **LinkedIn** (Requires LinkedIn API access, best for tech roles)
3. **Indeed** (Largest job board, requires API agreement)
4. **AngelList** (Best for startups)
5. **Internal database** (Custom jobs from partner companies)

## API Contracts

### Job Search Endpoint

**Request:**
```bash
POST /profiles/{profileId}/hunter/search
Content-Type: application/json

{
  "keywords": ["TypeScript", "React"],
  "locations": ["Remote", "San Francisco"],
  "seniority_levels": ["senior", "staff"],
  "remote_requirement": "fully",
  "required_technologies": ["Node.js", "PostgreSQL"]
}
```

**Response:**
```json
{
  "jobs": [
    {
      "id": "job-123",
      "title": "Senior TypeScript Engineer",
      "company": "TechCorp",
      "location": "San Francisco, CA",
      "description": "We're looking for...",
      "requirements": "5+ years experience with...",
      "salary_min": 150000,
      "salary_max": 200000,
      "currency": "USD",
      "posted_date": "2024-01-15T10:30:00Z",
      "job_url": "https://serper.dev/jobs/...",
      "remote": "hybrid",
      "source": "serper",
      "company_industry": "Software",
      "company_size": "scale-up",
      "technologies": ["TypeScript", "React", "Node.js"]
    }
  ],
  "totalFound": 42,
  "searchDurationMs": 523
}
```

### Job Application Endpoint

**Request:**
```bash
POST /profiles/{profileId}/hunter/submit-application/{jobId}
Content-Type: application/json

{
  "autoSubmit": false,
  "customResume": "tailored resume markdown...",
  "customCoverLetter": "personalized cover letter...",
  "submissionType": "manual"
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "applicationId": "app-456",
    "jobId": "job-123",
    "status": "submitted",
    "submittedAt": "2024-01-15T11:45:00Z",
    "compatibilityScore": 0.85
  }
}
```

## Orchestrator Integration

The Orchestrator (background worker) automatically uses the configured providers:

```typescript
// apps/orchestrator/src/agents/hunter.ts

const jobSearchProvider = createJobSearchProvider(useProduction);

// Finds jobs using configured real/mock providers
async function findJobs(filter: HunterSearchFilter) {
  return await jobSearchProvider.search(filter);
}
```

No changes needed to Orchestrator - it automatically uses whatever provider is configured.

## Quota Management

The Hunter Protocol enforces feature quotas per subscription tier:

| Tier | Job Searches/Month | Auto-Apply Limit | Resume Tailoring |
|------|-------------------|------------------|------------------|
| FREE | 5 | 0 | 1/week |
| PRO | 50 | 20/week | Unlimited |
| ENTERPRISE | Unlimited | Unlimited | Unlimited |

Quotas are enforced at the API level before calling job providers.

## Error Handling

### Development (Mock Data)
- If real provider fails, automatically fallback to mock data
- No errors visible to user, seamless experience

### Production (Serper API)
- If Serper API is unavailable:
  1. Return cached results from database (if available)
  2. Fall back to mock data
  3. Log error for debugging

### Error Response Example
```json
{
  "ok": false,
  "error": "job_search_failed",
  "message": "Unable to search jobs at this time",
  "fallback": true,
  "fallbackReason": "Serper API timeout - using cached results"
}
```

## Performance Optimization

### Caching Strategy

Jobs are cached in Redis with TTL:
- Cache key: `hunter:search:{filter_hash}`
- TTL: 1 hour
- Invalidated on new search with same filters

### Batch Search

For batch auto-apply (up to 50 jobs):
1. Search once, cache results
2. Analyze each job in parallel (max 5 concurrent)
3. Submit applications in sequence (with 2-second delays)
4. Return summary with success/failure counts

## Monitoring & Debugging

### Check Provider Status
```bash
# Log shows which provider is active
pnpm dev 2>&1 | grep -i "job.*provider"
```

### Test API Key
```bash
# Verify Serper API key works
curl -X POST "https://google.serper.dev/search" \
  -H "X-API-KEY: $SERPER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"q": "TypeScript developer jobs", "type": "jobs"}'
```

### Debug Job Search
```bash
# Add logging to hunter service
NODE_DEBUG=*:hunter pnpm --filter @in-midst-my-life/api dev
```

## Future Enhancements

1. **Multi-source aggregation** - Combine Serper + LinkedIn + Indeed results
2. **Smart ranking** - ML-based job ranking beyond compatibility score
3. **Job alerts** - Notify user of new matching jobs
4. **Application tracking** - Track application status updates
5. **Company profiles** - Aggregate company info from Crunchbase, etc.
6. **Salary negotiations** - Suggest negotiation strategies based on market data

## Support

- **Documentation:** See `/docs` directory
- **Issues:** Report on GitHub
- **Serper API Docs:** https://serper.dev/docs
- **Examples:** Check `/apps/api/test/hunter-protocol.integration.test.ts`
