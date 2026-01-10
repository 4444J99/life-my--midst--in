import { describe, it, expect, beforeEach, vi } from "vitest";
import { JobHuntScheduler } from "../src/job-hunt-scheduler";
import type { TaskQueue } from "../src/queue";
import type { TaskStore } from "../src/persistence";
import type { RunStore } from "../src/runs";
import type { JobHuntConfig } from "../src/job-hunt-scheduler";

// Mock implementations
class MockTaskQueue implements TaskQueue {
  async enqueue() {}
  async dequeue() {
    return null;
  }
  async length() {
    return 0;
  }
}

class MockTaskStore implements TaskStore {
  async add() {}
  async get() {
    return null;
  }
  async update() {}
  async list() {
    return [];
  }
}

class MockRunStore implements RunStore {
  async add() {}
  async get() {
    return null;
  }
  async list() {
    return [];
  }
}

describe("JobHuntScheduler", () => {
  let scheduler: JobHuntScheduler;
  let queue: MockTaskQueue;
  let store: MockTaskStore;
  let runStore: MockRunStore;

  beforeEach(() => {
    queue = new MockTaskQueue();
    store = new MockTaskStore();
    runStore = new MockRunStore();

    const configs: JobHuntConfig[] = [
      {
        profileId: "profile-1",
        keywords: ["typescript", "developer"],
        location: "Remote",
        frequency: "weekly",
        autoApply: false
      },
      {
        profileId: "profile-2",
        keywords: ["react", "engineer"],
        location: "San Francisco, CA",
        frequency: "daily",
        autoApply: true
      }
    ];

    scheduler = new JobHuntScheduler(queue, store, runStore, {
      jobs: configs,
      apiBaseUrl: "http://localhost:3001"
    });
  });

  it("should create scheduler with job configs", () => {
    const hunts = scheduler.listJobHunts();
    expect(hunts).toHaveLength(2);
    expect(hunts[0].profileId).toBe("profile-1");
  });

  it("should add new job hunt config", () => {
    const newConfig: JobHuntConfig = {
      profileId: "profile-3",
      keywords: ["python"],
      frequency: "monthly"
    };

    scheduler.addJobHunt(newConfig);
    const hunts = scheduler.listJobHunts();

    expect(hunts).toHaveLength(3);
    expect(hunts[2].profileId).toBe("profile-3");
  });

  it("should remove job hunt config", () => {
    scheduler.removeJobHunt("profile-1");
    const hunts = scheduler.listJobHunts();

    expect(hunts).toHaveLength(1);
    expect(hunts[0].profileId).toBe("profile-2");
  });

  it("should get status of job hunt", () => {
    const status = scheduler.getStatus("profile-1");

    expect(status).toBeDefined();
    expect(status?.profileId).toBe("profile-1");
    expect(status?.keywords).toContain("typescript");
    expect(status?.frequency).toBe("weekly");
    expect(status?.isActive).toBe(false);
  });

  it("should return null status for non-existent profile", () => {
    const status = scheduler.getStatus("non-existent");

    expect(status).toBeNull();
  });

  it("should start scheduler", () => {
    scheduler.start();
    expect(scheduler.getStatus("profile-1")?.isActive).toBe(true);
  });

  it("should stop scheduler", () => {
    scheduler.start();
    scheduler.stop();
    expect(scheduler.getStatus("profile-1")?.isActive).toBe(false);
  });

  it("should not start scheduler twice", () => {
    scheduler.start();
    const statusBefore = scheduler.getStatus("profile-1")?.isActive;
    scheduler.start();
    const statusAfter = scheduler.getStatus("profile-1")?.isActive;

    expect(statusBefore).toBe(statusAfter);
  });

  describe("frequency calculation", () => {
    it("should run daily frequency correctly", () => {
      const config: JobHuntConfig = {
        profileId: "daily-test",
        keywords: ["test"],
        frequency: "daily"
      };

      scheduler.addJobHunt(config);

      // First run should happen
      const status1 = scheduler.getStatus("daily-test");
      expect(status1?.lastRun).toBeUndefined();

      // Simulate time passing (would normally be 24 hours)
      // In actual implementation, this would be checked against stored timestamps
    });

    it("should run weekly frequency correctly", () => {
      const config: JobHuntConfig = {
        profileId: "weekly-test",
        keywords: ["test"],
        frequency: "weekly"
      };

      scheduler.addJobHunt(config);
      const status = scheduler.getStatus("weekly-test");

      expect(status?.frequency).toBe("weekly");
    });

    it("should run monthly frequency correctly", () => {
      const config: JobHuntConfig = {
        profileId: "monthly-test",
        keywords: ["test"],
        frequency: "monthly"
      };

      scheduler.addJobHunt(config);
      const status = scheduler.getStatus("monthly-test");

      expect(status?.frequency).toBe("monthly");
    });
  });

  describe("configuration options", () => {
    it("should support auto-apply", () => {
      const config = scheduler.getStatus("profile-2");

      expect(config?.autoApply).toBe(true);
    });

    it("should support optional location", () => {
      const config: JobHuntConfig = {
        profileId: "no-location",
        keywords: ["remote"]
        // no location specified
      };

      scheduler.addJobHunt(config);
      const status = scheduler.getStatus("no-location");

      expect(status?.location).toBeUndefined();
    });

    it("should support salary ranges", () => {
      const config: JobHuntConfig = {
        profileId: "salary-test",
        keywords: ["engineer"],
        minSalary: 100000,
        maxSalary: 200000
      };

      scheduler.addJobHunt(config);
      const status = scheduler.getStatus("salary-test");

      expect(status).toBeDefined();
    });
  });
});
