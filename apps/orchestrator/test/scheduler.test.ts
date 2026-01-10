import { describe, expect, it } from "vitest";
import { TaskScheduler } from "../src/scheduler";
import { InMemoryTaskQueue } from "../src/queue";
import { InMemoryTaskStore } from "../src/persistence";
import { createRunStore } from "../src/runs";

describe("task scheduler", () => {
  it("creates a run and enqueues role tasks", async () => {
    const queue = new InMemoryTaskQueue();
    const store = new InMemoryTaskStore();
    const runStore = createRunStore({ kind: "memory" });
    const scheduler = new TaskScheduler(queue, store, runStore, {
      roles: ["architect", "reviewer"],
      description: "Scheduled test run"
    });

    await scheduler.tickOnce();

    const runs = await runStore.list(0, 10);
    expect(runs.total).toBe(1);
    const run = runs.data[0]!;
    expect(run.taskIds).toHaveLength(2);

    const tasks = await store.all();
    expect(tasks).toHaveLength(2);
    expect(tasks.every((task) => task.runId === run.id)).toBe(true);
    expect(await queue.size()).toBe(2);
  });
});
