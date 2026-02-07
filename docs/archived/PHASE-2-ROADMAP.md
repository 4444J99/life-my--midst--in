# Phase 2 Roadmap (90 Days)

> **⚠️ ARCHIVED — HISTORICAL SNAPSHOT**
> This roadmap was written after Phase 1 completion. All Phase 2 epics
> (Stripe billing, job search integration, document generation) are now
> complete. See
> [`docs/FEATURE-AUDIT.md`](../FEATURE-AUDIT.md) for current state.

## Overview

Phase 1 established the core Hunter Protocol with mock Stripe integration.
Phase 2 focuses on production hardening, real job integrations, and autonomous
agent execution.

**Timeline:** 90 days starting after Phase 1 completion + Stripe integration (Week 2)

**Team:** 2-3 engineers

**Goal:** Production-ready autonomous job search with real job board integrations

---

## Phase 2 Epics

### EPIC 1: Real Stripe Integration (Weeks 1-2)

**Objective:** Replace mock Stripe with production SDK

**Tasks:**
1. Install Stripe SDK: `pnpm add stripe`
2. Replace mock implementations in BillingService
3. Implement real webhook signature verification
4. Test with Stripe test card (4242 4242 4242 4242)
5. Deploy to staging, verify payment flow
6. Configure production Stripe credentials
7. Build retry logic for webhook delivery failures
8. Document PCI scope changes for compliance

**Acceptance Criteria:**
- Real payment flow works end-to-end
- Webhooks verified and processed correctly
- Subscriptions updated on payment success
- Customer emails notified on charges
- Test with 5 real payment scenarios
- Billing dashboard reflects Stripe status

**Owner:** TBD

---

### EPIC 2: Job Board Integrations (Weeks 2-4)

**Objective:** Integrate real job APIs (LinkedIn, Indeed, Google)

**LinkedIn Integration:**
1. Obtain LinkedIn API credentials (developer program)
2. Implement linkedinSearch() in JobSearchProvider
3. Parse LinkedIn job format to standard schema
4. Handle rate limiting (1000 req/day)
5. Test with 100 sample searches
6. Cache responses to minimize calls
7. Monitor latency per request

**Indeed Integration:**
1. Implement indeedSearch() via Indeed API or scraping
2. Parse Indeed listings
3. Extract salary ranges (often missing)
4. Handle geographic differences
5. Normalize job IDs to dedupe
6. Validate remote vs on-site flags

**Google Jobs Integration:**
1. Parse Google Jobs SERP results
2. Extract standardized job data
3. Handle geographic/industry filtering
4. Respect robots.txt and terms of use
5. Maintain fallback dataset in case of blocking

**Acceptance Criteria:**
- LinkedIn: 50+ real jobs returned per search
- Indeed: 50+ real jobs returned per search
- Google: 30+ real jobs returned per search
- Deduplication across sources
- 99% uptime for integrations
- Integration health dashboard (response rates, failures)

**Owner:** TBD

---

### EPIC 3: Document Generation Improvements (Weeks 3-5)

**Objective:** Enhance resume/letter generation with ML

**Current State:** Template-based generation

**Improvements:**
1. Fine-tuned ML model for resume optimization
   - Uses company/industry context
   - Learns from successful applications
   - Achieves >0.9 compatibility scores
2. Cover letter personalization
   - Hiring manager name detection
   - Company culture analysis
   - Industry-specific language
3. Format improvements
   - PDF generation with formatting
   - DOCX export with templates
   - ATS-optimized formatting
4. Multi-language support
   - English ✅
   - Spanish, French, German, Mandarin
   - Maintains formatting across languages
5. Accessibility checks on generated documents
6. Document diffing to track changes over time

**Acceptance Criteria:**
- Compatibility scores consistently >0.85
- 95% of applicants report quality as "good" or "excellent"
- PDF/DOCX export works perfectly
- Multi-language generation working
- Document versions archived for review

**Owner:** TBD

---

### EPIC 4: Auto-Apply Automation (Weeks 4-6)

**Objective:** Fully automated application submission to job boards

**Current State:** Applications recorded locally, manual external submission

**Improvements:**
1. LinkedIn automated apply
   - Parse LinkedIn apply button
   - Auto-fill profile information
   - Auto-upload resume
   - Submit on user's behalf
2. Indeed Easy Apply
   - Detect Indeed Easy Apply button
   - Auto-fill application form
   - Submit with generated resume
3. Company website applications
   - Parse custom application forms
   - Detect required vs optional fields
   - Fill contact info, resume, cover letter
   - Submit via form POST
