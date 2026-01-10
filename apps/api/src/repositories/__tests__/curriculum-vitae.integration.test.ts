import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  createInMemoryCVMultiplexRepo,
  createPostgresCVMultiplexRepo,
} from "../curriculum-vitae";
import type {
  CurriculumVitaeMultiplex,
  CVEntry,
  CVFilter,
} from "@in-midst-my-life/schema";
import { getPool, migrate } from "../../db";

describe("Curriculum Vitae Multiplex Repository - Integration Tests", () => {
  const profileId = "test-profile-" + Date.now();

  // Test with both implementations
  const repos = {
    inMemory: createInMemoryCVMultiplexRepo(),
    postgres: null as any,
  };

  beforeAll(async () => {
    // Setup PostgreSQL for tests
    if (process.env.INTEGRATION_POSTGRES_URL) {
      const pool = getPool();
      await migrate(pool);
      repos.postgres = createPostgresCVMultiplexRepo(pool);
    }
  });

  afterAll(async () => {
    if (repos.postgres) {
      const pool = getPool();
      await pool.end();
    }
  });

  beforeEach(async () => {
    // Reset in-memory repo
    await repos.inMemory.reset();

    // Clean up test data from PostgreSQL if available
    if (repos.postgres) {
      // Clean test profile
      try {
        const client = await getPool().connect();
        await client.query(
          "DELETE FROM cv_entries WHERE profile_id = $1",
          [profileId]
        );
        await client.query(
          "DELETE FROM curriculum_vitae WHERE profile_id = $1",
          [profileId]
        );
        client.release();
      } catch (e) {
        // Table might not exist in test
      }
    }
  });

  describe("getOrCreate", () => {
    Object.entries(repos).forEach(([repoName, repo]) => {
      if (!repo) return;

      it(`[${repoName}] creates new CV if doesn't exist`, async () => {
        const cv = await repo.getOrCreate(profileId);

        expect(cv).toBeDefined();
        expect(cv.id).toBe(profileId);
        expect(cv.entries).toHaveLength(0);
        expect(cv.version).toBe(1);
      });

      it(`[${repoName}] returns existing CV without duplicating`, async () => {
        const cv1 = await repo.getOrCreate(profileId);
        const cv2 = await repo.getOrCreate(profileId);

        expect(cv1.id).toBe(cv2.id);
        expect(cv2.version).toBe(1);
      });
    });
  });

  describe("addEntry", () => {
    Object.entries(repos).forEach(([repoName, repo]) => {
      if (!repo) return;

      it(`[${repoName}] adds single entry to CV`, async () => {
        const entry = await repo.addEntry(profileId, {
          type: "experience",
          content: "Senior Engineer at TechCorp (2023-2024)",
          priority: 90,
        });

        expect(entry).toBeDefined();
        expect(entry.id).toBeDefined();
        expect(entry.type).toBe("experience");
        expect(entry.priority).toBe(90);
      });

      it(`[${repoName}] supports multi-dimensional tagging`, async () => {
        const entry = await repo.addEntry(profileId, {
          type: "experience",
          content: "Test entry",
          personae: ["persona-1", "persona-2"],
          aetas: ["aetas-1"],
          scaenae: ["scaena-1", "scaena-2"],
          tags: ["leadership", "systems"],
          priority: 75,
        });

        expect(entry.personae).toEqual(["persona-1", "persona-2"]);
        expect(entry.aetas).toEqual(["aetas-1"]);
        expect(entry.scaenae).toEqual(["scaena-1", "scaena-2"]);
        expect(entry.tags).toEqual(["leadership", "systems"]);
      });

      it(`[${repoName}] supports date ranges for entries`, async () => {
        const start = new Date("2023-01-01");
        const end = new Date("2024-01-01");

        const entry = await repo.addEntry(profileId, {
          type: "experience",
          content: "Test role",
          startDate: start,
          endDate: end,
          priority: 80,
        });

        expect(entry.startDate).toBeDefined();
        expect(entry.endDate).toBeDefined();
      });

      it(`[${repoName}] stores metadata for entries`, async () => {
        const entry = await repo.addEntry(profileId, {
          type: "project",
          content: "Major project",
          metadata: { company: "TechCorp", revenue: 500000 },
          priority: 85,
        });

        expect(entry.metadata).toEqual({ company: "TechCorp", revenue: 500000 });
      });
    });
  });

  describe("updateEntry", () => {
    Object.entries(repos).forEach(([repoName, repo]) => {
      if (!repo) return;

      it(`[${repoName}] updates entry content and priority`, async () => {
        const entry = await repo.addEntry(profileId, {
          type: "experience",
          content: "Original content",
          priority: 50,
        });

        const updated = await repo.updateEntry(profileId, entry.id, {
          content: "Updated content",
          priority: 85,
        });

        expect(updated?.content).toBe("Updated content");
        expect(updated?.priority).toBe(85);
      });

      it(`[${repoName}] updates dimensional tags`, async () => {
        const entry = await repo.addEntry(profileId, {
          type: "achievement",
          content: "Test",
          personae: ["persona-1"],
          priority: 75,
        });

        const updated = await repo.updateEntry(profileId, entry.id, {
          personae: ["persona-1", "persona-2"],
          aetas: ["aetas-1", "aetas-2"],
        });

        expect(updated?.personae).toEqual(["persona-1", "persona-2"]);
        expect(updated?.aetas).toEqual(["aetas-1", "aetas-2"]);
      });

      it(`[${repoName}] returns undefined for non-existent entry`, async () => {
        const updated = await repo.updateEntry(profileId, "non-existent", {
          priority: 50,
        });

        expect(updated).toBeUndefined();
      });
    });
  });

  describe("deleteEntry", () => {
    Object.entries(repos).forEach(([repoName, repo]) => {
      if (!repo) return;

      it(`[${repoName}] deletes entry by ID`, async () => {
        const entry = await repo.addEntry(profileId, {
          type: "skill",
          content: "TypeScript",
          priority: 90,
        });

        const deleted = await repo.deleteEntry(profileId, entry.id);
        expect(deleted).toBe(true);

        // Verify it's gone
        const listed = await repo.listEntries(profileId);
        expect(listed.data).not.toContainEqual(
          expect.objectContaining({ id: entry.id })
        );
      });

      it(`[${repoName}] returns false for non-existent entry`, async () => {
        const deleted = await repo.deleteEntry(profileId, "non-existent");
        expect(deleted).toBe(false);
      });
    });
  });

  describe("listEntries with pagination", () => {
    Object.entries(repos).forEach(([repoName, repo]) => {
      if (!repo) return;

      it(`[${repoName}] lists all entries for profile`, async () => {
        for (let i = 0; i < 5; i++) {
          await repo.addEntry(profileId, {
            type: "skill",
            content: `Skill ${i}`,
            priority: 50 + i * 10,
          });
        }

        const result = await repo.listEntries(profileId);
        expect(result.data).toHaveLength(5);
        expect(result.total).toBe(5);
      });

      it(`[${repoName}] supports pagination with offset and limit`, async () => {
        for (let i = 0; i < 10; i++) {
          await repo.addEntry(profileId, {
            type: "skill",
            content: `Skill ${i}`,
            priority: 50,
          });
        }

        const page1 = await repo.listEntries(profileId, undefined, 0, 5);
        expect(page1.data).toHaveLength(5);
        expect(page1.total).toBe(10);

        const page2 = await repo.listEntries(profileId, undefined, 5, 5);
        expect(page2.data).toHaveLength(5);

        // Verify no overlap
        const ids1 = page1.data.map((e) => e.id);
        const ids2 = page2.data.map((e) => e.id);
        expect(new Set([...ids1, ...ids2]).size).toBe(10);
      });
    });
  });

  describe("Multi-dimensional filtering", () => {
    Object.entries(repos).forEach(([repoName, repo]) => {
      if (!repo) return;

      it(`[${repoName}] filters by personae`, async () => {
        await repo.addEntry(profileId, {
          type: "experience",
          content: "Engineering role",
          personae: ["engineer"],
          priority: 90,
        });

        await repo.addEntry(profileId, {
          type: "achievement",
          content: "Artistic achievement",
          personae: ["artist"],
          priority: 80,
        });

        const filtered = await repo.filterByPersonae(profileId, ["engineer"]);
        expect(filtered).toHaveLength(1);
        expect(filtered[0].content).toContain("Engineering");
      });

      it(`[${repoName}] filters by aetas`, async () => {
        await repo.addEntry(profileId, {
          type: "experience",
          content: "Early career",
          aetas: ["initiation"],
          priority: 70,
        });

        await repo.addEntry(profileId, {
          type: "achievement",
          content: "Mid career",
          aetas: ["consolidation"],
          priority: 85,
        });

        const filtered = await repo.filterByAetas(profileId, ["consolidation"]);
        expect(filtered).toHaveLength(1);
        expect(filtered[0].content).toContain("Mid");
      });

      it(`[${repoName}] filters by scaenae`, async () => {
        await repo.addEntry(profileId, {
          type: "project",
          content: "Technical project",
          scaenae: ["technica"],
          priority: 85,
        });

        await repo.addEntry(profileId, {
          type: "project",
          content: "Artistic project",
          scaenae: ["artistica"],
          priority: 75,
        });

        const filtered = await repo.filterByScaenae(profileId, ["technica"]);
        expect(filtered).toHaveLength(1);
        expect(filtered[0].content).toContain("Technical");
      });

      it(`[${repoName}] combines multiple dimension filters (AND logic)`, async () => {
        // Entry matching all
        await repo.addEntry(profileId, {
          type: "experience",
          content: "Perfect match",
          personae: ["engineer"],
          aetas: ["consolidation"],
          scaenae: ["technica"],
          priority: 90,
        });

        // Entry missing aetas
        await repo.addEntry(profileId, {
          type: "experience",
          content: "Missing aetas",
          personae: ["engineer"],
          scaenae: ["technica"],
          priority: 80,
        });

        const filter: CVFilter = {
          includePersonae: ["engineer"],
          includeAetas: ["consolidation"],
          includeScaenae: ["technica"],
        };

        const result = await repo.filterByMultipleDimensions(profileId, filter);
        expect(result.data).toHaveLength(1);
        expect(result.data[0].content).toContain("Perfect");
      });

      it(`[${repoName}] supports exclusion filters`, async () => {
        await repo.addEntry(profileId, {
          type: "skill",
          content: "JavaScript",
          personae: ["junior-dev"],
          priority: 50,
        });

        await repo.addEntry(profileId, {
          type: "skill",
          content: "TypeScript",
          personae: ["senior-dev"],
          priority: 90,
        });

        const filter: CVFilter = {
          excludePersonae: ["junior-dev"],
        };

        const result = await repo.filterByMultipleDimensions(profileId, filter);
        expect(result.data).toHaveLength(1);
        expect(result.data[0].content).toBe("TypeScript");
      });

      it(`[${repoName}] filters by minimum priority`, async () => {
        for (let i = 0; i < 5; i++) {
          await repo.addEntry(profileId, {
            type: "skill",
            content: `Skill ${i}`,
            priority: i * 20,
          });
        }

        const filter: CVFilter = { minPriority: 60 };
        const result = await repo.filterByMultipleDimensions(profileId, filter);
        expect(result.data.every((e) => (e.priority || 0) >= 60)).toBe(true);
      });

      it(`[${repoName}] filters by custom tags`, async () => {
        await repo.addEntry(profileId, {
          type: "project",
          content: "Project A",
          tags: ["leadership", "innovation"],
          priority: 85,
        });

        await repo.addEntry(profileId, {
          type: "project",
          content: "Project B",
          tags: ["technical", "maintenance"],
          priority: 60,
        });

        const filter: CVFilter = {
          includeTags: ["leadership"],
        };

        const result = await repo.filterByMultipleDimensions(profileId, filter);
        expect(result.data).toHaveLength(1);
        expect(result.data[0].content).toBe("Project A");
      });
    });
  });

  describe("Sorting and ordering", () => {
    Object.entries(repos).forEach(([repoName, repo]) => {
      if (!repo) return;

      it(`[${repoName}] returns entries sorted by priority descending`, async () => {
        const priorities = [50, 90, 70, 85, 60];

        for (const priority of priorities) {
          await repo.addEntry(profileId, {
            type: "skill",
            content: `Skill ${priority}`,
            priority,
          });
        }

        const result = await repo.listEntries(profileId);
        const returnedPriorities = result.data.map((e) => e.priority);

        // Should be sorted highest to lowest
        for (let i = 0; i < returnedPriorities.length - 1; i++) {
          expect(returnedPriorities[i]).toBeGreaterThanOrEqual(
            returnedPriorities[i + 1]
          );
        }
      });
    });
  });

  describe("Error handling", () => {
    Object.entries(repos).forEach(([repoName, repo]) => {
      if (!repo) return;

      it(`[${repoName}] handles invalid profile IDs gracefully`, async () => {
        const result = await repo.listEntries("invalid-id");
        expect(result.data).toHaveLength(0);
        expect(result.total).toBe(0);
      });

      it(`[${repoName}] handles concurrent operations`, async () => {
        const promises = [];

        for (let i = 0; i < 10; i++) {
          promises.push(
            repo.addEntry(profileId, {
              type: "skill",
              content: `Concurrent Skill ${i}`,
              priority: 50 + i,
            })
          );
        }

        const entries = await Promise.all(promises);
        expect(entries).toHaveLength(10);

        const result = await repo.listEntries(profileId);
        expect(result.total).toBe(10);
      });
    });
  });
});
