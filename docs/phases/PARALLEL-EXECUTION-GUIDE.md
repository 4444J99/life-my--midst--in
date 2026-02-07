# Parallel Execution Guide: 3-5 AI Assistants Working Simultaneously

This guide sections off the 140 EU unified roadmap into **independent work streams** that can be executed in parallel by up to 5 AI assistants without blocking each other.

---

## Phase-Based Parallelization

### **PHASE 0: Philosophical Completion** (Weeks 1-2, 12 EU)
**Status**: MUST complete before Phases 1-6
**Parallelization**: 2 AI assistants (independent streams)

#### Stream 0A: Hunter Protocol Completion (6 EU)
**Assistant**: AI #1 (Core/Backend specialist)
**Focus**: Job search automation
**Independent**: YES - does not block other streams
**Tasks**:
1. Implement `packages/core/src/search/google-jobs.ts` (Serper API integration)
2. Complete `apps/orchestrator/src/agents/hunter.ts` (find/analyze/tailor/write tools)
3. Wire `apps/orchestrator/src/repositories/ingestion.ts` (job ingestion pipeline)
4. Test: find 20 jobs → analyze → tailor resume (per mask) → generate cover letter
**Deliverable**: Fully functional Hunter Protocol with end-to-end testing
**Success Criteria**:
- ✅ Search provider finds jobs with keywords + location
- ✅ Analyzer identifies skill gaps (RAG-based)
- ✅ Tailor customizes resume per selected mask
- ✅ Cover letter generator produces markdown

#### Stream 0B: Theatrical UI Polish (6 EU)
**Assistant**: AI #2 (Frontend specialist)
**Focus**: Theatrical identity visualization
**Independent**: YES - does not block other streams
**Tasks**:
1. Build `apps/web/src/components/TabulaPersonarum.tsx` (mask registry CRUD UI)
2. Implement `apps/web/src/components/ScaenaeFilter.tsx` (stage-based visibility toggle)
3. Create `apps/web/src/components/AetasTimeline.tsx` (interactive D3 life-stage visualization)
4. Polish mask transition animations + theatrical metadata display
5. Test: Create mask → Edit attributes → Toggle visibility → See timeline evolution
**Deliverable**: Complete theatrical UI components
**Success Criteria**:
- ✅ Tabula personarum editor allows mask creation with all attributes (name, tone, visibility)
- ✅ Scaenae filtering shows/hides masks by stage (Academica, Technica, Artistica, etc.)
- ✅ Aetas timeline shows life-stage progression with mask-specific narratives
- ✅ Transitions are smooth, theatrical (stage curtain animations?)

---

### **PHASE 1: Monetization Foundation** (Weeks 2-4, 21 EU)
**Status**: Can start Week 2 (parallel with Phase 0)
**Parallelization**: 2-3 AI assistants (mostly independent)

#### Stream 1A: Stripe Integration (8 EU)
**Assistant**: AI #1 (Backend specialist)
**Focus**: Payment infrastructure
**Independent**: YES - Blocking point for other Phase 1 tasks (1B, 1D)
**Tasks**:
1. Install `@stripe/stripe-js`, `stripe` packages
2. Create `apps/api/src/routes/stripe.ts` (checkout, webhooks, portal endpoints)
3. Create `apps/api/src/services/billing.ts` (subscription sync, status management)
4. Add `subscriptions` table migration
5. Test: Create checkout → Complete payment → Verify webhook sync
**Deliverable**: Stripe integration ready for feature gating
**Success Criteria**:
- ✅ Checkout endpoint creates Stripe session
- ✅ Webhook endpoint receives subscription events
- ✅ Portal endpoint redirects to Stripe customer dashboard
- ✅ Database syncs subscription status

#### Stream 1B: Feature Gate System (6 EU)
**Assistant**: AI #3 (Schema/Core specialist)
**Focus**: Entitlements logic
**Blocks**: 1D (needs schema extension)
**Blocked by**: 1A (needs subscription data)
**Tasks**:
1. Extend `packages/schema/src/profile.ts` with `subscription_tier` field
2. Create `apps/api/src/services/entitlements.ts` (canUsePremiumFeature logic)
3. Create `apps/api/src/middleware/feature-gate.ts` (protect endpoints)
4. Create `apps/web/src/hooks/useEntitlements.ts` (client-side checks)
5. Test: Free user → Blocked from Hunter Protocol → Upgrade → Access granted
**Deliverable**: Feature gates protecting premium endpoints
**Success Criteria**:
- ✅ Free users see upgrade prompts on premium features
- ✅ After upgrade, users access gated features
- ✅ API returns 403 if subscription check fails
- ✅ Frontend can query entitlements before rendering