4. Application tracking
   - Record submission status in DB
   - Receive email notifications
   - Link incoming emails to applications
   - Track response rate
5. Fallback queues for failed submissions
6. Retry policies with exponential backoff

**Acceptance Criteria:**
- 90% of LinkedIn Easy Applies work
- 85% of Indeed Easy Applies work
- 70% of company websites work
- All submissions tracked correctly
- Email notifications working
- Failed submissions alerted to ops team

**Owner:** TBD

---

### EPIC 5: Advanced Ranking Algorithm (Weeks 5-7)

**Objective:** ML-based job matching with user feedback loop

**Current State:** Keyword-based compatibility scoring

**Improvements:**
1. Feedback loop
   - User rates applications (liked, rejected, etc.)
   - Rejected applications: learn what to avoid
   - Liked applications: learn what to prioritize
2. Contextual ranking
   - Company culture fit (public data + ML)
   - Career growth opportunity (based on role)
   - Work-life balance (based on company reviews)
   - Commute time (if not remote)
3. Personalization
   - Learn individual preferences
   - Adjust ranking algorithm per user
   - A/B test ranking strategies
4. Explainability
   - Show why job was ranked high/low
   - Highlight matching vs missing skills
   - Suggest actions to improve match score
5. Bias detection and mitigation
6. Per-industry tuning knobs

**Acceptance Criteria:**
- Feedback collected on 80%+ of applications
- Ranking algorithm improves with feedback
- Explainability scores improve user satisfaction
- A/B tests show 15%+ improvement in quality
- Bias monitoring dashboards (per demographic)

**Owner:** TBD

---

### EPIC 6: Autonomous Agent (Weeks 6-9)

**Objective:** Background job searching and application without user intervention

**Current State:** User-initiated searches and applications

**Improvements:**
1. Background searcher
   - Periodic job searches (daily/hourly)
   - Automatic job updates via email
   - Only notify user of high-match jobs (>0.85)
2. Autonomous application
   - Auto-submit when score >0.90
   - User can set frequency (10/day, 20/day, etc.)
   - Pause/resume via dashboard
   - Explainable decisions (why was this submitted)
3. Workflow automation
   - Update resume based on new experience
   - Refresh skills on profile updates
   - Adjust target roles based on feedback
4. Intelligent job filtering
   - Automatically reject low matches
   - Flag promising opportunities
   - Predict offer likelihood
5. Audit trail for automated applications
6. Opt-out controls for users

**Acceptance Criteria:**
- Background searches run daily
- Auto-submissions working >95% of time
- Users trust autonomous decisions
- Adjustable automation level (manual → full auto)
- Opt-out preferences respected

**Owner:** TBD

---

### EPIC 7: Dashboard & Analytics (Weeks 7-9)

**Objective:** User-facing analytics and application tracking

**Deliverables:**
1. Application dashboard
   - All submissions with status
   - Timeline view
   - Filter by status, date, company
   - Download application materials
2. Analytics dashboard
   - Applications per day/week/month
   - Success rate by company/industry/role
   - Average time to response
   - Offer rate (if integrated with email)
   - Salary insights (aggregate data)
3. Recommendations
   - Industries with best match scores
   - Companies with most applications
   - Skills most in-demand
   - Suggested target roles
4. Export & reporting
   - Monthly report (PDF)
   - CSV export of applications
   - Integration with job search tools
5. Mobile-friendly summary widget
6. Notification center with insights

**Acceptance Criteria:**
- Dashboard loads <2s
- Analytics accurate
- Users find insights valuable
- Export features working
- Mobile widget approved by design

**Owner:** TBD

---

### EPIC 8: Production Hardening (Weeks 8-9)

**Objective:** Security, performance, reliability for production

**Tasks:**
1. Security
   - Penetration testing
   - Vulnerability scan (OWASP Top 10)
   - Secrets rotation (Stripe keys, API keys)
   - Rate limiting (anti-bot, anti-abuse)
   - GDPR compliance audit
2. Performance
   - Load testing (1000 concurrent users)
   - Database optimization
   - Cache strategy verification
   - CDN configuration
   - API response time <200ms p95
3. Reliability
   - High availability setup
   - Database replication
   - Automated backups
   - Disaster recovery plan
   - Monitoring/alerting setup
4. Operations
   - Deployment runbooks
   - Rollback procedures
   - On-call setup
   - Incident response plan
   - Chaos engineering drill

**Acceptance Criteria:**
- Security audit: 0 critical, 0 high findings
- Performance: p95 <200ms
- Uptime SLA 99.9%
- All operational runbooks complete
- Chaos drill executed with <2h recovery time

