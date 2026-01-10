# Content Model Package

Narrative generation and mask transformation logic.

Responsibilities:
- Map schema entities to narrative blocks
- Handle mask/stage/epoch selection
- Generate context-specific presentations

Current helpers:
- `applyMask` wraps a profile with mask + highlights
- `buildNarrative` creates baseline blocks from a masked profile
- `buildNarrativeOutput` returns narrative blocks + meta context (mask/stage/epoch arcs)
- `renderTimeline` sorts timeline entries
- `renderTimelineForMask` filters timeline by mask tags
- `buildNarrativeWithTimeline` combines summary with recent timeline callouts