#### Stream 1C: Pricing Tiers & Documentation (2 EU)
**Assistant**: AI #2 (Documentation specialist)
**Focus**: Pricing strategy
**Independent**: YES - informational only
**Tasks**:
1. Create `docs/PRICING.md` with tier definitions:
   - Free: 1 profile, 3 masks, standard exports, no Hunter Protocol
   - Artisan ($19/mo): Unlimited masks, Hunter Protocol, custom PDF, scaenae filtering
   - Dramatist ($49/mo): 5 profiles, shared masks, analytics, white-label exports
2. Document feature inclusion per tier
3. Create comparison table
**Deliverable**: Pricing strategy document
**Success Criteria**:
- ✅ Tiers clearly defined
- ✅ Features mapped to tiers
- ✅ Pricing aligns with theatrical philosophy

#### Stream 1D: Billing UI (5 EU)
**Assistant**: AI #2 (Frontend specialist)
**Blocked by**: 1A (Stripe), 1B (entitlements)
**Tasks**:
1. Create `apps/web/app/billing/page.tsx` (subscription management)
2. Create `apps/web/src/components/PlanSelector.tsx` (pricing display)
3. Create `apps/web/src/components/SubscriptionStatus.tsx` (current plan info)
4. Create `apps/web/src/components/InvoiceHistory.tsx` (invoice download)
5. Create `apps/web/src/components/UpgradeButton.tsx` (checkout trigger)
6. Test: View plans → Click upgrade → Checkout → Verify in billing page
**Deliverable**: Complete billing interface
**Success Criteria**:
- ✅ Plans display with feature comparison
- ✅ Upgrade button triggers Stripe checkout
- ✅ Billing page shows current subscription
- ✅ Invoice history works

---

### **PHASE 2: Deployment Infrastructure** (Weeks 3-6, 18 EU)
**Status**: Can start Week 3 (parallel with Phase 1)
**Parallelization**: 3 AI assistants (mostly independent)

#### Stream 2A: Vercel Setup (6 EU)
**Assistant**: AI #1 (DevOps specialist)
**Focus**: Cloud deployment
**Independent**: Mostly YES (slight dependency on Env setup)
**Tasks**:
1. Create Vercel project, link GitHub
2. Configure `vercel.json` (Next.js web, Fastify API routing)
3. Set environment variables in Vercel (DATABASE_URL, REDIS_URL, STRIPE_KEYS)
4. Link custom domain
5. Configure preview deployments
6. Test: Push to branch → Preview deploy → Verify endpoint
**Deliverable**: Vercel project ready for deployment
**Success Criteria**:
- ✅ Web app accessible via vercel.app URL
- ✅ API serverless functions working
- ✅ Preview deployments functional
- ✅ Custom domain pointing to Vercel

#### Stream 2B: Neon Postgres Migration (5 EU)
**Assistant**: AI #1 (Database specialist)
**Focus**: Database setup
**Independent**: YES
**Tasks**:
1. Create Neon project, get connection string
2. Update DATABASE_URL in Vercel secrets
3. Run migrations: `pnpm --filter @in-midst-my-life/api migrate`
4. Enable connection pooling
5. Test: Connect from API → Query profiles → Verify data
**Deliverable**: Production Postgres database
**Success Criteria**:
- ✅ Neon project created
- ✅ Migrations run successfully
- ✅ API connects and queries work
- ✅ Connection pooling enabled

#### Stream 2C: Upstash Redis Setup (3 EU)
**Assistant**: AI #3 (Caching specialist)
**Focus**: Cache layer
**Independent**: YES
**Tasks**:
1. Create Upstash Redis database
2. Get connection string
3. Update REDIS_URL in Vercel secrets
4. Test: Cache narrative generation → Verify hit rate
**Deliverable**: Redis cache ready for production
**Success Criteria**:
- ✅ Upstash Redis created
- ✅ Connection string configured
- ✅ Caching tests pass

