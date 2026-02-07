# Hunter Protocol User Guide

## Overview

Hunter Protocol is an autonomous job search engine that helps you discover opportunities
matched to your skills and automatically generates customized application materials.

Instead of manually searching job boards and writing resumes for each position,
Hunter Protocol:
- Analyzes your skills against target roles
- Searches job boards intelligently
- Ranks jobs by compatibility with your profile
- Generates tailored resumes (PRO+)
- Creates customized cover letters (PRO+)
- Optionally auto-submits applications (PRO+)

## Quick Start

### 1. Analyze Your Career Path

Start by analyzing skill gaps for your target role:

**Request:**
```bash
curl -X POST https://api.yourdomain.com/hunter/analyze-gap \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "targetRole": "Senior Software Engineer"
  }'
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "profileId": "profile_123",
    "targetRole": "Senior Software Engineer",
    "compatibility": 0.78,
    "gaps": [
      "Missing 2 years of distributed systems experience",
      "Need AWS certification",
      "Limited Kubernetes knowledge"
    ],
    "suggestions": [
      "Take AWS Solutions Architect course",
      "Contribute to open-source Kubernetes projects",
      "Lead a distributed systems project at current company"
    ]
  }
}
```

**Understanding the Response:**
- **compatibility** (0-1): How well you match the role (0.78 = 78%)
- **gaps**: Skill deficiencies preventing better matches
- **suggestions**: Actionable steps to close gaps

### 2. Find Matching Jobs

Search for jobs matching your criteria and interests:

**Request:**
```bash
curl -X POST https://api.yourdomain.com/hunter/find-jobs \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": ["TypeScript", "Node.js", "Distributed Systems"],
    "location": "Remote",
    "minSalary": 200000,
    "limit": 10
  }'
```

**Response:**
```json
{
  "ok": true,
  "data": [
    {
      "id": "job_001",
      "title": "Senior Backend Engineer",
      "company": "TechCorp",
      "score": 0.92,
      "location": "Remote",
      "salary": {
        "min": 220000,
        "max": 280000,
        "currency": "USD"
      },
      "description": "We're looking for a senior engineer...",
      "url": "https://techcorp.com/jobs/001"
    },
    {
      "id": "job_002",
      "title": "Platform Engineer",
      "company": "BigTech",
      "score": 0.87,
      ...
    }
  ]
}
```

**Results are ranked by score** (highest first). A score of 0.92 means the job
matches 92% of your skills and experience.

### 3. Tailor Your Resume (PRO+)

Generate a resume specifically optimized for your top match:

**Request:**
```bash
curl -X POST https://api.yourdomain.com/hunter/tailor-resume/job_001 \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "markdown",
    "highlightGaps": true
  }'
```

**What Hunter Does:**
- Extracts relevant experience from your profile
- Emphasizes skills matching the job description
- Reorders sections to highlight best fit
- Uses job-specific keywords for ATS systems

**Response includes:**
- Full resume content (ready to download/edit)
- Confidence score (0.85 = 85% match)
- Keyword matches from job description
- Suggestions for improvement

### 4. Create Cover Letter (PRO+)

Generate a personalized cover letter:

**Request:**
```bash
curl -X POST https://api.yourdomain.com/hunter/generate-letter/job_001 \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "professional",
    "tone": "formal"
  }'
```

**Template Options:**
- **professional**: Traditional business format (recommended)
- **creative**: More personal, less formal (startup culture)
- **direct**: Concise, action-focused (technical roles)
- **academic**: For research/academic positions

**Tone Options:**
- **formal**: Standard professional tone
- **conversational**: Friendly, approachable
- **enthusiastic**: Energetic, passionate

### 5. Submit Application

Submit your application (optionally auto-submitted):

**Request:**
```bash
curl -X POST https://api.yourdomain.com/hunter/submit-application/job_001 \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "autoSubmit": false
  }'
```

**What Happens:**
1. Hunter generates (or uses custom) resume
2. Hunter generates (or uses custom) cover letter
3. Application recorded in your dashboard
4. If autoSubmit=true: submitted to job board automatically (PRO+ only)

**Response:**
```json
{
  "ok": true,
  "data": {
    "submissionId": "app_1704067200_abc123def",
    "confirmationCode": "36O2WQL-FPX2KQR",
    "submitted": {
      "resume": true,
      "coverLetter": true,
      "autoSubmitted": false
    },
    "nextSteps": [
      "Your application has been recorded",
      "You will receive updates as hiring progresses",
      "View all applications in your dashboard"
    ]
  }
}
```

## Tier Comparison

