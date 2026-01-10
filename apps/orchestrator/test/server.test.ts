import { describe, expect, it } from "vitest";
import { buildOrchestrator } from "../src/server";
import { defaultAgents } from "../src/agents";
import { InMemoryTaskQueue } from "../src/queue";
import { InMemoryTaskStore } from "../src/persistence";

const server = buildOrchestrator(defaultAgents(), {
  queue: new InMemoryTaskQueue(),
  store: new InMemoryTaskStore()
});

describe("orchestrator server", () => {
  it("responds to health", async () => {
    const res = await server.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe("ok");
    expect(body.registry).toBeGreaterThan(0);
  });

  it("queues and dispatches a task", async () => {
    const enqueue = await server.inject({
      method: "POST",
      url: "/tasks",
      payload: {
        id: "task-1",
        role: "architect",
        description: "Design mask selection"
      }
    });
    expect(enqueue.statusCode).toBe(200);

    const dispatch = await server.inject({ method: "POST", url: "/tasks/dispatch" });
    expect(dispatch.statusCode).toBe(200);
    const body = dispatch.json();
    expect(body.dispatched).toBe(true);
    expect(body.result.status).toBe("completed");
  });

  it("lists tasks and serves metrics", async () => {
    const listRes = await server.inject({ method: "GET", url: "/tasks" });
    expect(listRes.statusCode).toBe(200);
    const metrics = await server.inject({ method: "GET", url: "/metrics" });
    expect(metrics.statusCode).toBe(200);
    expect(metrics.body).toContain("# HELP orchestrator_queue_size");
  });

  it("handles GitHub webhook enqueuing", async () => {
    const res = await server.inject({
      method: "POST",
      url: "/webhooks/github",
      payload: { action: "opened" },
      headers: { "x-github-event": "issues" }
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().queued).toBeGreaterThan(0);
  });

  it("updates metadata and returns history", async () => {
    const isolated = buildOrchestrator(defaultAgents(), {
      queue: new InMemoryTaskQueue(),
      store: new InMemoryTaskStore()
    });
    const taskId = "task-meta";
    await isolated.inject({
      method: "POST",
      url: "/tasks",
      payload: { id: taskId, role: "architect", description: "Meta task" }
    });
    const patch = await isolated.inject({
      method: "PATCH",
      url: `/tasks/${taskId}/metadata`,
      payload: { priority: "high" }
    });
    expect(patch.statusCode).toBe(200);
    await isolated.inject({ method: "POST", url: "/tasks/dispatch" });
    const history = await isolated.inject({ method: "GET", url: `/tasks/${taskId}/history` });
    expect(history.statusCode).toBe(200);
    expect((history.json() as any).data.length).toBeGreaterThan(0);
  });

  it("tracks runs and exposes run endpoints", async () => {
    const isolated = buildOrchestrator(defaultAgents(), {
      queue: new InMemoryTaskQueue(),
      store: new InMemoryTaskStore()
    });
    const enqueue = await isolated.inject({
      method: "POST",
      url: "/tasks",
      payload: {
        id: "task-run",
        role: "architect",
        description: "Run tracking"
      }
    });
    expect(enqueue.statusCode).toBe(200);
    const runId = (enqueue.json() as any).runId as string;
    expect(runId).toMatch(/^run-/);

    const runRes = await isolated.inject({ method: "GET", url: `/runs/${runId}` });
    expect(runRes.statusCode).toBe(200);
    const run = (runRes.json() as any).data;
    expect(run.taskIds).toContain("task-run");
    expect(run.status).toBe("queued");

    const runTasks = await isolated.inject({ method: "GET", url: `/runs/${runId}/tasks` });
    expect(runTasks.statusCode).toBe(200);
    expect((runTasks.json() as any).data[0].runId).toBe(runId);

    await isolated.inject({ method: "POST", url: "/tasks/dispatch" });
    const runAfter = await isolated.inject({ method: "GET", url: `/runs/${runId}` });
    expect((runAfter.json() as any).data.status).toBe("completed");

    const runList = await isolated.inject({ method: "GET", url: "/runs?status=completed" });
    expect(runList.statusCode).toBe(200);
    expect((runList.json() as any).total).toBeGreaterThan(0);
  });

  it("returns degraded ready when dependencies fail", async () => {
    const failingQueue = {
      enqueue: async () => undefined,
      dequeue: async () => undefined,
      size: async () => {
        throw new Error("queue down");
      }
    } as any;
    const failingServer = buildOrchestrator(defaultAgents(), {
      queue: failingQueue,
      store: new InMemoryTaskStore()
    });
    const ready = await failingServer.inject({ method: "GET", url: "/ready" });
    expect(ready.statusCode).toBe(503);
  });
});
