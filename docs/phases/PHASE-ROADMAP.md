# Implementation Plan: in–midst–my–life → Deployed + Monetized + Portfolio-Ready

**Timeline**: 3-4 months (12-16 weeks)
**Current State**: 90% complete functional system
**Goal**: Public freemium SaaS product + comprehensive portfolio piece
**Infrastructure**: Vercel + Neon/Supabase + Upstash

---

## Executive Summary

> **Updated 2026-02-06**: Phase 1 (Monetization) is now ~95% complete. The system has
> Stripe integration, feature gates, billing UI, and webhook fulfillment all implemented.

**Completed since initial plan:**
- ✅ Monetization infrastructure (Stripe checkout, webhooks, feature gates, licensing)
- ✅ Billing UI (pricing page, subscription management, success flow)
- ✅ CI/CD pipeline (GitHub Actions, husky + lint-staged)
- ✅ TypeScript strict mode across entire monorepo
- ✅ Auth middleware audit with documented route security
- ✅ Persistent DID registry (PostgreSQL-backed)
- ✅ pgvector semantic search infrastructure

**Remaining:**
- ❌ Production deployment (Vercel, managed DBs)
- ❌ Portfolio polish (landing page, docs, case study)
- ❌ Marketing assets (content, demos, community)

This plan transforms a 95% working prototype into a revenue-generating portfolio product.

---

## Phase Breakdown

### **PHASE 1: Monetization Foundation** (Weeks 1-3, 21 EU)
*Critical path - blocks public launch*

**Goal**: Add Stripe, feature gates, billing UI so product can generate revenue

#### Tasks:
1. **Stripe Integration** (8 EU)
   - Install `@stripe/stripe-js` and `stripe` packages
   - Create Stripe account, get API keys (test + prod)
   - Backend: Create `/api/stripe/checkout` endpoint (create checkout session)
   - Backend: Create `/api/stripe/webhook` endpoint (handle subscription events)
   - Backend: Create `/api/stripe/portal` endpoint (customer portal redirect)
   - Database: Add `subscriptions` table (user_id, stripe_customer_id, stripe_subscription_id, plan, status, current_period_end)
   - Service: `apps/api/src/services/billing.ts` (sync subscription status)

2. **Feature Gate System** (6 EU)
   - Schema: Extend `packages/schema/src/profile.ts` with `subscription_tier` field
   - Service: `apps/api/src/services/entitlements.ts`
     - `canUsePremiumFeature(userId, feature)` - check if user has access
     - Feature flags: `HUNTER_PROTOCOL`, `UNLIMITED_MASKS`, `CUSTOM_PDF`, `API_ACCESS`, `PRIORITY_SUPPORT`
   - Middleware: `apps/api/src/middleware/feature-gate.ts` - protect premium endpoints
   - Frontend: `apps/web/src/hooks/useEntitlements.ts` - check feature access client-side
   - UI: Add upgrade prompts on premium features (soft paywall)

3. **Pricing Tiers Definition** (2 EU)
   - Free: 1 profile, 3 masks max, standard PDF exports, no Hunter Protocol
   - Pro ($19/mo): Unlimited masks, Hunter Protocol, custom PDF styling, 10K API calls/mo
   - Teams ($49/mo): 5 profiles, shared masks, priority support, 100K API calls/mo
   - Document in `docs/PRICING.md`

4. **Billing UI** (5 EU)
   - Page: `/app/billing/page.tsx` - Subscription management
   - Components:
     - `PlanSelector.tsx` - Display plans with feature comparison
     - `SubscriptionStatus.tsx` - Show current plan, renewal date, usage
     - `InvoiceHistory.tsx` - List past invoices with download links
     - `UpgradeButton.tsx` - Trigger checkout flow
   - Integration with Stripe Customer Portal for cancellations/downgrades

