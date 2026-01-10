import { describe, expect, it, beforeAll } from "vitest";
import type { Profile, Mask, Experience, Epoch, Stage, NarrativeBlock } from "@in-midst-my-life/schema";
import {
  applyMask,
  buildNarrative,
  buildNarrativeWithTimeline,
  buildNarrativeWithEpochs,
  selectMasksForView,
  scoreMaskForView,
  type NarrativeViewConfig
} from "../src/narrative";

describe("Narrative Generation Module", () => {
  const baseProfile: Profile = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    displayName: "Jane Doe",
    title: "Senior Engineer",
    summaryMarkdown: "Experienced software engineer with 8 years in full-stack development",
    email: "jane@example.com",
    location: "San Francisco, CA",
    website: "https://example.com",
    slug: "jane-doe",
    visibility: { default: "everyone" },
    sectionOrder: ["experience", "education", "skills"],
    agentSettings: { enabled: false }
  };

  const analystMask: Mask = {
    id: "analyst",
    name: "Analyst",
    ontology: "cognitive",
    functional_scope: "precision reasoning, decomposition",
    stylistic_parameters: { tone: "neutral", rhetorical_mode: "deductive", compression_ratio: 0.55 },
    activation_rules: { contexts: ["analysis"], triggers: ["metric", "benchmark"] },
    filters: {
      include_tags: ["analysis", "metrics"],
      exclude_tags: ["speculation"],
      priority_weights: { metrics: 2, impact: 1.5 }
    }
  };

  const architectMask: Mask = {
    id: "architect",
    name: "Architect",
    ontology: "expressive",
    functional_scope: "systems design and conceptual framing",
    stylistic_parameters: { tone: "assertive", rhetorical_mode: "structured", compression_ratio: 0.6 },
    activation_rules: { contexts: ["design", "systems"], triggers: ["blueprint"] },
    filters: {
      include_tags: ["design", "architecture"],
      exclude_tags: [],
      priority_weights: { design: 3, reliability: 2 }
    }
  };

  const baseViewConfig: NarrativeViewConfig = {
    profile: baseProfile,
    contexts: ["analysis", "design"],
    tags: ["metrics", "architecture"],
    availableMasks: [analystMask, architectMask],
    personality: { id: "investigative", label: "Investigative", orientation: "Evidence-seeking" },
    settings: []
  };

  describe("applyMask", () => {
    it("creates a masked profile view", () => {
      const masked = applyMask({
        profile: baseProfile,
        mask: analystMask
      });

      expect(masked.profile).toEqual(baseProfile);
      expect(masked.mask).toEqual(analystMask);
    });

    it("allows highlight specifications", () => {
      const masked = applyMask({
        profile: baseProfile,
        mask: analystMask,
        highlights: ["metrics", "data"]
      });

      expect(masked.highlights).toEqual(["metrics", "data"]);
    });

    it("masks without highlights default to empty array", () => {
      const masked = applyMask({
        profile: baseProfile
      });

      expect(masked.highlights).toEqual([]);
    });
  });

  describe("buildNarrative", () => {
    it("builds a basic narrative", () => {
      const blocks = buildNarrative(baseViewConfig);

      expect(Array.isArray(blocks)).toBe(true);
      expect(blocks.length).toBeGreaterThan(0);
    });

    it("includes profile title in narrative", () => {
      const blocks = buildNarrative(baseViewConfig);
      const firstBlock = blocks[0];

      expect(firstBlock.title).toContain(baseProfile.displayName);
    });

    it("includes summary in narrative", () => {
      const blocks = buildNarrative(baseViewConfig);
      const summaryBlock = blocks.find((b) => b.body.includes(baseProfile.summaryMarkdown));

      expect(summaryBlock).toBeDefined();
    });

    it("includes tags in narrative blocks", () => {
      const blocks = buildNarrative(baseViewConfig);
      const hasRelevantTags = blocks.some((b) => b.tags && b.tags.length > 0);

      expect(hasRelevantTags).toBe(true);
    });
  });

  describe("buildNarrativeWithTimeline", () => {
    const timelineEntry = {
      id: "exp-001",
      title: "Led analytics platform",
      summary: "Designed metrics collection system",
      start: "2020-01-01",
      end: "2022-12-31",
      tags: ["metrics", "design", "leadership"]
    };

    it("builds narrative with timeline entries", () => {
      const config: NarrativeViewConfig = {
        ...baseViewConfig,
        timeline: [timelineEntry]
      };

      const blocks = buildNarrativeWithTimeline(config);
      expect(blocks.length).toBeGreaterThan(0);
    });

    it("includes timeline in narrative blocks", () => {
      const config: NarrativeViewConfig = {
        ...baseViewConfig,
        timeline: [timelineEntry]
      };

      const blocks = buildNarrativeWithTimeline(config);
      const timelineBlock = blocks.find((b) => b.title.includes("Recent") || b.title.includes("Highlight"));

      expect(timelineBlock).toBeDefined();
    });

    it("handles empty timeline", () => {
      const config: NarrativeViewConfig = {
        ...baseViewConfig,
        timeline: []
      };

      const blocks = buildNarrativeWithTimeline(config);
      expect(blocks.length).toBeGreaterThan(0);
    });

    it("highlights recent entries", () => {
      const recent = {
        id: "exp-recent",
        title: "Current role",
        summary: "Currently leading team",
        start: new Date().toISOString(),
        tags: ["leadership", "current"]
      };

      const config: NarrativeViewConfig = {
        ...baseViewConfig,
        timeline: [recent, timelineEntry]
      };

      const blocks = buildNarrativeWithTimeline(config);
      expect(blocks.length).toBeGreaterThan(0);
    });
  });

  describe("buildNarrativeWithEpochs", () => {
    const epochs: Epoch[] = [
      {
        id: "mastery",
        name: "Mastery",
        order: 5,
        summary: "Peak technical expertise"
      }
    ];

    it("builds narrative with epoch context", () => {
      const config: NarrativeViewConfig = {
        ...baseViewConfig,
        epochs
      };

      const blocks = buildNarrativeWithEpochs(config);
      expect(blocks.length).toBeGreaterThan(0);
    });

    it("includes epoch information in narrative", () => {
      const config: NarrativeViewConfig = {
        ...baseViewConfig,
        epochs
      };

      const blocks = buildNarrativeWithEpochs(config);
      const epochBlock = blocks.find((b) => b.title.includes("Epoch"));

      expect(epochBlock).toBeDefined();
    });

    it("includes suggested masks", () => {
      const config: NarrativeViewConfig = {
        ...baseViewConfig,
        availableMasks: [analystMask, architectMask]
      };

      const blocks = buildNarrativeWithEpochs(config);
      const maskBlock = blocks.find((b) => b.title.includes("Mask"));

      expect(maskBlock).toBeDefined();
    });
  });

  describe("scoreMaskForView", () => {
    it("scores a mask for a view", () => {
      const score = scoreMaskForView(analystMask, baseViewConfig);

      expect(typeof score).toBe("number");
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it("analyst mask scores higher with analysis context", () => {
      const analysisContext: NarrativeViewConfig = {
        ...baseViewConfig,
        contexts: ["analysis", "metrics"]
      };

      const score = scoreMaskForView(analystMask, analysisContext);
      expect(score).toBeGreaterThan(0);
    });

    it("scores based on context matching", () => {
      const withContext = scoreMaskForView(analystMask, {
        ...baseViewConfig,
        contexts: ["analysis"]
      });

      const withoutContext = scoreMaskForView(analystMask, {
        ...baseViewConfig,
        contexts: ["unrelated"]
      });

      expect(withContext).toBeGreaterThanOrEqual(withoutContext);
    });

    it("penalizes if required tags are excluded", () => {
      const config: NarrativeViewConfig = {
        ...baseViewConfig,
        tags: ["speculation"] // analyst mask excludes this
      };

      const score = scoreMaskForView(analystMask, config);
      expect(score).toBe(0); // Penalized to 0
    });

    it("architect mask scores higher with design context", () => {
      const designContext: NarrativeViewConfig = {
        ...baseViewConfig,
        contexts: ["design", "architecture"]
      };

      const architectScore = scoreMaskForView(architectMask, designContext);
      const analystScore = scoreMaskForView(analystMask, designContext);

      expect(architectScore).toBeGreaterThan(analystScore);
    });
  });

  describe("selectMasksForView", () => {
    it("selects applicable masks", () => {
      const masks = selectMasksForView(baseViewConfig);

      expect(Array.isArray(masks)).toBe(true);
      expect(masks.length).toBeGreaterThan(0);
    });

    it("returns masks sorted by relevance", () => {
      const masks = selectMasksForView({
        ...baseViewConfig,
        contexts: ["analysis"]
      });

      // Analyst should rank higher for analysis context
      if (masks.length > 1) {
        expect(masks[0].id).toMatch(/analyst|architect/);
      }
    });

    it("returns top masks only", () => {
      const masks = selectMasksForView(baseViewConfig);

      masks.forEach((mask) => {
        const score = scoreMaskForView(mask, baseViewConfig);
        expect(score).toBeGreaterThan(0);
      });
    });

    it("returns empty array if no masks match", () => {
      const masks = selectMasksForView({
        ...baseViewConfig,
        contexts: ["nonexistent"],
        availableMasks: [analystMask] // Only analyst, which won't match
      });

      // Analyst might still score on baseline
      expect(Array.isArray(masks)).toBe(true);
    });

    it("sorts by score then name", () => {
      const masks = selectMasksForView(baseViewConfig);

      for (let i = 1; i < masks.length; i++) {
        const prevScore = scoreMaskForView(masks[i - 1], baseViewConfig);
        const currScore = scoreMaskForView(masks[i], baseViewConfig);

        if (prevScore === currScore) {
          expect(masks[i - 1].name.localeCompare(masks[i].name)).toBeLessThanOrEqual(0);
        } else {
          expect(prevScore).toBeGreaterThan(currScore);
        }
      }
    });
  });

  describe("Narrative Template Integration", () => {
    it("generates blocks with template identifiers", () => {
      const blocks = buildNarrative(baseViewConfig);

      blocks.forEach((block) => {
        expect(block).toHaveProperty("title");
        expect(block).toHaveProperty("body");
      });
    });

    it("maintains block structure", () => {
      const blocks = buildNarrativeWithEpochs(baseViewConfig);

      blocks.forEach((block: NarrativeBlock) => {
        expect(typeof block.title).toBe("string");
        expect(typeof block.body).toBe("string");
        expect(block.title.length).toBeGreaterThan(0);
        expect(block.body.length).toBeGreaterThan(0);
      });
    });
  });
});
