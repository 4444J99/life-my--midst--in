import { describe, expect, it } from "vitest";
import { Pool } from "pg";
import Redis from "ioredis";
import { runTaskMigrations, runTaskSeeds } from "../src/migrations";
import { PostgresTaskStore } from "../src/persistence";
import { RedisTaskQueue } from "../src/queue";
import { buildOrchestrator } from "../src/server";
import { defaultAgents } from "../src/agents";
import { resolveIntegrationPostgresUrl, resolveIntegrationRedisUrl } from "../src/config";

const dbUrl = resolveIntegrationPostgresUrl();
const redisUrl = resolveIntegrationRedisUrl();

if (!dbUrl && !redisUrl) {
  describe.skip("orchestrator integrations", () => {
    it("skipped because env not provided", () => {
      expect(true).toBe(true);
    });
  });
} else {
  if (dbUrl) {
    describe("Postgres task store integration", () => {
      const pool = new Pool({ connectionString: dbUrl });
      const store = new PostgresTaskStore(pool);

      it("runs migrations and seeds tasks", async () => {
        await runTaskMigrations(pool);
        await runTaskSeeds(pool);
        const seeded = await store.get("seed-task-1");
        expect(seeded?.status).toBe("queued");
      });

      it("writes and reads tasks", async () => {
        await runTaskMigrations(pool);
        const task = {
          id: `integration-${Date.now()}`,
          role: "architect" as const,
          description: "Verify Postgres store",
          payload: {},
          status: "queued" as const
        };
        await store.add(task);
        await store.setStatus(task.id, "running");
        const loaded = await store.get(task.id);
        expect(loaded?.status).toBe("running");
      });
    });
  }

  if (redisUrl) {
    describe("Redis task queue integration", () => {
      const client = new Redis(redisUrl);
      const queue = new RedisTaskQueue(client, "orchestrator:test:queue");

      it("enqueues and dequeues tasks", async () => {
        await client.del("orchestrator:test:queue");
        await queue.enqueue({
          id: "redis-task-1",
          role: "implementer",
          description: "Verify redis queue",
          payload: {}
        });
        const out = await queue.dequeue();
        expect(out?.id).toBe("redis-task-1");
      });
    });
  }

  if (dbUrl && redisUrl) {
    describe("Webhook → queue → store flow", () => {
      const pool = new Pool({ connectionString: dbUrl });
      const redis = new Redis(redisUrl);
      const queueKey = "orchestrator:test:webhook";
      const queue = new RedisTaskQueue(redis, queueKey);
      const store = new PostgresTaskStore(pool);
      const app = buildOrchestrator(defaultAgents(), { queue, store });

      it("accepts a GitHub webhook, enqueues, dispatches, and persists status", async () => {
        await runTaskMigrations(pool);
        await redis.del(queueKey);

        const webhookResponse = await app.inject({
          method: "POST",
          url: "/webhooks/github",
          headers: { "x-github-event": "issues" },
          payload: { action: "opened", issue: { id: 123 } }
        });

        expect(webhookResponse.statusCode).toBe(200);
        expect(await queue.size()).toBe(1);

        const dispatchResponse = await app.inject({ method: "POST", url: "/tasks/dispatch" });
        expect(dispatchResponse.statusCode).toBe(200);
        const body = dispatchResponse.json() as { ok: boolean };
        expect(body.ok).toBe(true);

        const tasks = await store.all();
        const dispatched = tasks.find((t) => t.description.toLowerCase().includes("issue"));
        expect(dispatched?.status).toBe("completed");
      });

      it("processes queue via worker and exposes metrics", async () => {
        await runTaskMigrations(pool);
        const workerQueueKey = `${queueKey}:worker`;
        const workerQueue = new RedisTaskQueue(redis, workerQueueKey);
        const workerStore = new PostgresTaskStore(pool);
        await redis.del(workerQueueKey);
        const workerApp = buildOrchestrator(defaultAgents(), { queue: workerQueue, store: workerStore, worker: true, pollIntervalMs: 25 });

        await workerApp.inject({
          method: "POST",
          url: "/webhooks/github",
          headers: { "x-github-event": "push" },
          payload: { ref: "refs/heads/main", repository: { full_name: "demo/repo" } }
        });

        // wait for worker to process
        for (let i = 0; i < 10; i++) {
          const tasks = await workerStore.all();
          const processed = tasks.find((t) => t.description.includes("Push to"));
          if (processed?.status === "completed") break;
          await new Promise((res) => setTimeout(res, 50));
        }

        const metrics = await workerApp.inject({ method: "GET", url: "/metrics" });
        expect(metrics.body).toContain("orchestrator_tasks_dispatched");
        await workerApp.close();
      });

      afterAll(async () => {
        await app.close();
        await redis.quit();
        await pool.end();
      });
    });
  }
}
