import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { build } from "../../app";
import { getPool, migrate } from "../../db";

describe("Narratives Endpoints - Integration Tests", () => {
  let app: any;
  let pool: any;
  const profileId = "test-profile-" + Date.now();
  const personaId = "test-persona-" + Date.now();

  beforeAll(async () => {
    pool = getPool();
    await migrate(pool);
    app = await build();

    // Create test persona first
    await app.inject({
      method: "POST",
      url: `/profiles/${profileId}/personae`,
      payload: {
        nomen: "Test Persona",
        everyday_name: "Test",
        role_vector: "Testing",
        tone_register: "Analytical",
        visibility_scope: ["Technica"],
      },
    });
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  describe("GET /profiles/:id/narrative/:maskId", () => {
    it("returns narrative blocks with theatrical framing", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/profiles/${profileId}/narrative/${personaId}`,
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("blocks");
      expect(Array.isArray(body.blocks)).toBe(true);
      expect(body).toHaveProperty("theatricalPreamble");
      expect(body).toHaveProperty("authenticDisclaimier");
    });

    it("includes theatrical metadata for each block", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/profiles/${profileId}/narrative/${personaId}`,
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      if (body.blocks.length > 0) {
        const block = body.blocks[0];
        expect(block).toHaveProperty("theatrical_metadata");
        expect(block.theatrical_metadata).toHaveProperty("scaena");
      }
    });

    it("returns 404 for non-existent persona", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/profiles/${profileId}/narrative/non-existent`,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("POST /profiles/:id/narrative/:maskId", () => {
    it("updates narrative blocks with theatrical metadata", async () => {
      const narrativeUpdate = {
        blocks: [
          {
            title: "Professional Journey",
            content: "Started as junior developer...",
            weight: 85,
            theatrical_metadata: {
              scaena: "technica",
              performance_note: "Technical expertise",
              authentic_caveat: "Emphasizes engineering background",
            },
          },
        ],
        theatricalPreamble: "The following presents me as Engineer",
        authenticDisclaimier: "Emphasizes technical skills; de-emphasizes arts",
      };

      const response = await app.inject({
        method: "POST",
        url: `/profiles/${profileId}/narrative/${personaId}`,
        payload: narrativeUpdate,
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.blocks).toHaveLength(1);
      expect(body.blocks[0].title).toBe("Professional Journey");
      expect(body.theatricalPreamble).toContain("Engineer");
    });

    it("stores theatrical preamble override", async () => {
      const preamble = "Custom theatrical preamble for this presentation";

      const response = await app.inject({
        method: "POST",
        url: `/profiles/${profileId}/narrative/${personaId}`,
        payload: {
          theatricalPreamble: preamble,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.theatricalPreamble).toBe(preamble);
    });

    it("stores authentic disclaimer (transparency about curation)", async () => {
      const disclaimer =
        "This presentation emphasizes technical work; de-emphasizes personal context";

      const response = await app.inject({
        method: "POST",
        url: `/profiles/${profileId}/narrative/${personaId}`,
        payload: {
          authenticDisclaimier: disclaimer,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.authenticDisclaimier).toBe(disclaimer);
    });

    it("validates block structure", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/profiles/${profileId}/narrative/${personaId}`,
        payload: {
          blocks: [
            {
              title: "Block",
              content: "Content",
              weight: 150, // Invalid: should be 0-100
            },
          ],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("supports performance notes for theatrical context", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/profiles/${profileId}/narrative/${personaId}`,
        payload: {
          blocks: [
            {
              title: "Experience",
              content: "5 years of software engineering",
              weight: 80,
              theatrical_metadata: {
                scaena: "technica",
                performance_note: "This persona emphasizes technical depth",
                authentic_caveat: "Deemphasizes non-technical accomplishments",
              },
            },
          ],
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.blocks[0].theatrical_metadata.performance_note).toBe(
        "This persona emphasizes technical depth"
      );
    });

    it("supports authentic caveats (transparency)", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/profiles/${profileId}/narrative/${personaId}`,
        payload: {
          blocks: [
            {
              title: "Creative Work",
              content: "Published short stories and essays",
              weight: 75,
              theatrical_metadata: {
                scaena: "artistica",
                authentic_caveat:
                  "This presentation emphasizes creative expression; de-emphasizes technical problem-solving",
              },
            },
          ],
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(
        body.blocks[0].theatrical_metadata.authentic_caveat
      ).toBeDefined();
    });
  });

  describe("Narrative generation with AI", () => {
    it("generates narrative blocks from CV entries when requested", async () => {
      // First add a CV entry
      await app.inject({
        method: "POST",
        url: `/profiles/${profileId}/cv/entries`,
        payload: {
          type: "experience",
          content: "Senior Engineer at TechCorp (2023-2024)",
          personae: [personaId],
          priority: 90,
        },
      });

      const response = await app.inject({
        method: "POST",
        url: `/profiles/${profileId}/narrative/${personaId}`,
        payload: {
          autoGenerate: true,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.blocks).toBeDefined();
      if (body.blocks.length > 0) {
        expect(body.blocks[0]).toHaveProperty("title");
        expect(body.blocks[0]).toHaveProperty("content");
      }
    });

    it("generates theatrical preamble if not provided", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/profiles/${profileId}/narrative/${personaId}`,
        payload: {
          autoGeneratePreamble: true,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.theatricalPreamble).toBeDefined();
      expect(typeof body.theatricalPreamble).toBe("string");
    });
  });

  describe("Narrative export formats", () => {
    beforeAll(async () => {
      // Setup narrative with blocks
      await app.inject({
        method: "POST",
        url: `/profiles/${profileId}/narrative/${personaId}`,
        payload: {
          blocks: [
            {
              title: "Professional Background",
              content: "10+ years in software development",
              weight: 90,
            },
          ],
          theatricalPreamble: "The Engineer",
        },
      });
    });

    it("exports narrative as JSON-LD for semantic web", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/profiles/${profileId}/narrative/${personaId}/export/jsonld`,
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body["@context"]).toBeDefined();
      expect(body["@type"]).toBe("Person");
    });

    it("exports narrative as markdown", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/profiles/${profileId}/narrative/${personaId}/export/markdown`,
      });

      expect(response.statusCode).toBe(200);

      // Should return markdown content
      expect(typeof response.body).toBe("string");
      expect(response.body).toContain("#");
    });

    it("exports narrative with theatrical framing preserved", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/profiles/${profileId}/narrative/${personaId}`,
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.theatricalPreamble).toContain("Engineer");
    });
  });

  describe("Multi-mask narrative context", () => {
    it("maintains separate narratives for different personas/masks", async () => {
      const persona2Id = "persona2-" + Date.now();

      // Create second persona narrative
      await app.inject({
        method: "POST",
        url: `/profiles/${profileId}/narrative/${persona2Id}`,
        payload: {
          blocks: [
            {
              title: "Artistic Journey",
              content: "Visual artist and designer",
              weight: 80,
            },
          ],
          theatricalPreamble: "The Artist",
        },
      });

      // Fetch first persona narrative
      const response1 = await app.inject({
        method: "GET",
        url: `/profiles/${profileId}/narrative/${personaId}`,
      });

      // Fetch second persona narrative
      const response2 = await app.inject({
        method: "GET",
        url: `/profiles/${profileId}/narrative/${persona2Id}`,
      });

      const body1 = JSON.parse(response1.body);
      const body2 = JSON.parse(response2.body);

      // Preambles should be different
      expect(body1.theatricalPreamble).not.toBe(body2.theatricalPreamble);
    });
  });
});