#### Stream 2D: CI/CD Pipeline (4 EU)
**Assistant**: AI #1 (DevOps specialist)
**Blocked by**: All of 2A, 2B, 2C (needs working deployment)
**Tasks**:
1. Create `.github/workflows/deploy.yml` (tests → build → deploy)
2. Configure branch protection rules
3. Add status badges to README
4. Test: Push code → GH Actions runs → Vercel deploys
**Deliverable**: Automated deployment pipeline
**Success Criteria**:
- ✅ GitHub Actions workflow triggers on push
- ✅ Tests run before deploy
- ✅ Vercel deployment automatic
- ✅ Preview deployments for PRs

---

### **PHASE 3: Portfolio & Theatrical Marketing** (Weeks 5-8, 30 EU)
**Status**: Can start Week 5 (parallel with Phase 2)
**Parallelization**: 3 AI assistants (fully independent)

#### Stream 3A: Landing Page (10 EU)
**Assistant**: AI #2 (Frontend specialist)
**Focus**: Marketing conversion
**Independent**: YES
**Tasks**:
1. Create `apps/web/app/landing/page.tsx` (root landing page)
2. Sections:
   - Hero: "Life isn't one-dimensional. Why should your CV be?"
   - Theatrical Metaphor explanation (CV ≈ Blockchain, Masks ≈ Perspectives)
   - Problem/Solution
   - Features (Hunter Protocol, Inverted Interview, Tabula Personarum)
   - Pricing (Free/Artisan/Dramatist)
   - CTA: "Enter the Theatrum Mundi"
3. Add stage curtains animation
4. Test: Load, verify all sections, check mobile responsive
**Deliverable**: Compelling theatrical landing page
**Success Criteria**:
- ✅ Page loads fast (Lighthouse 90+)
- ✅ Clear theatrical metaphor explanation
- ✅ Pricing visible, CTA prominent
- ✅ Mobile responsive

#### Stream 3B: Documentation (8 EU)
**Assistant**: AI #3 (Technical writer)
**Focus**: Depth + accessibility
**Independent**: YES
**Tasks**:
1. Create `docs/USER_GUIDE.md` (onboarding, mask creation, exports)
2. Create `docs/PHILOSOPHY.md` (CV/Blockchain analogy, theatrical framework)
3. Complete `apps/api/openapi.yaml` (all endpoints documented)
4. Create `docs/ARCHITECTURE.md` (system diagram, data flow, hexagonal pattern)
5. Test: Read guide → Create first mask → Generate resume
**Deliverable**: Complete documentation
**Success Criteria**:
- ✅ User guide explains philosophy first
- ✅ API docs complete with examples
- ✅ Architecture docs visualize system
- ✅ All 50+ endpoints documented

#### Stream 3C: Demo Video + Case Study (9 EU)
**Assistant**: AI #2 (Product specialist)
**Focus**: Proof of concept
**Independent**: YES (assuming Phase 0 complete)
**Tasks**:
1. Record 2-3 min demo video showing:
   - Mask switching (Analyst → Architect → Narrator)
   - Epoch filtering
   - Scaenae visibility
   - Hunter Protocol
   - Tabula personarum
   - Attestation verification
2. Write `docs/CASE_STUDY_DOGFOODING.md`:
   - Show own CV through 6 masks
   - Demonstrate epoch progression
   - Share results (contracts, interviews)
3. Publish case study as blog post
4. Test: Video plays, case study readable
**Deliverable**: Demo + case study
**Success Criteria**:
- ✅ Video <3 min, clear theatrical features
- ✅ Case study compelling, authentic
- ✅ Both shareable on landing page

#### Stream 3D: Blog Content (3 EU)
**Assistant**: AI #3 (Content writer)
**Focus**: Thought leadership
**Independent**: YES
**Tasks**:
1. Write 3 flagship blog posts:
   - "The Theatrical Résumé: Life as Performance"
   - "Building a Blockchain CV: DID to Verifiable Credentials"
   - "Inverting the Interview: Theatrical Power Dynamics"
2. Cross-post to Dev.to, Hashnode
3. Add to landing page `/blog`
**Deliverable**: Published thought leadership content
**Success Criteria**:
- ✅ Posts published on 3+ platforms
- ✅ Philosophical + technical depth
- ✅ SEO optimized

---

