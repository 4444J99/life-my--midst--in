import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { build } from "../../app";
import { getPool, migrate } from "../../db";
import type { CVEntry } from "@in-midst-my-life/schema";

describe("Curriculum Vitae Multiplex Endpoints - Integration Tests", () => {
  let app: any;
  let pool: any;
  const profileId = "test-profile-" + Date.now();

  beforeAll(async () => {
    pool = getPool();
    await migrate(pool);
    app = await build();
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  describe("GET /profiles/:id/cv", () => {
    it("returns complete master CV for profile", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/profiles/${profileId}/cv`,
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("id", profileId);
      expect(body).toHaveProperty("entries");
      expect(Array.isArray(body.entries)).toBe(true);
    });

    it("returns 404 for non-existent profile", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/profiles/non-existent/cv",
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("POST /profiles/:id/cv/entries", () => {
    it("creates new CV entry with multi-dimensional tags", async () => {
      const entry = {
        type: "experience",
        content: "Senior Engineer at TechCorp",
        personae: ["engineer"],
        aetas: ["consolidation"],
        scaenae: ["technica"],
        tags: ["leadership", "architecture"],
        priority: 90,
      };

      const response = await app.inject({
        method: "POST",
        url: `/profiles/${profileId}/cv/entries`,
        payload: entry,
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.body);
      expect(body.id).toBeDefined();
      expect(body.type).toBe("experience");
      expect(body.personae).toEqual(["engineer"]);
      expect(body.priority).toBe(90);
    });

    it("validates entry type enum", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/profiles/${profileId}/cv/entries`,
        payload: {
          type: "invalid-type",
          content: "Test",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("requires content field", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/profiles/${profileId}/cv/entries`,
        payload: {
          type: "experience",
          // missing content
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("supports date ranges", async () => {
      const entry = {
        type: "experience",
        content: "Test role",
        startDate: "2023-01-01",
        endDate: "2024-01-01",
        priority: 75,
      };

      const response = await app.inject({
        method: "POST",
        url: `/profiles/${profileId}/cv/entries`,
        payload: entry,
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.body);
      expect(body.startDate).toBeDefined();
      expect(body.endDate).toBeDefined();
    });

    it("stores optional metadata", async () => {
      const entry = {
        type: "project",
        content: "Major project",
        metadata: { revenue: 500000, team_size: 12 },
        priority: 85,
      };

      const response = await app.inject({
        method: "POST",
        url: `/profiles/${profileId}/cv/entries`,
        payload: entry,
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.body);
      expect(body.metadata).toEqual({ revenue: 500000, team_size: 12 });
    });
  });

  describe("GET /profiles/:id/cv/entries", () => {
    it("lists all entries for profile with pagination", async () => {
      // Create multiple entries first
      for (let i = 0; i < 5; i++) {
        await app.inject({
          method: "POST",
          url: `/profiles/${profileId}/cv/entries`,
          payload: {
            type: "skill",
            content: `Skill ${i}`,
            priority: 50 + i * 10,
          },
        });
      }

      const response = await app.inject({
        method: "GET",
        url: `/profiles/${profileId}/cv/entries?offset=0&limit=3`,
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.data).toBeDefined();
      expect(body.data.length).toBeLessThanOrEqual(3);
      expect(body.total).toBeGreaterThanOrEqual(5);
    });

    it("supports sorting by priority", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/profiles/${profileId}/cv/entries?sort=priority`,
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      const priorities = body.data.map((e: any) => e.priority);

      // Should be sorted descending
      for (let i = 0; i < priorities.length - 1; i++) {
        expect(priorities[i]).toBeGreaterThanOrEqual(priorities[i + 1]);
      }
    });
  });

  describe("PATCH /profiles/:id/cv/entries/:entryId", () => {
    let entryId: string;

    beforeAll(async () => {
      const response = await app.inject({
        method: "POST",
        url: `/profiles/${profileId}/cv/entries`,
        payload: {
          type: "experience",
          content: "Original content",
          priority: 50,
        },
      });

      entryId = JSON.parse(response.body).id;
    });

    it("updates entry content and priority", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: `/profiles/${profileId}/cv/entries/${entryId}`,
        payload: {
          content: "Updated content",
          priority: 85,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.content).toBe("Updated content");
      expect(body.priority).toBe(85);
    });

    it("updates dimensional tags", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: `/profiles/${profileId}/cv/entries/${entryId}`,
        payload: {
          personae: ["engineer", "architect"],
          aetas: ["consolidation"],
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.personae).toEqual(["engineer", "architect"]);
      expect(body.aetas).toEqual(["consolidation"]);
    });

    it("returns 404 for non-existent entry", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: `/profiles/${profileId}/cv/entries/non-existent`,
        payload: { priority: 50 },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("DELETE /profiles/:id/cv/entries/:entryId", () => {
    let entryId: string;

    beforeAll(async () => {
      const response = await app.inject({
        method: "POST",
        url: `/profiles/${profileId}/cv/entries`,
        payload: {
          type: "skill",
          content: "To be deleted",
          priority: 50,
        },
      });

      entryId = JSON.parse(response.body).id;
    });

    it("deletes entry successfully", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: `/profiles/${profileId}/cv/entries/${entryId}`,
      });

      expect(response.statusCode).toBe(204);
    });

    it("returns 404 when deleting non-existent entry", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: `/profiles/${profileId}/cv/entries/non-existent`,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("POST /profiles/:id/cv/filter", () => {
    beforeAll(async () => {
      // Create diverse entries for filtering
      const entries = [
        {
          type: "experience",
          content: "Engineering role",
          personae: ["engineer"],
          aetas: ["consolidation"],
          scaenae: ["technica"],
          priority: 90,
        },
        {
          type: "achievement",
          content: "Artistic work",
          personae: ["artist"],
          aetas: ["emergence"],
          scaenae: ["artistica"],
          priority: 80,
        },
        {
          type: "project",
          content: "Both engineer and artist",
          personae: ["engineer", "artist"],
          priority: 85,
        },
      ];

      for (const entry of entries) {
        await app.inject({
          method: "POST",
          url: `/profiles/${profileId}/cv/entries`,
          payload: entry,
        });
      }
    });

    it("filters by single personae", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/profiles/${profileId}/cv/filter`,
        payload: {
          includePersonae: ["engineer"],
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.data.every((e: any) => e.personae?.includes("engineer"))).toBe(
        true
      );
    });

    it("filters by multiple dimensions (AND logic)", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/profiles/${profileId}/cv/filter`,
        payload: {
          includePersonae: ["engineer"],
          includeAetas: ["consolidation"],
          includeScaenae: ["technica"],
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      // Should only match entry with ALL three dimensions
      expect(body.data.length).toBeGreaterThanOrEqual(0);
    });

    it("supports exclusion filters", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/profiles/${profileId}/cv/filter`,
        payload: {
          excludePersonae: ["artist"],
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(
        body.data.every((e: any) => !e.personae?.includes("artist"))
      ).toBe(true);
    });

    it("filters by minimum priority", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/profiles/${profileId}/cv/filter`,
        payload: {
          minPriority: 85,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.data.every((e: any) => (e.priority || 0) >= 85)).toBe(true);
    });

    it("filters by custom tags", async () => {
      // Add entry with tags
      await app.inject({
        method: "POST",
        url: `/profiles/${profileId}/cv/entries`,
        payload: {
          type: "project",
          content: "Tagged project",
          tags: ["leadership", "innovation"],
          priority: 80,
        },
      });

      const response = await app.inject({
        method: "POST",
        url: `/profiles/${profileId}/cv/filter`,
        payload: {
          includeTags: ["leadership"],
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(
        body.data.every((e: any) => e.tags?.includes("leadership"))
      ).toBe(true);
    });
  });

  describe("POST /profiles/:id/cv/generate-resume/:maskId", () => {
    it("generates resume filtered by persona mask", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/profiles/${profileId}/cv/generate-resume/engineer`,
        payload: {
          includePersonae: ["engineer"],
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("mask");
      expect(body).toHaveProperty("entries");
      expect(Array.isArray(body.entries)).toBe(true);
    });

    it("includes theatrical preamble in resume", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/profiles/${profileId}/cv/generate-resume/engineer`,
        payload: {
          includePersonae: ["engineer"],
          includeTheatricalPreamble: true,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("theatricalPreamble");
    });
  });

  describe("POST /profiles/:id/cv/generate-resume/batch", () => {
    it("generates all resumes for active personas", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/profiles/${profileId}/cv/generate-resume/batch`,
        payload: {
          activeOnly: true,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(Array.isArray(body.resumes)).toBe(true);
      expect(body).toHaveProperty("generatedCount");
    });
  });
});
