import { describe, expect, it } from "vitest";
import { MASK_TAXONOMY, EPOCH_TAXONOMY, STAGE_TAXONOMY, buildWeightedNarrative } from "../src";

describe("content-model exports", () => {
  it("exposes mask and epoch taxonomies", () => {
    expect(MASK_TAXONOMY.length).toBeGreaterThan(3);
    expect(EPOCH_TAXONOMY[0].stages?.length).toBeGreaterThan(0);
    expect(STAGE_TAXONOMY.length).toBeGreaterThan(3);
  });

  it("builds weighted narrative using templates", async () => {
    const narrative = await buildWeightedNarrative({
      profile: {
        id: "p1",
        identityId: "i1",
        slug: "demo",
        displayName: "Demo User",
        title: "Engineer",
        headline: "Testing",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      availableMasks: MASK_TAXONOMY,
      contexts: ["design", "architecture"],
      tags: ["design", "impact"],
      timeline: [
        { id: "t1", title: "Shipped", start: "2023-01-01", summary: "Launched feature", tags: ["delivery", "design"] }
      ],
      epochs: EPOCH_TAXONOMY
    });

    const summaryBlock = narrative.find((b) => b.title === "Summary");
    const evidenceBlock = narrative.find((b) => b.title === "Evidence Trail");
    expect(summaryBlock).toBeTruthy();
    expect(evidenceBlock?.body).toContain("Shipped");
  });
});