**Success Criteria**:
- ✅ User can subscribe to Pro plan via Stripe Checkout
- ✅ Subscription status syncs via webhooks
- ✅ Premium features are gated (Hunter Protocol shows upgrade prompt on free tier)
- ✅ Billing page shows current plan and invoice history
- ✅ Test mode transactions complete successfully

**Critical Files**:
- `apps/api/src/routes/stripe.ts` (new)
- `apps/api/src/services/billing.ts` (new)
- `apps/api/src/services/entitlements.ts` (new)
- `apps/api/src/middleware/feature-gate.ts` (new)
- `apps/web/app/billing/page.tsx` (new)
- `apps/web/src/components/PlanSelector.tsx` (new)
- `apps/web/src/hooks/useEntitlements.ts` (new)
- `packages/schema/src/profile.ts` (modify)

---

### **PHASE 2: Deployment Infrastructure** (Weeks 2-5, 18 EU)
*Can start Week 2 in parallel with Phase 1 billing UI*

**Goal**: Deploy to Vercel with managed databases, CI/CD pipeline, monitoring

#### Tasks:
1. **Vercel Deployment Setup** (6 EU)
   - Create Vercel project, link GitHub repo
   - Configure `vercel.json`:
     - Web app: Standard Next.js deployment
     - API: Serverless functions for routes, consider long-running for orchestrator
   - Environment variables: Set up Vercel secrets (DATABASE_URL, REDIS_URL, STRIPE_SECRET_KEY, etc.)
   - Custom domains: Link `inmidstmylife.com` (or similar)
   - Preview deployments: Configure branch-based previews

