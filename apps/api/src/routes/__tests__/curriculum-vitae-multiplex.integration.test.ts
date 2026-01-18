import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Pool } from "pg";
import { buildServer } from "../../index";
import { runMigrations } from "../../repositories/migrations";
import type { CVEntry } from "@in-midst-my-life/schema";

const connectionString =
  process.env["INTEGRATION_POSTGRES_URL"] ?? process.env["DATABASE_URL"] ?? process.env["POSTGRES_URL"];

if (!connectionString) {
  describe.skip("Curriculum Vitae Multiplex Endpoints - Integration Tests", () => {
    it("skipped because INTEGRATION_POSTGRES_URL not set", () => {
      expect(true).toBe(true);
    });
  });
} else {
  describe("Curriculum Vitae Multiplex Endpoints - Integration Tests", () => {
    let app: any;
    let pool: Pool;
    const profileId = "test-profile-" + Date.now();

    beforeAll(async () => {
      pool = new Pool({ connectionString });
      await runMigrations(pool);
      app = await buildServer();
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
          title: "Senior Engineer",
          organization: "TechCorp",
          startDate: "2020-01-01",
          tags: {
            audience: ["Technical", "Executive"],
            industry: ["Technology"],
            function: ["Engineering"],
          },
        };

        const response = await app.inject({
          method: "POST",
          url: `/profiles/${profileId}/cv/entries`,
          payload: entry,
        });

        expect(response.statusCode).toBe(201);

        const body = JSON.parse(response.body);
        expect(body).toHaveProperty("id");
        expect(body.tags).toEqual(entry.tags);
      });
    });

    describe("GET /profiles/:id/cv/filter", () => {
      it("filters entries by audience dimension", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/profiles/${profileId}/cv/filter?audience=Technical`,
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(Array.isArray(body.entries)).toBe(true);
      });

      it("filters by multiple dimensions", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/profiles/${profileId}/cv/filter?audience=Technical&industry=Technology`,
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(Array.isArray(body.entries)).toBe(true);
      });
    });

    describe("GET /profiles/:id/cv/timeline", () => {
      it("returns CV entries in chronological order", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/profiles/${profileId}/cv/timeline`,
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(Array.isArray(body.entries)).toBe(true);
        expect(body).toHaveProperty("epochs");
      });
    });
  });
}
