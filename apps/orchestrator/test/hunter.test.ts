import { describe, it, expect, beforeEach, vi } from "vitest";
import { HunterAgent } from "../src/agents/hunter";
import { MockJobSearchProvider } from "@in-midst-my-life/core";
import type { AgentTask } from "../src/agents";

// Mock global fetch for API calls
global.fetch = vi.fn();

describe("HunterAgent", () => {
  let hunter: HunterAgent;

  beforeEach(() => {
    // Mock fetch to return a test profile
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes("/profiles/profile-123")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: "profile-123",
            skills: ["TypeScript", "React", "JavaScript", "HTML", "CSS", "Git"],
            education: [],
            experience: [],
            certifications: []
          })
        });
      }
      return Promise.reject(new Error(`Unexpected fetch to ${url}`));
    });

    hunter = new HunterAgent({
      searchProvider: new MockJobSearchProvider(),
      apiBaseUrl: "http://localhost:3001"
    });
  });

  it("should have hunter role", () => {
    expect(hunter.role).toBe("hunter");
  });

  describe("find_jobs", () => {
    it("should find jobs with given keywords", async () => {
      const task: AgentTask = {
        id: "test-find-jobs",
        role: "hunter",
        description: "Find TypeScript jobs",
        payload: {
          profileId: "profile-123",
          action: "find_jobs",
          keywords: ["typescript", "developer"],
          location: "Remote"
        }
      };

      const result = await hunter.execute(task);

      expect(result.taskId).toBe("test-find-jobs");
      expect(result.status).toBe("completed");
      expect(result.output).toBeDefined();
      expect((result.output as any)?.count).toBeGreaterThanOrEqual(0);
    });

    it("should fail without keywords", async () => {
      const task: AgentTask = {
        id: "test-find-jobs-no-keywords",
        role: "hunter",
        description: "Find jobs without keywords",
        payload: {
          profileId: "profile-123",
          action: "find_jobs",
          keywords: []
        }
      };

      const result = await hunter.execute(task);

      expect(result.status).toBe("failed");
      expect(result.notes).toContain("No keywords provided");
    });
  });

  describe("analyze_gap", () => {
    it("should analyze skill gaps", async () => {
      const jobDescription = `
        We're looking for a Senior TypeScript Developer with:
        - 5+ years TypeScript experience
        - React expertise
        - Node.js backend skills
        - PostgreSQL knowledge
        - Docker/Kubernetes
      `;

      const task: AgentTask = {
        id: "test-analyze-gap",
        role: "hunter",
        description: "Analyze skill gap",
        payload: {
          profileId: "profile-123",
          action: "analyze_gap",
          jobDescription
        }
      };

      const result = await hunter.execute(task);

      expect(result.taskId).toBe("test-analyze-gap");
      expect(result.status).toBe("completed");
      expect(result.output).toBeDefined();

      const gap = result.output as any;
      expect(gap.required).toBeDefined();
      expect(Array.isArray(gap.required)).toBe(true);
      expect(gap.importance).toMatch(/critical|high|medium|low/);
    });

    it("should fail without job description", async () => {
      const task: AgentTask = {
        id: "test-analyze-gap-no-desc",
        role: "hunter",
        description: "Analyze gap without description",
        payload: {
          profileId: "profile-123",
          action: "analyze_gap"
        }
      };

      const result = await hunter.execute(task);

      expect(result.status).toBe("failed");
      expect(result.notes).toContain("No job description provided");
    });
  });

  describe("tailor_resume", () => {
    it("should handle missing job posting gracefully", async () => {
      const task: AgentTask = {
        id: "test-tailor-no-job",
        role: "hunter",
        description: "Tailor resume without job",
        payload: {
          profileId: "profile-123",
          action: "tailor_resume"
        }
      };

      const result = await hunter.execute(task);

      expect(result.status).toBe("failed");
      expect(result.notes).toContain("No job posting ID provided");
    });
  });

  describe("write_cover_letter", () => {
    it("should handle missing job posting gracefully", async () => {
      const task: AgentTask = {
        id: "test-write-cover-no-job",
        role: "hunter",
        description: "Write cover letter without job",
        payload: {
          profileId: "profile-123",
          action: "write_cover_letter"
        }
      };

      const result = await hunter.execute(task);

      expect(result.status).toBe("failed");
      expect(result.notes).toContain("No job posting ID provided");
    });
  });

  describe("unknown action", () => {
    it("should fail with unknown action", async () => {
      const task: AgentTask = {
        id: "test-unknown",
        role: "hunter",
        description: "Unknown action",
        payload: {
          profileId: "profile-123",
          action: "unknown_action"
        }
      };

      const result = await hunter.execute(task);

      expect(result.status).toBe("failed");
      expect(result.notes).toContain("Unknown hunter action");
    });
  });
});

describe("MockJobSearchProvider", () => {
  let provider: MockJobSearchProvider;

  beforeEach(() => {
    provider = new MockJobSearchProvider();
  });

  it("should search jobs by keywords", async () => {
    const results = await provider.search({
      keywords: ["typescript"],
      limit: 10
    });

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty("title");
    expect(results[0]).toHaveProperty("company");
  });

  it("should filter by location", async () => {
    const results = await provider.search({
      keywords: ["engineer"],
      location: "San Francisco, CA",
      limit: 5
    });

    expect(results.every((job) => job.location?.includes("San Francisco") || job.location === "San Francisco, CA")).toBe(
      true
    );
  });

  it("should respect limit parameter", async () => {
    const results = await provider.search({
      keywords: ["developer"],
      limit: 3
    });

    expect(results.length).toBeLessThanOrEqual(3);
  });

  it("should return null for getById", async () => {
    const result = await provider.getById("any-id");

    expect(result).toBeNull();
  });
});