2. **Managed Database Migration** (5 EU)
   - **Neon Postgres**:
     - Create Neon project, get connection string
     - Update DATABASE_URL in Vercel secrets
     - Enable connection pooling (Neon's built-in pooler)
     - Run migrations: `pnpm --filter @in-midst-my-life/api migrate`
   - **Alternative: Supabase**:
     - Create Supabase project
     - Use Supabase Postgres connection string
     - Bonus: Can use Supabase Auth instead of custom JWT (future consideration)
   - Test: Verify API endpoints work with Neon/Supabase

3. **Upstash Redis Setup** (3 EU)
   - Create Upstash Redis database
   - Get connection string (REST API or Redis protocol)
   - Update REDIS_URL in Vercel secrets
   - Test: Verify caching and task queue work
   - Orchestrator: Ensure job queue uses Upstash

4. **CI/CD Pipeline** (4 EU)
   - GitHub Actions workflow: `.github/workflows/deploy.yml`
     - On push to `main`: Run tests → Build → Deploy to Vercel production
     - On PR: Run tests → Deploy to Vercel preview
   - Add status badges to README (build status, test coverage)
   - Pre-deploy checks: Linting, type checking, tests must pass

**Orchestrator Deployment Decision**:
- **Option A (Recommended)**: Vercel Cron Jobs for periodic tasks (Hunter scheduler, GitHub webhook processing)
  - Pros: Simple, integrated with Vercel, no extra infrastructure
  - Cons: 60s max execution time on Pro plan (may need to chunk long tasks)
  - Implementation: Move orchestrator logic into API serverless functions, trigger via Vercel Cron
- **Option B**: Separate Railway/Render instance for orchestrator
  - Pros: No timeout limits, can run long background jobs
  - Cons: Extra infrastructure, separate deployment, more cost (~$7/mo)
  - Implementation: Deploy `apps/orchestrator` as standalone Docker container

**Recommendation**: Start with Option A (Vercel Cron), migrate to Option B if hitting timeout limits.

**Success Criteria**:
- ✅ Web app deployed to Vercel, accessible via custom domain
- ✅ API endpoints return data from Neon/Supabase Postgres
- ✅ Redis caching works (test with narrative generation)
- ✅ GitHub Actions deploy on merge to main
- ✅ Preview deployments work for PRs
- ✅ Orchestrator tasks run (Hunter scheduler executes)

**Critical Files**:
- `vercel.json` (new)
- `.github/workflows/deploy.yml` (new)
- `apps/api/src/db/index.ts` (verify connection pooling)
- `apps/orchestrator/src/config.ts` (update for Vercel Cron if Option A)
- `docs/DEPLOYMENT.md` (new - deployment runbook)

---

### **PHASE 3: Portfolio & Marketing Foundation** (Weeks 4-7, 24 EU)
*Starts Week 4, runs parallel with deployment finalization*

**Goal**: Landing page, docs, demo video, case study, blog content

#### Tasks:
1. **Landing Page** (8 EU)
   - Page: `/app/landing/page.tsx` or root `/app/page.tsx`
   - Sections:
     - **Hero**: "Your life isn't one-dimensional. Why is your resume?" + CTA (Get Started / See Demo)
     - **Problem**: Traditional CVs force you into a box, fail to capture context
     - **Solution**: Theatrical masks, context-aware identity, blockchain verification
     - **Features**: Hunter Protocol, Inverted Interview, PDF exports, API access
     - **Pricing**: Free vs. Pro comparison table
     - **Social Proof**: Testimonials (start with dogfooding story), GitHub stars
     - **CTA**: "Create Your Theatrical CV" button
   - Design: Clean, minimal, theatrical theme (stage curtains motif?)
   - Tech: Static page for SEO, fast load times

2. **Demo Video** (4 EU)
   - 2-3 minute screen recording showing:
     - Create profile
     - Add experience with mask tags (Analyst, Architect, etc.)
     - Select mask context → see filtered resume
     - Generate PDF export
     - Use Hunter Protocol to find jobs
     - View compatibility analysis
   - Tools: Loom or ScreenFlow + iMovie for editing
   - Voiceover: Narrate the theatrical metaphor
   - Host: YouTube + embed on landing page

3. **Documentation** (6 EU)
   - **User Guide** (`docs/USER_GUIDE.md`):
     - Onboarding: Create first profile
     - Masks: What they are, how to use them, which to choose
     - CV Builder: Add experience, education, projects
     - Resume Generation: Export to PDF, JSON-LD
     - Hunter Protocol: Job search workflow
   - **API Docs** (OpenAPI/Swagger):
     - Complete `apps/api/openapi.yaml`
     - Add Swagger UI endpoint: `GET /api/docs`
     - Document all 50+ endpoints with examples
   - **Architecture Docs** (`docs/ARCHITECTURE.md`):
     - System diagram (Mermaid or Excalidraw)
     - Data flow: Profile → Masks → Narrative → Export
     - Tech stack overview
     - Hexagonal architecture explanation
   - **Deployment Runbook** (`docs/DEPLOYMENT.md`):
     - How to deploy, scale, troubleshoot
     - Environment variables reference
     - Database migration process

4. **Case Study: Dogfooding** (3 EU)
   - Write `docs/CASE_STUDY_DOGFOODING.md`:
     - "How I Built the Resume I Needed"
     - Problem: Traditional resume didn't capture my multiplicity (developer, designer, writer, consultant)
     - Solution: Created theatrical CV with 6 masks (Analyst, Architect, Narrator, Synthesist, Artisan, Executor)
     - Results: [X contracts landed], [Y interviews], [Z confidence boost]
     - Screenshots: Show own theatrical CV, masked resumes
   - Publish as blog post on landing page `/blog/dogfooding`

5. **Blog Content** (3 EU)
   - Write 3 flagship posts:
     - **"The Theatrical Resume: Why Your CV Should Have Multiple Personalities"** - Viral explainer
     - **"Building a Blockchain CV System: Architecture Deep-Dive"** - Technical showcase
     - **"Inverting the Interview: Making Companies Earn Your Attention"** - Provocative, power dynamics
   - Publish on Dev.to, Hashnode, cross-post to landing page `/blog`
   - SEO: Target keywords like "theatrical resume", "blockchain CV", "context-aware identity"

**Success Criteria**:
- ✅ Landing page deployed, converts visitors to signups
- ✅ Demo video embedded, under 3 minutes, clear value prop
- ✅ User guide covers all core workflows
- ✅ API docs complete with Swagger UI
- ✅ Architecture diagram visualizes system
- ✅ Case study published, shareable
- ✅ 3 blog posts live, cross-posted to Dev.to

**Critical Files**:
- `apps/web/app/landing/page.tsx` (new)
- `apps/web/app/blog/[slug]/page.tsx` (new - blog system)
- `docs/USER_GUIDE.md` (new)
- `docs/ARCHITECTURE.md` (new)
- `docs/DEPLOYMENT.md` (new)
- `docs/CASE_STUDY_DOGFOODING.md` (new)
- `apps/api/openapi.yaml` (complete)

---

### **PHASE 4: Stabilization & UX Polish** (Weeks 6-10, 28 EU)
*Runs parallel with Phase 3, focuses on product quality*

**Goal**: Refine frontend, improve PDF exports, complete GraphQL, add analytics

#### Tasks:
1. **Frontend UX Refinement** (12 EU)
   - **Priority flows** (where users spend most time):
     - Profile creation wizard: Multi-step form with progress indicator
     - Mask selector: Visual cards with icons, not just dropdowns
     - Resume preview: Live preview pane next to CV editor
     - Hunter dashboard: Job cards with apply button, status tracking
   - **40+ components audit**:
     - Identify unused/incomplete components, remove or finish
     - Ensure consistent design system (colors, typography, spacing)
     - Add loading states (skeletons, spinners)
     - Add empty states ("No masks yet, create one!")
     - Error boundaries for graceful failures
   - **Accessibility**:
     - Run `axe-core` accessibility audit
     - Fix WCAG AA violations (color contrast, keyboard nav, ARIA labels)
     - Test with screen reader (VoiceOver on Mac)
   - **Responsive design**:
     - Mobile breakpoints for key pages (profile, resume viewer)
     - Tablet optimization for dashboard

2. **PDF Export Quality** (6 EU)
   - Current: `apps/api/src/services/pdf-export.ts` works but needs polish
   - Improvements:
     - **Styling**: Professional templates (Modern, Classic, Creative)
     - **Customization**: User can choose font, colors, layout
     - **Mask branding**: Subtle mask indicator (e.g., "Analyst Perspective" footer)
     - **Optimization**: Reduce file size, faster generation
   - Test: Export 10 sample CVs, verify formatting on different viewers (Preview, Acrobat, browser)
   - Premium feature: Custom PDF templates (Canva-style editor?)

3. **GraphQL Completion** (4 EU)
   - Current: `apps/api/src/services/graphql-schema.ts` + `graphql-resolvers.ts` exist
   - Wire up GraphQL endpoint: `POST /graphql`
   - Add GraphQL Playground at `/graphql` for exploration
   - Write resolvers for:
     - `profile(id)` - Fetch profile with masks
     - `narrative(profileId, maskId)` - Generate narrative
     - `masks(filters)` - List masks
   - Test: Run sample queries, verify response shape
   - Document: Add GraphQL examples to API docs

4. **Analytics Dashboard** (4 EU)
   - Current: `packages/core/src/analytics/analytics-service.ts` tracks events
   - Build admin dashboard: `/app/admin/analytics/page.tsx`
   - Metrics:
     - **User growth**: Signups over time, active users
     - **Feature adoption**: % using Hunter Protocol, masks created, exports
     - **Conversion funnel**: Visitor → Signup → First mask → Premium upgrade
     - **Revenue**: MRR, churn rate, LTV
   - Visualization: Recharts for line/bar charts
   - Data source: Query PostgreSQL (aggregate events)

5. **Performance Tuning** (2 EU)
   - **Frontend**:
     - Enable Next.js SSR/SSG for landing page (faster load)
     - Optimize images (next/image, WebP format)
     - Code splitting (lazy load heavy components like D3 graphs)
   - **API**:
     - Add Redis caching for expensive queries (narrative generation)
     - Database query optimization (add indexes on profile.user_id, masks.mask_type)
     - Connection pooling (verify Neon pooler settings)
   - **Lighthouse audit**: Aim for 90+ score on landing page

**Success Criteria**:
- ✅ Profile creation wizard is intuitive, < 2 min to first mask
- ✅ Resume preview updates live as user edits
- ✅ PDF exports look professional, customizable templates work
- ✅ GraphQL endpoint returns data, Playground accessible
- ✅ Analytics dashboard shows user metrics, feature adoption
- ✅ Lighthouse score 90+ on landing page
- ✅ No major accessibility violations (WCAG AA)

**Critical Files**:
- `apps/web/app/profile/[profileId]/create/page.tsx` (new wizard)
- `apps/web/src/components/MaskSelector.tsx` (redesign)
- `apps/web/src/components/ResumePreview.tsx` (live preview)
- `apps/api/src/services/pdf-export.ts` (enhance)
- `apps/api/src/routes/graphql.ts` (new)
- `apps/web/app/admin/analytics/page.tsx` (new)

---

### **PHASE 5: Marketing & Community** (Weeks 8-12, 16 EU)
*Starts Week 8, ramps up toward launch*

**Goal**: Build audience, create content, prepare launch strategy

#### Tasks:
1. **Content Strategy** (6 EU)
   - **Blog cadence**: 1 post/week, 12 posts total
   - **Topics**:
     - Philosophical: Theatrical identity, anti-resume manifesto, authenticity vs. performance
     - Technical: Hexagonal architecture, schema-first design, Zod validation
     - Use cases: Freelancers, career changers, portfolio workers, hiring managers
     - Product updates: Feature announcements, roadmap, behind-the-scenes
   - **Distribution**:
     - Dev.to, Hashnode (developer audience)
     - LinkedIn (professional audience, hiring managers)
     - Twitter threads (bite-sized insights, code snippets)
     - Hacker News (technical deep-dives, controversial takes)

2. **Community Building** (4 EU)
   - **Beta Program**:
     - Landing page CTA: "Join Beta" (collect emails)
     - Invite 20-30 early users, collect feedback
     - Testimonials: Ask beta users for quotes, case studies
   - **Discord Server**:
     - Channels: #general, #feedback, #feature-requests, #showcase (users share CVs)
     - Moderate, engage, iterate based on feedback
   - **Open Source Strategy**:
     - Keep core monorepo public (already on GitHub)
     - Accept contributions: Mask templates, exporters, integrations
     - Good first issues for new contributors

3. **GitHub Showcase** (2 EU)
   - **README polish**:
     - Hero image (screenshot of theatrical CV)
     - Badges (build status, test coverage, license)
     - Quick start guide (clone, install, run)
     - Architecture diagram
     - Link to live demo, docs
   - **Repository features**:
     - Topics/tags: `resume`, `cv`, `identity`, `blockchain`, `verification`, `typescript`, `nextjs`
     - GitHub Pages: Host docs at `inmidstmylife.github.io`
     - Discussions: Enable for Q&A, feature requests

4. **Launch Prep** (4 EU)
   - **Product Hunt**:
     - Create maker account, prepare submission
     - Hunter (someone with followers) to post
     - Assets: Logo, screenshots, GIFs, tagline
     - Launch day: Respond to comments, engage community
   - **Hacker News**:
     - Post to Show HN: "Show HN: Theatrical CV – Resumes with Multiple Personalities"
     - Time it for max visibility (Tuesday-Thursday, 9-11am PT)
   - **Email List**:
     - Launch announcement to beta waitlist
     - "We're Live!" email with special offer (first month free for early users)

**Success Criteria**:
- ✅ 12 blog posts published, cross-posted to 3+ platforms
- ✅ Beta program has 20+ active users, 5+ testimonials collected
- ✅ Discord server has 50+ members, active discussion
- ✅ GitHub README is compelling, attracts stars/contributors
- ✅ Product Hunt launch assets prepared
- ✅ Email list has 100+ signups pre-launch

**Critical Files**:
- `apps/web/app/blog/` (blog system)
- `README.md` (polish)
- `docs/CONTRIBUTING.md` (new)
- `.github/ISSUE_TEMPLATE/` (bug report, feature request templates)

---

### **PHASE 6: Launch & Iteration** (Weeks 11-16, 12 EU)
*Final phase: Go public, iterate based on feedback*

**Goal**: Public beta launch, collect feedback, iterate rapidly

#### Tasks:
1. **Public Beta Launch** (4 EU)
   - **Pre-launch checklist**:
     - ✅ Landing page live
     - ✅ Stripe billing works (test mode → prod mode)
     - ✅ API deployed, stable
     - ✅ Docs complete
     - ✅ Demo video embedded
     - ✅ Beta testimonials on landing page
   - **Launch day**:
     - Product Hunt submission (9am PT)
     - Hacker News Show HN post
     - Twitter announcement thread
     - LinkedIn post
     - Email beta list
   - **Engagement**:
     - Respond to all comments/questions within 1 hour
     - Monitor upvotes, shares, sentiment
     - Live demo if requested

2. **Feedback Collection** (3 EU)
   - **In-app feedback**:
     - Add feedback widget (Canny or Typeform embed)
     - Prompt users: "What would make this better?"
   - **User interviews**:
     - Schedule 10-15 calls with early users
     - Ask: What's confusing? What's missing? Would you pay for this?
   - **Analytics**:
     - Track user behavior (where they drop off, which features used most)
     - Identify friction points (e.g., 80% abandon during mask creation)

3. **Rapid Iteration** (5 EU)
   - **Quick wins** (fix blocking issues):
     - Bug fixes (payment failures, PDF generation errors)
     - UX improvements (confusing labels, missing help text)
     - Performance (slow loading, timeout errors)
   - **Feature requests** (prioritize high-impact):
     - Top 3 requested features → add to sprint
     - Low-hanging fruit (e.g., "Add LinkedIn import") → implement fast
   - **Deployment velocity**:
     - Ship updates daily during launch week
     - Vercel preview deployments for testing
     - Communicate updates to users (in-app banner, Discord, email)

**Success Criteria**:
- ✅ Product Hunt: 200+ upvotes, top 5 of the day
- ✅ Hacker News: Front page for 4+ hours
- ✅ 500+ signups in Week 1
- ✅ 50+ paying subscribers by Week 4
- ✅ 10 user interviews completed, insights documented
- ✅ 3+ bug fixes shipped within 24 hours of reports
- ✅ Feature iteration cycle < 3 days (request → ship)

**Critical Files**:
- `apps/web/src/components/FeedbackWidget.tsx` (new)
- `docs/LAUNCH_CHECKLIST.md` (new)
- `docs/FEEDBACK_INSIGHTS.md` (new - document learnings)

---

## Parallel Work Streams

AI assistants can work on these simultaneously:

| Week | Stream A (Critical Path) | Stream B (Parallel) | Stream C (Parallel) |
|------|--------------------------|---------------------|---------------------|
| 1-3  | Stripe integration | Vercel setup | Landing page design |
| 2-5  | Feature gates + billing UI | Neon DB migration | User guide writing |
| 4-7  | PDF export enhancement | GraphQL completion | Blog content creation |
| 6-10 | Frontend UX refinement | Analytics dashboard | Demo video production |
| 8-12 | Beta program | Community building | GitHub showcase |
| 11-16| Launch execution | Feedback collection | Rapid iteration |

**Dependencies**:
- Billing UI requires Stripe integration (Phase 1)
- Public launch requires deployment (Phase 2) + billing (Phase 1)
- Analytics requires deployed production data
- Community requires something to show (landing page, demo)

---

## Critical Path

```
Stripe Integration (Week 1-2)
  ↓
Feature Gates (Week 2-3)
  ↓
Billing UI (Week 3)
  ↓
Vercel Deployment (Week 3-4)
  ↓
Landing Page (Week 4-5)
  ↓
Beta Program (Week 8-10)
  ↓
Public Launch (Week 11-12)
  ↓
Iterate (Week 12-16)
```

**Blockers**:
- Can't launch without billing (users can't pay)
- Can't launch without deployment (nowhere to send users)
- Can't grow without landing page (no conversion funnel)