| Feature | FREE | PRO | ENTERPRISE |
|---------|------|-----|------------|
| Skill Gap Analysis | ✅ Unlimited | ✅ Unlimited | ✅ Unlimited |
| Job Search | ✅ 5/month | ✅ Unlimited | ✅ Unlimited |
| Resume Tailoring | ❌ N/A | ✅ 5/month | ✅ Unlimited |
| Cover Letters | ❌ N/A | ✅ 3/month | ✅ Unlimited |
| Auto-Submit | ❌ N/A | ✅ 5/month | ✅ Unlimited |
| Dashboard | ✅ Limited | ✅ Full | ✅ Full |

## Common Workflows

### Workflow 1: Manual Application (All Tiers)

1. Analyze gap for target role
2. Find matching jobs
3. Submit application (Hunter records it)
4. Manually apply on job board using generated materials

**Quota Cost:** 1 search + materials (tailoring/letters only if PRO+)

### Workflow 2: Tailored Application (PRO)

1. Find matching jobs
2. For top 3 matches:
   - Tailor resume for each
   - Generate cover letter
   - Submit application (manual)
3. Manually apply on job boards
4. Track submissions in dashboard

**Quota Cost per job:** 1 search + 1 tailoring + 1 letter

### Workflow 3: Full Automation (PRO+)

1. Find matching jobs
2. For each job >= 0.80 compatibility:
   - Auto-submit application
   - Resume and cover letter generated automatically
3. Platform submits to job board on your behalf
4. Receive notifications as hiring progresses

**Quota Cost per job:** 1 search + 1 tailoring + 1 letter + 1 auto-submit

## Error Handling

### Quota Exceeded

If you hit a quota limit, you'll receive:

```json
{
  "ok": false,
  "error": "QUOTA_EXCEEDED",
  "message": "You have reached your monthly limit for resume tailoring",
  "context": {
    "feature": "resume_tailoring",
    "limit": 5,
    "used": 5,
    "remaining": 0,
    "resetsAt": "2024-02-01T00:00:00Z"
  }
}
```

**Solutions:**
- Wait for quota reset (monthly)
- Upgrade to PRO or ENTERPRISE tier
- Use custom materials instead of generating

### Feature Not Available

If you try to use a feature not in your tier:

```json
{
  "ok": false,
  "error": "FEATURE_NOT_AVAILABLE",
  "message": "Feature 'cover_letter_generation' is not available in FREE tier",
  "availableInTiers": ["PRO", "ENTERPRISE"]
}
```

**Solutions:**
- Upgrade your tier
- Manually write cover letter
- Use professional cover letter template

### Profile Not Found

If your profile hasn't been created:

```json
{
  "ok": false,
  "error": "NOT_FOUND",
  "message": "Profile not found"
}
```

**Solution:** Create profile first by signing up on the app

## Tips for Best Results

### Skill Gap Analysis
- Use specific job titles (not generic like "engineer")
- Include company context if known (e.g., "Senior Engineer at FinTech startup")
- Review suggestions regularly (update your profile to close gaps)

### Job Search
- Use 3-5 relevant keywords (more is not better)
- Specify location if you have constraints
- Filter by salary range to avoid unrealistic matches

### Resume Tailoring
- Always review generated resume before applying
- Edit to add specific accomplishments
- Use "highlightGaps: true" to see improvement areas

### Cover Letters
- Choose professional template unless targeting creative role
- Use "formal" tone for corporate, "enthusiastic" for startup
- Edit within 24-hour window to personalize

### Application Submission
- For first 5 applications, do manual review before submitting
- Monitor auto-submit results carefully
- Provide feedback to improve future matches

## FAQ

**Q: What data is used to analyze compatibility?**
A: Your profile (skills, experience, education) is compared against job requirements
using natural language processing and keyword matching.

**Q: Are cover letters generic or personalized?**
A: Each cover letter is personalized to the specific job and company. The generator
uses job description, required skills, and your background.

**Q: Can I edit generated materials?**
A: Yes! Download as markdown/PDF, edit manually, then submit custom version.

**Q: What's the difference between auto-submit and manual?**
A: Auto-submit (PRO+) sends application directly to job board. Manual allows you
to review and customize before submitting.

**Q: When do quotas reset?**
A: Monthly, on the same date as your billing cycle.

**Q: Can I change my tier anytime?**
A: Yes, upgrade or downgrade anytime. Changes take effect immediately.

## Support

- Dashboard: https://yourdomain.com/hunter
- API Docs: https://api.yourdomain.com/docs
- Support: support@yourdomain.com
