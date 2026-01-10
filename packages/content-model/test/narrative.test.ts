import { describe, expect, it } from "vitest";
import type { Mask, Profile } from "@in-midst-my-life/schema";
import {
  applyMask,
  buildNarrative,
  buildNarrativeOutput,
  buildNarrativeWithTimeline,
  buildNarrativeWithEpochs,
  buildWeightedNarrative,
  EPOCH_TAXONOMY,
  MASK_TAXONOMY,
  renderTimeline,
  renderTimelineForMask,
  scoreMaskForView,
  selectMasksForView
} from "../src/narrative";

const profile: Profile = {
  id: "11111111-1111-1111-1111-111111111111",
  identityId: "22222222-2222-2222-2222-222222222222",
  slug: "demo-profile",
  displayName: "Demo User",
  title: "Builder",
  headline: "Ship fast, learn faster",
  summaryMarkdown: "Seasoned builder across product and engineering.",
  avatarUrl: "https://example.com/avatar.png",
  coverImageUrl: "https://example.com/cover.png",
  locationText: "Remote",
  isActive: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-02T00:00:00.000Z"
};

const mask: Mask = {
  id: "architect",
  name: "Architect",
  ontology: "expressive",
  functional_scope: "system design",
  stylistic_parameters: {
    tone: "assertive",
    rhetorical_mode: "structured",
    compression_ratio: 0.6
  },
  activation_rules: {
    contexts: ["design", "systems"],
    triggers: ["architecture"]
  },
  filters: {
    include_tags: ["design"],
    exclude_tags: [],
    priority_weights: {}
  }
};

