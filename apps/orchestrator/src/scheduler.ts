import { randomUUID } from "node:crypto";
import type { AgentRole, AgentTask } from "./agents";
import type { TaskQueue } from "./queue";
import type { TaskStore } from "./persistence";
import type { RunRecord, RunStore } from "./runs";
import type { TrackedTask } from "./tasks";

export interface SchedulerOptions {
  intervalMs?: number;
  roles?: AgentRole[];
  description?: string;
}

export class TaskScheduler {
  private queue: TaskQueue;
  private store: TaskStore;
  private runStore: RunStore;
  private timer?: NodeJS.Timeout;
  private intervalMs: number;
  private roles: AgentRole[];
  private description: string;

  constructor(queue: TaskQueue, store: TaskStore, runStore: RunStore, opts: SchedulerOptions = {}) {
    this.queue = queue;
    this.store = store;
    this.runStore = runStore;
    this.intervalMs = opts.intervalMs ?? 60_000;
    this.roles = opts.roles ?? ["architect", "implementer", "reviewer"];
    this.description = opts.description ?? "Scheduled orchestrator run";
  }

  start() {
    if (this.timer) return;
    const loop = async () => {
      await this.tick();
      this.timer = setTimeout(loop, this.intervalMs);
    };
    this.timer = setTimeout(loop, this.intervalMs);
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
  }

  async tickOnce() {
    await this.tick();
  }

  private async tick() {
    const runId = `run-${randomUUID()}`;
    const scheduledAt = new Date().toISOString();
    const tasks: AgentTask[] = this.roles.map((role) => ({
      id: `${runId}-${role}`,
      runId,
      role,
      description: `${this.description} (${role})`,
      payload: { runId, scheduledAt, role, source: "schedule" }
    }));

    const run: RunRecord = {
      id: runId,
      type: "schedule",
      status: "queued",
      payload: { scheduledAt, roles: this.roles },
      taskIds: tasks.map((task) => task.id),
      metadata: { source: "scheduler" },
      createdAt: scheduledAt,
      updatedAt: scheduledAt
    };

    await this.runStore.add(run);

    for (const task of tasks) {
      await this.queue.enqueue(task);
      const tracked: TrackedTask = { ...task, status: "queued", attempts: 0, history: [] };
      await this.store.add(tracked);
    }
  }
}
