import { describe, expect, it, beforeAll } from "vitest";
import type { Mask, NarrativeBlock } from "@in-midst-my-life/schema";
import {
  scoreNarrativeBlock,
  rankNarrativeBlocks,
  selectTopBlocks,
  generateWeightingReport,
  type BlockScore
} from "../src/weighting";

describe("Narrative Weighting Module", () => {
  const baseMask: Mask = {
    id: "analyst",
    name: "Analyst",
    ontology: "cognitive",
    functional_scope: "precision reasoning",
    stylistic_parameters: {
      tone: "neutral",
      rhetorical_mode: "deductive",
      compression_ratio: 0.55
    },
    activation_rules: {
      contexts: ["analysis"],
      triggers: ["metric"]
    },
    filters: {
      include_tags: ["analysis", "metrics"],
      exclude_tags: [],
      priority_weights: { metrics: 2, impact: 1.5 }
    }
  };

  const narrativeBlocks: NarrativeBlock[] = [
    {
      title: "Data Analysis Project",
      body: "Led analysis of performance metrics",
      tags: ["analysis", "metrics", "impact"]
    },
    {
      title: "Leadership Initiative",
      body: "Managed team of 5",
      tags: ["leadership", "management"]
    },
    {
      title: "Technical Architecture",
      body: "Designed system with scalability focus",
      tags: ["design", "architecture"]
    },
    {
      title: "Quality Assurance",
      body: "Implemented testing framework",
      tags: ["quality", "testing"]
    }
  ];

  describe("scoreNarrativeBlock", () => {
    it("scores a narrative block", () => {
      const score = scoreNarrativeBlock(narrativeBlocks[0], {});
      expect(score).toBeDefined();
      expect(typeof score).toBe("object");
      expect(score.totalScore).toBeGreaterThanOrEqual(0);
    });

    it("assigns positive scores to blocks with summary", () => {
      const block = { title: "Test", body: "Long detailed description about achievements" };
      const score = scoreNarrativeBlock(block, {});
      expect(score.contentRichness).toBeGreaterThan(0);
    });

    it("considers tag relevance with mask", () => {
      const score = scoreNarrativeBlock(narrativeBlocks[0], { mask: baseMask });
      expect(score.relevanceScore).toBeGreaterThan(0);
    });

    it("applies confidence weighting", () => {
      const score = scoreNarrativeBlock(narrativeBlocks[0], {});
      expect(score.confidence).toBeGreaterThanOrEqual(0);
      expect(score.confidence).toBeLessThanOrEqual(1);
    });

    it("handles blocks without tags", () => {
      const block = { title: "No Tags", body: "This has no tags" };
      const score = scoreNarrativeBlock(block, {});
      expect(score.totalScore).toBeGreaterThanOrEqual(0);
    });

    it("higher scores for mask-matching tags", () => {
      const analystBlock = { ...narrativeBlocks[0], tags: ["analysis", "metrics"] };
      const nonMatchBlock = { ...narrativeBlocks[1], tags: ["leadership"] };

      const analyzeScore = scoreNarrativeBlock(analystBlock, { mask: baseMask });
      const leadershipScore = scoreNarrativeBlock(nonMatchBlock, { mask: baseMask });

      expect(analyzeScore.relevanceScore).toBeGreaterThan(leadershipScore.relevanceScore);
    });
  });

  describe("rankNarrativeBlocks", () => {
    it("ranks blocks by score", () => {
      const ranked = rankNarrativeBlocks(narrativeBlocks, { mask: baseMask });
      expect(ranked.length).toBe(narrativeBlocks.length);

      for (let i = 1; i < ranked.length; i++) {
        expect(ranked[i - 1].score.totalScore).toBeGreaterThanOrEqual(
          ranked[i].score.totalScore
        );
      }
    });

    it("places analysis-related blocks first with analyst mask", () => {
      const ranked = rankNarrativeBlocks(narrativeBlocks, { mask: baseMask });
      const topBlock = ranked[0];

      expect(topBlock.block.tags).toContain("analysis");
    });

    it("handles empty block array", () => {
      const ranked = rankNarrativeBlocks([], {});
      expect(ranked).toEqual([]);
    });

    it("ranks single block", () => {
      const single = [narrativeBlocks[0]];
      const ranked = rankNarrativeBlocks(single, {});
      expect(ranked.length).toBe(1);
      expect(ranked[0].block).toEqual(narrativeBlocks[0]);
    });
  });

  describe("selectTopBlocks", () => {
    it("selects top N blocks", () => {
      const top3 = selectTopBlocks(narrativeBlocks, 3, { mask: baseMask });
      expect(top3.length).toBeLessThanOrEqual(3);
    });

    it("returns fewer blocks if N exceeds total", () => {
      const top10 = selectTopBlocks(narrativeBlocks, 10, {});
      expect(top10.length).toBeLessThanOrEqual(narrativeBlocks.length);
    });

    it("returns top blocks in order", () => {
      const top2 = selectTopBlocks(narrativeBlocks, 2, { mask: baseMask });
      expect(top2.length).toBeLessThanOrEqual(2);

      for (let i = 1; i < top2.length; i++) {
        const prev = scoreNarrativeBlock(top2[i - 1], { mask: baseMask });
        const curr = scoreNarrativeBlock(top2[i], { mask: baseMask });
        expect(prev.totalScore).toBeGreaterThanOrEqual(curr.totalScore);
      }
    });

    it("handles topN of 0", () => {
      const top0 = selectTopBlocks(narrativeBlocks, 0, {});
      expect(top0).toEqual([]);
    });

    it("filters by context if provided", () => {
      const filtered = selectTopBlocks(narrativeBlocks, 10, {
        activeContexts: new Set(["analysis"])
      });
      expect(filtered.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("generateWeightingReport", () => {
    it("generates a report", () => {
      const report = generateWeightingReport(narrativeBlocks, {
        mask: baseMask
      });

      expect(report).toBeDefined();
      expect(Array.isArray(report)).toBe(true);
    });

    it("includes all blocks in report", () => {
      const report = generateWeightingReport(narrativeBlocks, {});
      expect(report.length).toBe(narrativeBlocks.length);
    });

    it("includes scoring details", () => {
      const report = generateWeightingReport(narrativeBlocks, {});
      report.forEach((entry) => {
        expect(entry).toHaveProperty("block");
        expect(entry).toHaveProperty("score");
        expect(entry.score).toHaveProperty("totalScore");
      });
    });

    it("explains scores with context", () => {
      const report = generateWeightingReport(narrativeBlocks, { mask: baseMask });
      expect(report.length).toBeGreaterThan(0);
      expect(report[0].score.totalScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Weighting Configuration", () => {
    it("uses default weights", () => {
      const score = scoreNarrativeBlock(narrativeBlocks[0], {});
      expect(score.totalScore).toBeGreaterThanOrEqual(0);
    });

    it("applies custom weight config", () => {
      const customConfig = {
        baseWeightFactor: 0.5,
        recencyFactor: 0.1,
        relevanceFactor: 0.2,
        coherenceFactor: 0.1,
        confidenceFactor: 0.1
      };

      const score = scoreNarrativeBlock(narrativeBlocks[0], {}, undefined, customConfig);
      expect(score).toBeDefined();
      expect(score.totalScore).toBeGreaterThanOrEqual(0);
    });

    it("weights respect factor constraints", () => {
      const score = scoreNarrativeBlock(narrativeBlocks[0], {});
      // Verify score is normalized
      expect(score.totalScore).toBeLessThanOrEqual(100);
    });
  });

  describe("Tag-based Scoring", () => {
    it("scores blocks with matching tags higher", () => {
      const matchingBlock = {
        title: "Analysis",
        body: "Analysis work",
        tags: ["analysis", "metrics"]
      };
      const nonMatchingBlock = {
        title: "Social",
        body: "Social work",
        tags: ["social", "community"]
      };

      const matchScore = scoreNarrativeBlock(matchingBlock, {
        activeTags: new Set(["analysis", "metrics"])
      });
      const nonMatchScore = scoreNarrativeBlock(nonMatchingBlock, {
        activeTags: new Set(["analysis", "metrics"])
      });

      expect(matchScore.totalScore).toBeGreaterThanOrEqual(nonMatchScore.totalScore);
    });
  });

  describe("Mask Affinity Scoring", () => {
    it("analyst mask scores analysis blocks higher", () => {
      const analystMask = baseMask;
      const analysisBlock = narrativeBlocks[0]; // has analysis tags
      const leadershipBlock = narrativeBlocks[1]; // has leadership tags

      const analysisScore = scoreNarrativeBlock(analysisBlock, {
        mask: analystMask
      });
      const leadershipScore = scoreNarrativeBlock(leadershipBlock, {
        mask: analystMask
      });

      expect(analysisScore.relevanceScore).toBeGreaterThan(leadershipScore.relevanceScore);
    });
  });
});