describe("content-model narrative helpers", () => {
  it("applies a mask and keeps highlights", () => {
    const masked = applyMask({ profile, mask, highlights: ["design", "systems"] });
    expect(masked.mask?.id).toBe("architect");
    expect(masked.highlights).toContain("design");
  });

  it("builds a narrative block with mask-aware title", () => {
    const blocks = buildNarrative({ profile, mask, tags: ["design"] });
    expect(blocks[0].title).toContain("Architect");
    expect(blocks[0].body).toContain("Seasoned builder");
    expect(blocks[0].tags).toContain("design");
  });

  it("sorts timeline entries descending by default", () => {
    const sorted = renderTimeline(
      [
        { id: "b", title: "Earlier", start: "2020-01-01" },
        { id: "a", title: "Later", start: "2024-01-01" }
      ],
      "desc"
    );
    expect(sorted[0].id).toBe("a");
  });

  it("filters timeline entries by mask include/exclude tags", () => {
    const entries = [
      { id: "1", title: "Design Work", start: "2024-01-01", tags: ["design"] },
      { id: "2", title: "Marketing", start: "2024-02-01", tags: ["marketing"] }
    ];
    const filtered = renderTimelineForMask(entries, mask, { order: "desc" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("1");
  });

  it("pushes timeline entries without valid dates to the end", () => {
    const sorted = renderTimeline(
      [
        { id: "dated", title: "With date", start: "2024-01-01" },
        { id: "missing", title: "Missing date" }
      ],
      "desc"
    );
    expect(sorted[0].id).toBe("dated");
    expect(sorted[1].id).toBe("missing");
  });

  it("keeps explicit stage ids and infers stages when tags overlap", () => {
    const entries = [
      { id: "explicit", title: "Custom Stage", start: "2024-03-01", stageId: "stage/custom" },
      { id: "inferred", title: "Design Work", start: "2024-02-01", tags: ["design", "build"] }
    ];
    const rendered = renderTimelineForMask(entries, mask, { order: "desc" });
    expect(rendered.find((e) => e.id === "explicit")?.stageId).toBe("stage/custom");
    expect(rendered.find((e) => e.id === "inferred")?.stageId).toBe("stage/design");
  });

  it("builds narrative with timeline block", () => {
    const blocks = buildNarrativeWithTimeline({
      profile,
      mask,
      timeline: [
        { id: "1", title: "Design Work", start: "2024-01-01", summary: "Did design", tags: ["design"] }
      ]
    });
    expect(blocks.length).toBeGreaterThan(1);
    expect(blocks[1].title).toBe("Recent Highlights");
    expect(blocks[1].body).toContain("Design Work");
  });

  it("scores masks against contexts and tags", () => {
    const score = scoreMaskForView(mask, { profile, contexts: ["design"], tags: ["design"] });
    expect(score).toBeGreaterThan(0);
  });

  it("selects top masks for a view", () => {
    const otherMask: Mask = {
      ...mask,
      id: "observer",
      name: "Observer",
      filters: { include_tags: ["research"], exclude_tags: [], priority_weights: {} }
    };

    const selected = selectMasksForView({
      profile,
      availableMasks: [otherMask, mask],
      contexts: ["design"],
      tags: ["design"]
    });

    expect(selected[0].id).toBe("architect");
  });

  it("builds narrative with epochs and suggested masks", () => {
    const blocks = buildNarrativeWithEpochs({
      profile,
      mask,
      availableMasks: [mask],
      contexts: ["design"],
      tags: ["design"],
      epochs: [
        { id: "e1", name: "Initiation", order: 1, stages: [{ id: "s1", title: "Start", summary: "Learned basics" }] },
        { id: "e2", name: "Mastery", order: 2, stages: [{ id: "s2", title: "Led systems", summary: "Delivered major redesign" }] }
      ],
      timeline: [{ id: "1", title: "Design Work", start: "2024-01-01", tags: ["design"] }]
    });

    const titles = blocks.map((b) => b.title);
    expect(titles).toContain("Epochs & Stages");
    expect(titles).toContain("Suggested Masks");
  });

  it("builds weighted narrative with templates and stage spotlight", async () => {
    const blocks = await buildWeightedNarrative({
      profile,
      availableMasks: [mask],
      contexts: ["design"],
      tags: ["design"],
      epochs: [
        {
          id: "e1",
          name: "Expansion",
          order: 1,
          stages: [{ id: "s1", title: "Lead Design", summary: "Led key redesign", tags: ["design"] }]
        }
      ],
      timeline: [{ id: "1", title: "Design Work", start: "2024-01-01", tags: ["design"] }]
    });

    const titles = blocks.map((b) => b.title);
    expect(titles).toContain("Stage Spotlight");
    expect(titles).toContain("Mask Focus");
  });

  it("annotates timeline entries with stage inference and weight", () => {
    const entries = [
      { id: "1", title: "Design Work", start: "2024-01-01", summary: "Did design", tags: ["design"] },
      { id: "2", title: "Docs", start: "2024-02-01", summary: "Wrote docs", tags: ["docs"] }
    ];

    const enriched = renderTimelineForMask(entries, mask, { order: "desc", limit: 2 });
    expect(enriched[0].stageId).toBe("stage/design");
    expect(enriched[0].weight).toBeGreaterThan(0);
  });

  it("filters timeline entries by stage and epoch include lists", () => {
    const entries = [
      { id: "1", title: "Design Work", start: "2024-01-01", tags: ["design"] },
      { id: "2", title: "Research", start: "2024-02-01", tags: ["research"] }
    ];
    const rendered = renderTimelineForMask(entries, mask, {
      order: "desc",
      includeStages: ["stage/design"]
    });
    expect(rendered).toHaveLength(1);
    expect(rendered[0].stageId).toBe("stage/design");
  });

  it("builds narrative output with meta arcs", async () => {
    const output = await buildNarrativeOutput({
      profile,
      availableMasks: [mask],
      contexts: ["design"],
      tags: ["design"],
      timeline: [{ id: "1", title: "Design Work", start: "2024-01-01", tags: ["design"] }],
      epochs: EPOCH_TAXONOMY
    });

    expect(output.meta.timeline?.stageArc.length).toBeGreaterThan(0);
    expect(output.meta.timeline?.epochArc.length).toBeGreaterThan(0);
  });

  it("includes SPEC-002/003 templates with personality and sequence", async () => {
    const blocks = await buildWeightedNarrative({
      profile,
      availableMasks: MASK_TAXONOMY,
      contexts: ["design", "analysis"],
      tags: ["design", "analysis", "impact"],
      timeline: [
        { id: "t1", title: "Launch A", start: "2023-01-01", tags: ["design"] },
        { id: "t2", title: "Launch B", start: "2024-01-01", tags: ["analysis"] }
      ],
      epochs: EPOCH_TAXONOMY
    });

    const titles = blocks.map((b) => b.title);
    expect(titles).toContain("Identity Mode");
    expect(titles).toContain("Stage Context");
    const sequenceBlock = blocks.find((b) => b.title === "Timeline Sequence");
    expect(sequenceBlock?.body).toContain("→");
  });
});
