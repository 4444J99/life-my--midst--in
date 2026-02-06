import type { Agent } from './agents';
import type { TaskQueue } from './queue';
import type { TaskStore } from './persistence';
import type { AgentTask } from './agents';
import type { TaskStatus } from './tasks';
import { deriveRunStatus, type RunStore } from './runs';
import { FatalError, RateLimitError } from '@in-midst-my-life/core';

export interface WorkerOptions {
  pollIntervalMs?: number;
  maxRetries?: number;
  backoffMs?: number;
  metrics?: WorkerMetrics;
  deadLetterQueue?: TaskQueue;
  runStore?: RunStore;
}

export interface WorkerMetrics {
  enqueued: number;
  dispatched: number;
  completed: number;
  failed: number;
  retries: number;
  deadLettered: number;
}

export const createWorkerMetrics = (): WorkerMetrics => ({
  enqueued: 0,
  dispatched: 0,
  completed: 0,
  failed: 0,
  retries: 0,
  deadLettered: 0,
});

export class TaskWorker {
  private queue: TaskQueue;
  private store: TaskStore;
  private agents: Agent[];
  private runStore?: RunStore;
  private timer?: NodeJS.Timeout;
  private options: Required<Pick<WorkerOptions, 'pollIntervalMs' | 'maxRetries' | 'backoffMs'>> & {
    metrics: WorkerMetrics;
    deadLetterQueue?: TaskQueue;
  };

  constructor(queue: TaskQueue, store: TaskStore, agents: Agent[], opts: WorkerOptions = {}) {
    this.queue = queue;
    this.store = store;
    this.agents = agents;
    this.runStore = opts.runStore;
    this.options = {
      pollIntervalMs: opts.pollIntervalMs ?? 500,
      maxRetries: opts.maxRetries ?? 3,
      backoffMs: opts.backoffMs ?? 2000,
      metrics: opts.metrics ?? createWorkerMetrics(),
      deadLetterQueue: opts.deadLetterQueue,
    };
  }

  start() {
    if (this.timer) return;
    const loop = () => {
      void this.tick().then(() => {
        this.timer = setTimeout(loop, this.options.pollIntervalMs);
      });
    };
    this.timer = setTimeout(loop, this.options.pollIntervalMs);
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
  }

  getMetrics(): WorkerMetrics {
    return this.options.metrics;
  }

  async tickOnce() {
    await this.tick();
  }

  private async tick() {
    const task = await this.queue.dequeue();
    if (!task) return;
    this.options.metrics.dispatched += 1;
    await this.store.setStatus(task.id, 'running');
    await this.updateRunStatus(task, 'running');

    const agent = this.agents.find((a) => a.role === task.role);
    if (!agent) {
      await this.fail(task, { notes: 'no_agent' });
      return;
    }

    try {
      const result = await agent.execute(task);
      const status = result.status === 'completed' ? 'completed' : 'failed';
      await this.store.setStatus(task.id, status, {
        notes: result.notes,
        output: result.output,
        llm: result.llm,
      });
      await this.updateRunStatus(task, status);
      this.options.metrics[status === 'completed' ? 'completed' : 'failed'] += 1;
    } catch (err) {
      await this.retry(task, err);
    }
  }

  private async retry(task: AgentTask, err: unknown) {
    if (err instanceof FatalError) {
      await this.fail(task, { notes: `fatal_error: ${err.message}`, deadLetter: true });
      if (this.options.deadLetterQueue) {
        await this.options.deadLetterQueue.enqueue(task);
      }
      return;
    }

    const existing = await this.store.get(task.id);
    const attempts = (existing?.attempts ?? 0) + 1;

    if (attempts > this.options.maxRetries) {
      await this.fail(task, { notes: `max_retries exceeded: ${String(err)}`, deadLetter: true });
      if (this.options.deadLetterQueue) {
        await this.options.deadLetterQueue.enqueue(task);
      }
      return;
    }

    let backoff: number;
    if (err instanceof RateLimitError) {
      backoff = err.retryAfterMs;
    } else {
      // Exponential backoff: baseDelay * 2^(attempt-1) with jitter
      const exponential = this.options.backoffMs * Math.pow(2, attempts - 1);
      const jitter = Math.random() * this.options.backoffMs * 0.5;
      backoff = exponential + jitter;
    }

    this.options.metrics.retries += 1;
    await this.store.setStatus(task.id, 'failed', {
      notes: `retrying (attempt ${attempts}/${this.options.maxRetries}): ${String(err)}`,
      attempts,
    });
    setTimeout(() => {
      void this.queue.enqueue(task).then(() => {
        this.options.metrics.enqueued += 1;
      });
    }, backoff);
  }

  private async fail(task: AgentTask, result?: Record<string, unknown>) {
    await this.store.setStatus(task.id, 'failed', result);
    await this.updateRunStatus(task, 'failed');
    this.options.metrics.failed += 1;
    if (result && 'deadLetter' in result) {
      this.options.metrics.deadLettered += 1;
    }
  }

  private async updateRunStatus(task: AgentTask, status: TaskStatus) {
    if (!task.runId || !this.runStore) return;
    const tasks = this.store.listByRunId
      ? await this.store.listByRunId(task.runId)
      : (await this.store.all()).filter((entry) => entry.runId === task.runId);
    if (!tasks.length) return;
    const runStatus = deriveRunStatus(tasks);
    await this.runStore.updateStatus(task.runId, runStatus, {
      lastTaskId: task.id,
      lastTaskStatus: status,
      taskCount: tasks.length,
    });
  }
}
