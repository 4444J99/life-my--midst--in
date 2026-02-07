# 🎭 Phase 0 Daily Standup

**Timeline**: Week 1-2 (12 EU total)
**Goal**: Complete Hunter Protocol (6 EU) + Theatrical UI (6 EU)
**Status**: 🟡 IN PROGRESS

---

## Stream 0A: Hunter Protocol (6 EU)

### ✅ Completed
- [ ] Schema models (hunter-protocol.ts) - Already exist
- [ ] Core logic stubs (compatibility, document gen)
- [ ] Repositories (JobPosting, JobApplication)
- [ ] Services layer (hunter service)
- [ ] API routes wiring
- [ ] Orchestrator integration

### 🟡 In Progress
- ✅ Created foundational scaffolds for both streams
- ✅ Documented integration points with clear TODOs

### ⏳ Blocked
- None yet

### 📝 Notes
- Mock job search provider already implemented (5 sample jobs)
- ProductionJobSearchProvider has stubs for LinkedIn, Indeed, AngelList
- Ready to integrate Serper API when key is available

---

## Stream 0B: Theatrical UI (6 EU)

### ✅ Completed
- [ ] TabulaPersonarum component (mask registry editor)
- [ ] ScaenaeFilter component (stage visibility)
- [ ] AetasTimeline component (D3 interactive timeline)
- [ ] Hooks (useHunterSearch, useJobApplication)
- [ ] Pages (/hunter, /hunter/[jobId], /hunter/tracker)

### 🟡 In Progress
- Creating foundational scaffolds with clear patterns
- Following established component conventions

### ⏳ Blocked
- None yet

### 📝 Notes
- HunterDashboard and BatchApplications already exist
- Can extend existing components or create new ones
- Follow established hook patterns (loading/error/refetch)

---

## Integration Checkpoints

### End of Week 1 (Day 5)
- [ ] Hunter Protocol can find jobs (mock or via Serper)
- [ ] Compatibility analyzer works (multi-dimensional scoring)
- [ ] Resume tailor produces mask-specific output
- [ ] Cover letter generator works
- [ ] TabulaPersonarum UI allows mask CRUD
- [ ] ScaenaeFilter toggles visibility
- [ ] AetasTimeline renders interactively

### End of Week 2 (Day 10)
- [ ] Full Hunter Protocol pipeline end-to-end
- [ ] UI components polished and functional
- [ ] Integration test: Job search → Analyze → Tailor → Cover Letter
- [ ] All tests passing
- [ ] Ready for Phase 1

---

## Dependency Status

### Blocked By
- None (both streams can run independently)

### Blocking
- Phase 1 (Monetization) cannot start until Phase 0 completes

### Cross-Stream Dependencies
- UI will call Hunter Protocol API endpoints
- Both use Profile schema and mask system

---

## Current Metrics

| Metric | Target | Current |
|--------|--------|---------|
| **Hunter Protocol Jobs Found** | 20+ | 0 (mock has 5) |
| **Mask Support** | All 16 masks | 15+ defined |
| **Resume Tailoring** | Per-mask variants | Not tested |
| **Cover Letters** | Template-based | Not implemented |
| **UI Components** | 3 major (tabula, scaenae, aetas) | 0 (scaffolding) |
| **Tests Passing** | 100% | TBD |

---

## Key Files to Focus On

### Stream 0A
```
packages/core/src/hunter-protocol/
├── job-search.ts              ✅ Exists (mock + prod stubs)
├── compatibility-analyzer.ts  🟡 Needs implementation
├── document-generator.ts      🟡 Needs implementation
└── hunter-agent.ts            🟡 Needs wiring

apps/api/src/
├── routes/hunter-protocol.ts  🟡 Needs completion
├── services/hunter.ts         ❌ Needs creation
└── repositories/
    ├── job-posting.ts         ❌ Needs creation
    └── job-application.ts     ❌ Needs creation
```

### Stream 0B
```
apps/web/src/
├── components/
│   ├── TabulaPersonarum.tsx   ❌ Needs creation
│   ├── ScaenaeFilter.tsx      ❌ Needs creation
│   └── AetasTimeline.tsx      ❌ Needs creation
├── hooks/
│   ├── useHunterSearch.ts     ❌ Needs creation
│   └── useJobApplication.ts   ❌ Needs creation
└── app/profiles/[id]/hunter/
    ├── page.tsx               🟡 Needs completion
    ├── [jobId]/page.tsx       ❌ Needs creation
    └── tracker/page.tsx       ❌ Needs creation
```

---

## Latest Updates

**[Today]** - Scaffolding both streams simultaneously
- Created DAILY-STANDUP.md
- Starting with foundational structures
- Will document all TODOs and integration points
- Ready to implement when direction confirmed