### **PHASE 4: Stabilization & UX Polish** (Weeks 7-11, 28 EU)
**Status**: Can start Week 7 (parallel with Phase 3)
**Parallelization**: 2-3 AI assistants (mostly independent)

#### Stream 4A: Frontend UX Refinement (12 EU)
**Assistant**: AI #2 (Frontend specialist)
**Focus**: User experience
**Independent**: YES
**Tasks**:
1. Profile creation wizard (multi-step form, progress indicator)
2. Mask selector (visual cards, not dropdowns)
3. Resume preview (live preview pane)
4. Hunter dashboard (job cards, status tracking)
5. Components audit: remove unused, finish incomplete
6. Accessibility: fix WCAG AA violations
7. Responsive design: mobile + tablet optimization
**Deliverable**: Polished frontend experience
**Success Criteria**:
- ✅ Wizard < 2 min to first mask
- ✅ Resume preview updates live
- ✅ No WCAG AA violations
- ✅ Mobile responsive

#### Stream 4B: PDF Export Quality (6 EU)
**Assistant**: AI #1 (Backend specialist)
**Focus**: Output quality
**Independent**: YES
**Tasks**:
1. Enhance `apps/api/src/services/pdf-export.ts`:
   - Professional templates (Modern, Classic, Creative)
   - Customization (font, colors, layout)
   - Mask branding (subtle footer indicator)
   - File size optimization
2. Test: Export 10 CVs, verify formatting in Preview/Acrobat/browser
**Deliverable**: High-quality PDF exports
**Success Criteria**:
- ✅ Templates professional-looking
- ✅ Customization works
- ✅ Mask indicators subtle but clear
- ✅ File size <2MB

#### Stream 4C: GraphQL Completion (4 EU)
**Assistant**: AI #1 (Backend specialist)
**Focus**: API enhancement
**Independent**: YES
**Tasks**:
1. Create `apps/api/src/routes/graphql.ts`
2. Wire up GraphQL endpoint
3. Add GraphQL Playground
4. Write resolvers: profile, narrative, masks
5. Test: Run queries in Playground
**Deliverable**: Functional GraphQL API
**Success Criteria**:
- ✅ GraphQL endpoint working
- ✅ Playground accessible
- ✅ Sample queries return correct data

#### Stream 4D: Analytics Dashboard (4 EU)
**Assistant**: AI #3 (Data specialist)
**Focus**: Metrics visibility
**Independent**: YES
**Tasks**:
1. Create `apps/web/app/admin/analytics/page.tsx`
2. Metrics: user growth, feature adoption, conversion funnel, revenue
3. Charts: Recharts line/bar charts
4. Data source: PostgreSQL aggregation
5. Test: Admin login → Analytics page → See charts
**Deliverable**: Admin analytics dashboard
**Success Criteria**:
- ✅ User signups chart (ascending)
- ✅ Feature adoption visible
- ✅ Conversion funnel clear
- ✅ Revenue metrics accurate

#### Stream 4E: Performance Tuning (2 EU)
**Assistant**: AI #1 (DevOps specialist)
**Focus**: Speed
**Independent**: YES
**Tasks**:
1. Frontend: SSR/SSG, image optimization, code splitting
2. API: Redis caching for narratives, DB indexes, connection pooling
3. Lighthouse audit: aim for 90+
4. Test: Benchmark before/after
**Deliverable**: Optimized performance
**Success Criteria**:
- ✅ Lighthouse 90+ on landing page
- ✅ Narrative generation <1s
- ✅ Database queries optimized

---

### **PHASE 5: Marketing & Community** (Weeks 9-13, 16 EU)
**Status**: Can start Week 9 (parallel with Phase 4)
**Parallelization**: 3 AI assistants (fully independent until launch)

#### Stream 5A: Content Strategy (6 EU)
**Assistant**: AI #3 (Content specialist)
**Focus**: Audience building
**Independent**: YES
**Tasks**:
1. 12 blog posts (1/week):
   - Philosophical: theatrical identity, anti-resume, authenticity
   - Technical: hexagonal architecture, schema-first, Zod validation
   - Use cases: freelancers, career changers, portfolio workers
   - Product: feature announcements, roadmap, behind-the-scenes
2. Cross-post to Dev.to, Hashnode, LinkedIn, Twitter
3. SEO optimization (target keywords)
**Deliverable**: Published content library
**Success Criteria**:
- ✅ 12 posts published
- ✅ Cross-posted to 3+ platforms
- ✅ Drives traffic to landing page