**Owner:** DevOps

---

## Detailed Breakdown by Week

### Week 1-2: Stripe Integration + Job Integrations Prep
- [ ] Real Stripe SDK integrated
- [ ] Staging deployment verified
- [ ] LinkedIn API credentials obtained
- [ ] Indeed API evaluation
- [ ] Google Jobs feasibility study
- [ ] Billing security review completed
- [ ] Data contracts for job providers defined

### Week 3-4: Job Integrations
- [ ] LinkedIn integration complete
- [ ] Indeed integration complete
- [ ] Test suite (100 jobs per source)
- [ ] Deduplication logic
- [ ] Staging deployment
- [ ] Caching layer for search responses
- [ ] Logging for each integration

### Week 5-6: Document Generation + Auto-Apply
- [ ] Enhanced resume generation
- [ ] Cover letter improvements
- [ ] LinkedIn auto-apply working
- [ ] Indeed auto-apply working
- [ ] Company form auto-fill (top 10 companies)
- [ ] ML model training pipeline baked
- [ ] Auto-submit audit trail in place

### Week 7-8: Advanced Ranking + Analytics
- [ ] ML-based ranking algorithm
- [ ] User feedback collection
- [ ] Dashboard analytics implementation
- [ ] Application tracking UI
- [ ] Email notifications
- [ ] Explainability view ready
- [ ] Bias and fairness reports

### Week 9-10: Autonomous Agent + Hardening
- [ ] Background job searcher
- [ ] Autonomous application logic
- [ ] Security audit completed
- [ ] Performance optimized
- [ ] Production deployment
- [ ] Chaos engineering exercise
- [ ] MDR runbook rehearsed

---

## Success Metrics

### Functional Success
- 100+ real jobs found per search
- 90%+ auto-submit success rate
- <200ms API response times
- >0.85 average compatibility score
- ML-guided suggestions improve match rates

### User Success
- 30+ applications submitted per user/month
- 15%+ response rate (offers + interviews)
- 80%+ user satisfaction (NPS >50)
- <30 days average time to offer
- Dashboard engagement > 60% per active user

### Business Success
- 10,000+ PRO/ENTERPRISE users by end of Phase 2
- $50K+ MRR
- <$10 CAC
- >60% month 1 retention
- Gross margin > 70%

---

## Dependencies & Blockers

**External Dependencies:**
- LinkedIn API approval (4-6 weeks)
- Indeed API access
- Stripe production account
- Carrier for email notifications
- Cloud provider quotas (apps/api, orchestrator)

**Technical Dependencies:**
- Job scraping/API infrastructure ready
- ML model training data collected
- Autonomous agent framework chosen (Langchain/AutoGPT)
- Redis cluster for caching
- Monitoring stack (Grafana, Loki) integrated

**Team Dependencies:**
- ML engineer for ranking algorithm
- Scraping/data engineer for job integrations
- DevOps engineer for production setup
- QA engineer for automation and regression

---

## Appendix: Technology Decisions

### Job Integration Method
**Decision:** Mix of APIs and smart scraping
- LinkedIn: Official API when approved, otherwise scraping
- Indeed: Official API for easy apply, scraping for other
- Google: SERP scraping (lowest friction)
- Backup dataset for offline testing

### Document Generation
**Decision:** Template-based initially, ML fine-tuning in Phase 3
- Phase 2: Improve templates, add formatting
- Phase 3: Fine-tuned model for optimal generation
- Document correctness validation in renderer

### Auto-Apply
**Decision:** Hybrid approach (API + form auto-fill)
- LinkedIn: Native API when available
- Indeed: Form automation via Puppeteer/Playwright
- Generic forms: Parse + fill via AI

### Autonomous Agent Framework
**Decision:** Custom event-driven system (vs LangChain)
- Rationale: Better control, cost optimization, transparency
- Fallback: Evaluate LangChain agents if custom too complex
- Observability is baked into event stream

---

## Observability & Feedback Loops

1. Create multi-source dashboards: integration health, quota exhaustion, document pipeline latency.
2. Feed telemetry into ranking models, so slow searches penalize future recommendations.
3. User-facing feedback buttons right within dashboard to drive ranking adjustments.
4. Alerting rules for quota exhaustion spikes, auto-apply failures, and ML pipeline freshness.

## Risk Mitigation

1. Build dual-path job search: provider + cached dataset, to avoid outages.
2. Implement circuit breaker around auto-apply to pause after repeated failures.
3. Maintain manual override for document generation in case ML drift occurs.
4. Keep backup Stripe keys and test migrations for rolling out new plans.
