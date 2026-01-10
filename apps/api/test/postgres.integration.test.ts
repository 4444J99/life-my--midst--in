import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { Pool } from "pg";
import { runMigrations, runSeeds } from "../src/repositories/migrations";
import { createProfileRepo } from "../src/repositories/profiles";
import { createMaskRepo } from "../src/repositories/masks";
import { createCvRepos } from "../src/repositories/cv";

const connectionString =
  process.env["INTEGRATION_POSTGRES_URL"] ?? process.env["DATABASE_URL"] ?? process.env["POSTGRES_URL"];

if (!connectionString) {
  describe.skip("postgres profile repo integration", () => {
    it("skipped because INTEGRATION_POSTGRES_URL not set", () => {
      expect(true).toBe(true);
    });
  });
} else {
  describe("postgres profile repo integration", () => {
    const pool = new Pool({ connectionString });
    let repo: ReturnType<typeof createProfileRepo>;
    let maskRepos: ReturnType<typeof createMaskRepo>;
    let cvRepos: ReturnType<typeof createCvRepos>;

    beforeAll(async () => {
      await runMigrations(pool);
      await runSeeds(pool);
      repo = createProfileRepo({ kind: "postgres", pool });
      maskRepos = createMaskRepo({ kind: "postgres", pool });
      cvRepos = createCvRepos({ kind: "postgres", pool });
    });

    afterAll(async () => {
      await pool.end();
    });

    it("runs migrations and seeds", async () => {
      const seeded = await repo.find("00000000-0000-0000-0000-000000000001");
      expect(seeded?.slug).toBe("seed-demo");
    });

    it("persists and lists profiles", async () => {
      const profile = {
        id: "11111111-1111-1111-1111-111111111111",
        identityId: "22222222-2222-2222-2222-222222222222",
        slug: "integration-user",
        displayName: "Integration User",
        isActive: true,
        title: "Engineer",
        headline: "Integration testing",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await repo.add(profile);
      const fetched = await repo.find(profile.id);
      expect(fetched?.displayName).toBe("Integration User");

      const list = await repo.list(0, 10);
      expect(list.total).toBeGreaterThan(0);
    });

    it("lists masks with filters and pagination", async () => {
      const result = await maskRepos.masks.list(0, 5, { ontology: "cognitive" });
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
      expect(result.data.every((m) => m.ontology === "cognitive")).toBe(true);
    });

    it("lists stages with totals", async () => {
      const result = await maskRepos.stages.list(undefined, 0, 2);
      expect(result.data.length).toBeLessThanOrEqual(2);
      expect(result.total).toBeGreaterThan(0);
    });

    it("lists seeded cv entities", async () => {
      const experiences = await cvRepos.experiences.list("00000000-0000-0000-0000-000000000001", 0, 5);
      expect(experiences.total).toBeGreaterThan(0);
      const credentials = await cvRepos.credentials.list("00000000-0000-0000-0000-000000000001", 0, 5);
      expect(credentials.total).toBeGreaterThan(0);
    });
  });
}