---

## MVP Definition (What Ships in Public Beta)

**Must Have**:
- ✅ Stripe subscription (free → Pro upgrade)
- ✅ Feature gates (Hunter Protocol behind paywall)
- ✅ Deployed to Vercel with custom domain
- ✅ Landing page with pricing
- ✅ User guide + API docs
- ✅ Demo video
- ✅ PDF export (1 template is enough)
- ✅ Analytics dashboard (basic metrics)

**Can Wait for v1.1**:
- Custom PDF templates (premium users can request)
- GraphQL (nice-to-have, REST API is sufficient)
- Mobile app (desktop-first for now)
- Advanced analytics (cohort analysis, funnels)
- Real-time features (WebSockets)
- Email notifications (manual for now)

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Stripe integration breaks | High | Test thoroughly in Stripe test mode before prod |
| Vercel timeout limits (60s) | Medium | Start with Vercel Cron, migrate to Railway if needed |
| Neon/Upstash costs spike | Medium | Set billing alerts, monitor usage, downgrade plan if needed |
| Low conversion (visitors don't sign up) | High | A/B test landing page, improve CTA, add social proof |
| No Product Hunt traction | Medium | Have backup plan (Hacker News, Twitter, direct outreach) |
| User feedback is negative | High | Beta test first, iterate before public launch |
| LLM costs too high (Hunter Protocol) | Medium | Rate limit free users, cache results, use cheaper models |

---

## Effort Summary

| Phase | EU | Weeks | Parallelizable? |
|-------|-----|-------|-----------------|
| 1: Monetization | 21 | 1-3 | Partially (billing UI can parallel) |
| 2: Deployment | 18 | 2-5 | Yes (DB, CI/CD, Vercel independent) |
| 3: Portfolio | 24 | 4-7 | Yes (landing, docs, blog independent) |
| 4: Stabilization | 28 | 6-10 | Yes (UX, PDF, GraphQL, analytics independent) |
| 5: Marketing | 16 | 8-12 | Yes (content, community, launch prep) |
| 6: Launch | 12 | 11-16 | No (sequential: launch → feedback → iterate) |
| **TOTAL** | **119 EU** | **16 weeks** | **~60% parallelizable** |

**With 3 AI assistants working in parallel: ~8-10 weeks wall time** (optimistic)
**Realistic with testing/iteration: 12-16 weeks (3-4 months)** ✅

---

## Success Metrics

**By End of Month 1** (after Phase 2):
- ✅ Deployed to Vercel with custom domain
- ✅ Stripe billing works (test purchases complete)
- ✅ Landing page live, getting traffic

**By End of Month 2** (after Phase 4):
- ✅ 20+ beta users actively using product
- ✅ PDF exports look professional
- ✅ Analytics dashboard shows user behavior
- ✅ Blog has 8+ posts, cross-posted

**By End of Month 3** (after Phase 5):
- ✅ 100+ signups from beta program
- ✅ Discord has 50+ members
- ✅ GitHub has 100+ stars
- ✅ Product Hunt launch assets ready

**By End of Month 4** (after Phase 6):
- ✅ Public beta launched (Product Hunt, HN)
- ✅ 500+ total signups
- ✅ 50+ paying subscribers ($950+ MRR at $19/mo)
- ✅ Portfolio case study complete (dogfooding)
- ✅ 3+ client/job inquiries from portfolio

---

## Portfolio Value Proposition

This project demonstrates:

**For Clients** (Freelance/Consulting):
- Full-stack TypeScript expertise (Next.js, Fastify, PostgreSQL, Redis)
- Hexagonal architecture mastery (clean, testable, maintainable)
- Schema-first design (Zod, type safety, validation)
- Payment integration (Stripe, subscription billing)
- Deployment proficiency (Vercel, managed DBs, CI/CD)
- Product thinking (identified problem, built solution, dogfooding)

**For Employers** (Job Applications):
- Built real product (not just toy project)
- End-to-end ownership (design, implementation, deployment, marketing)
- Revenue generation (freemium SaaS with paying customers)
- Community building (beta program, Discord, open source)
- Writing/communication (blog posts, docs, case study)
- Unique perspective (theatrical metaphor, anti-resume philosophy)

**For Thought Leadership**:
- Novel concept (theatrical CV, mask-based identity)
- Technical depth (blockchain verification, DIDs/VCs, hexagonal architecture)
- Provocative stance (inverting interviews, anti-resume manifesto)
- Open source contributions (accepting PRs, community masks)
- Content library (12+ blog posts, architecture docs, demo video)

---

## Next Steps (Immediate Actions)

1. **Set up Vercel account**, link GitHub repo
2. **Create Stripe account** (test mode), get API keys
3. **Register domain** (e.g., `inmidstmylife.com`)
4. **Create Neon/Supabase account**, provision Postgres database
5. **Create Upstash account**, provision Redis database
6. **Start Phase 1, Task 1**: Stripe integration (backend routes)

---

## Verification Plan

After implementation, verify end-to-end:

1. **Monetization Flow**:
   - Sign up as free user
   - Try to use Hunter Protocol → see upgrade prompt
   - Click "Upgrade to Pro"
   - Complete Stripe Checkout
   - Verify subscription status in billing page
   - Access Hunter Protocol → works
   - Cancel subscription via Stripe Customer Portal
   - Verify Hunter Protocol blocked again

2. **Deployment Flow**:
   - Push code to GitHub `main` branch
   - GitHub Actions runs tests
   - Vercel deploys automatically
   - Visit production URL → landing page loads
   - Create profile → data persists in Neon DB
   - Generate narrative → cached in Upstash Redis
   - Export PDF → downloads successfully

3. **Portfolio Flow**:
   - Visit landing page → clear value prop, pricing visible
   - Watch demo video → understand product in 2 min
   - Read user guide → can create first mask
   - Check API docs → Swagger UI works, can test endpoints
   - Read case study → see dogfooding narrative

4. **Analytics Flow**:
   - Log in as admin
   - Visit `/app/admin/analytics`
   - See user signups chart (ascending)
   - See feature adoption (masks created, exports, Hunter usage)
   - See revenue metrics (MRR, churn, LTV)

5. **Launch Flow**:
   - Submit to Product Hunt
   - Post to Hacker News Show HN
   - Tweet announcement thread
   - Send email to beta list
   - Monitor signups spike
   - Respond to feedback within 1 hour
   - Ship bug fix within 24 hours

---

## Timeline Visualization

```
Month 1          Month 2          Month 3          Month 4
Week 1 2 3 4     Week 5 6 7 8     Week 9 10 11 12  Week 13 14 15 16
━━━━━━━━━━━━     ━━━━━━━━━━━━     ━━━━━━━━━━━━━━   ━━━━━━━━━━━━━━━━
[Stripe ]        [Deploy   ]      [Marketing  ]    [Launch]
[Feature Gates]  [Neon/Upst]      [Community  ]    [Iterate]
  [Landing Page] [UX Polish ]     [Content    ]
  [Docs/Video  ] [PDF/GraphQL]    [Beta Program]
                 [Analytics  ]    [Launch Prep]
```

---

**End of Plan**

This roadmap takes the 90% complete system to deployed, monetized, and portfolio-ready in 3-4 months. The parallel work streams allow AI assistants to tackle multiple phases simultaneously, reducing wall time. The critical path ensures no blockers delay public launch. Success metrics provide clear milestones to track progress toward the goal: income generation + comprehensive portfolio piece.