#### Stream 5B: Community Building (4 EU)
**Assistant**: AI #2 (Community specialist)
**Focus**: User engagement
**Independent**: YES (slight overlap with 5A)
**Tasks**:
1. Beta program: collect emails, invite 20-30 early users
2. Discord: create channels (#general, #feedback, #showcase, #philosophy)
3. Community masks: accept contributions, vote on quality
4. Testimonials: collect quotes from beta users
5. GitHub: enable discussions, good-first-issue labels
**Deliverable**: Active community
**Success Criteria**:
- ✅ 50+ Discord members
- ✅ 20+ beta users
- ✅ 5+ community testimonials

#### Stream 5C: GitHub & Launch Prep (2 EU)
**Assistant**: AI #1 (DevOps specialist)
**Focus**: Visibility
**Independent**: YES
**Tasks**:
1. Polish README: hero image, badges, quick start, architecture diagram
2. GitHub topics: resume, cv, identity, blockchain, verification, typescript, nextjs
3. GitHub Pages: host docs at inmidstmylife.github.io
4. Issue templates: bug report, feature request
5. Prepare Product Hunt assets
**Deliverable**: Polished GitHub presence
**Success Criteria**:
- ✅ README compelling
- ✅ GitHub Pages live
- ✅ PH assets ready

#### Stream 5D: Launch Prep (4 EU)
**Assistant**: AI #2 (Launch specialist)
**Focus**: Market entry
**Independent**: YES
**Tasks**:
1. Product Hunt: create account, prepare submission
2. Hacker News: draft Show HN post
3. Twitter: write announcement thread
4. Email: draft launch email for beta list
5. Timing: coordinate all channels for simultaneous launch
**Deliverable**: Launch-ready assets
**Success Criteria**:
- ✅ PH submission complete
- ✅ HN post drafted
- ✅ Social media ready

---

### **PHASE 6: Launch & Iteration** (Weeks 12-16, 15 EU)
**Status**: SEQUENTIAL - cannot parallelize (real-time feedback required)
**Parallelization**: 2-3 AI assistants (coordinated)

#### Stream 6A: Public Beta Launch (4 EU)
**Assistant**: AI #2 (Launch lead)
**Focus**: Day-of execution
**Sequence**: Week 12
**Tasks**:
1. Pre-launch checklist: landing page ✅, billing ✅, docs ✅, video ✅
2. Launch day: Product Hunt, Hacker News, Twitter, LinkedIn, email
3. Engagement: respond to comments/questions within 1 hour
4. Monitor: upvotes, shares, sentiment
**Deliverable**: Successful public launch
**Success Criteria**:
- ✅ Product Hunt: 200+ upvotes, top 5 of day
- ✅ Hacker News: front page 4+ hours
- ✅ 500+ signups week 1

#### Stream 6B: Feedback Collection (3 EU)
**Assistant**: AI #3 (Research specialist)
**Focus**: User insights
**Sequence**: Week 12-14
**Tasks**:
1. In-app feedback: add feedback widget (Canny/Typeform)
2. User interviews: schedule 10-15 calls
3. Analytics: track behavior, identify friction
4. Synthesis: document learnings
**Deliverable**: User feedback insights
**Success Criteria**:
- ✅ 10 interviews completed
- ✅ Friction points identified
- ✅ Insights documented

#### Stream 6C: Rapid Iteration (5 EU)
**Assistant**: AI #1 (Engineering lead)
**Focus**: Ship fast
**Sequence**: Week 12-16 (ongoing)
**Tasks**:
1. Bug fixes: payment failures, PDF errors (24-hour SLA)
2. UX improvements: confusing labels, help text
3. Performance: slow loading, timeouts
4. Feature requests: prioritize top 3, implement fast
5. Deployment: ship daily during launch week
**Deliverable**: Continuously improving product
**Success Criteria**:
- ✅ 3+ bugs fixed within 24 hours
- ✅ Feature iteration <3 days
- ✅ 50+ subscribers by week 4

---

## Parallelization Matrix

```
Week  Stream 0A   Stream 0B   Stream 1A   Stream 1B/C/D   Stream 2A/B/C   Stream 3A/B/C/D   Stream 4A/B/C/D/E   Stream 5A/B/C/D   Stream 6A/B/C
---   ----------  ----------  ----------  ---------------  ---------------  ----------------  -------------------  ----------------  ------------------
1     ██████      ██████
2     ██████      ██████      ██████
3     (Phase 0    (Phase 0    ██████      ██████▓▓▓▓▓▓      ██████
        done)      done)                  (Blocks 1D)
4                                         ██████████        ██████
5                                                            ██████          ██████
6                                         (Phase 1           ██████          ██████
                                           done)
7                                                                            ██████▓▓▓▓▓▓      ██████
                                                                             (Blocks 4C)
8                                                                            ██████            ██████
9                                                                                              ██████              ██████
10                                                                                             ██████              ██████
11                                                                                             ██████              ██████
12                                                                                                                 ██████      ██████
13                                                                                                                 ██████      ██████
14                                                                                                                 ██████      ██████
15                                                                                                                 ██████      ██████
16                                                                                                                             ██████

Legend:
██████ = AI Assistant actively working
▓▓▓▓▓▓ = Blocked/waiting for dependency
(empty) = Not yet started
```

---

## AI Assistant Role Assignment (Recommended)

### **AI #1: Core/Backend/DevOps Specialist**
- Streams: 0A (Hunter), 1A (Stripe), 2A/B/C/D (Deployment), 4B/C/E (PDF/GraphQL/Perf), 5C (GitHub), 6C (Iteration)
- Skills: Backend logic, infrastructure, databases, performance
- Total EU: ~45 EU

### **AI #2: Frontend/Product Specialist**
- Streams: 0B (Theatrical UI), 1D (Billing UI), 3A/C (Landing/Demo), 4A (UX), 5B (Community), 6A (Launch)
- Skills: React/Next.js, UX/UI, product, marketing
- Total EU: ~50 EU

### **AI #3: Schema/Content/Research Specialist**
- Streams: 1B (Feature Gates), 2C (Redis), 3B/D (Docs/Blog), 4D (Analytics), 5A (Content), 6B (Feedback)
- Skills: Data modeling, technical writing, content, research
- Total EU: ~45 EU

**Optional AI #4 & #5**: Can be assigned from overlapping tasks (parallel Streams can run faster with more hands)

---

## Synchronization Points (Cross-Stream Dependencies)

| Point | Blocks | Unblocks | When |
|-------|--------|----------|------|
| **Phase 0 Complete** | All Phase 1-6 | All other phases | Week 2 |
| **1A (Stripe) Complete** | 1D (Billing UI) | Billing Page | Week 2 end |
| **1B (Feature Gates) Complete** | API protection | Premium features | Week 3 |
| **2A/B/C (Infra) Complete** | 2D (CI/CD) | Production deploy | Week 5 |
| **3A/B/C/D Complete** | Phase 6 (Launch) | Public beta | Week 8 |
| **4A/B/C/D/E Complete** | Phase 5 (Community) | Polished product | Week 11 |
| **Phase 6A (Launch) Complete** | 6B/6C | Feedback loop | Week 12 |

---

## Communication Protocol

### Daily Standup (Async)
- Each AI updates progress in shared document: `/tmp/standup.md`
- Format: "Stream XY: [What I did] [What I'm doing] [Blockers]"
- No meeting required - all async

### Weekly Sync (If Needed)
- Review cross-stream dependencies
- Resolve blockers
- Adjust parallel work if needed

### Integration Tests
- Phase 0 completion: Test Hunter + Theatrical UI together
- Phase 1 completion: Test Stripe + Feature Gates together
- Phase 2 completion: Test Vercel + Neon + Upstash together
- Phase 3 completion: Integration test with live infrastructure
- Phase 4+ : Continuous integration (CI/CD pipeline)

---

## Success Definition

**Each Stream Must Deliver:**
1. ✅ Code/content committed to GitHub (or documented)
2. ✅ Tests passing (if applicable)
3. ✅ Success criteria met (per stream)
4. ✅ No blockers for downstream streams

**Overall Success:**
- ✅ All 140 EU completed in 3-4 months
- ✅ No stream delayed > 1 week without mitigation
- ✅ Product launches to public beta on schedule (Week 12)
- ✅ Philosophical covenant honored throughout

---

**Ready for parallel execution! 🎭🚀**
