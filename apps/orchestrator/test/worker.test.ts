import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { TaskWorker } from '../src/worker';
import { InMemoryTaskQueue } from '../src/queue';
import { InMemoryTaskStore } from '../src/persistence';
import { createRunStore } from '../src/runs';
import type { Agent } from '../src/agents';

describe('task worker retries and dead-lettering', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retries with backoff and dead-letters after max retries', async () => {
    const queue = new InMemoryTaskQueue();
    const deadLetter = new InMemoryTaskQueue();
    const store = new InMemoryTaskStore();

    await store.add({
      id: 'retry-task',
      role: 'architect',
      description: 'Retry demo',
      payload: {},
      status: 'queued',
    });
    await queue.enqueue({
      id: 'retry-task',
      role: 'architect',
      description: 'Retry demo',
      payload: {},
    });

    const failingAgent: Agent = {
      role: 'architect',
      execute: vi.fn().mockRejectedValue(new Error('boom')),
    };

    const worker = new TaskWorker(queue, store, [failingAgent], {
      maxRetries: 2,
      backoffMs: 25,
      pollIntervalMs: 5,
      deadLetterQueue: deadLetter,
    });

    await worker.tickOnce(); // first attempt fails
    await vi.advanceTimersByTimeAsync(30); // backoff enqueue
    await worker.tickOnce(); // second attempt fails
    await vi.advanceTimersByTimeAsync(30);
    await worker.tickOnce(); // exceeds max retries -> dead letter

    const failedTask = await store.get('retry-task');
    expect(failedTask?.status).toBe('failed');
    const dlqItem = await deadLetter.dequeue();
    expect(dlqItem?.id).toBe('retry-task');
    expect(worker.getMetrics().deadLettered).toBeGreaterThan(0);
    expect(worker.getMetrics().retries).toBeGreaterThan(0);
  });

  it('updates run status as tasks complete', async () => {
    const queue = new InMemoryTaskQueue();
    const store = new InMemoryTaskStore();
    const runStore = createRunStore({ kind: 'memory' });
    const runId = 'run-123';
    const now = new Date().toISOString();

    await runStore.add({
      id: runId,
      type: 'manual',
      status: 'queued',
      payload: {},
      taskIds: ['task-1'],
      metadata: {},
      createdAt: now,
      updatedAt: now,
    });

    await store.add({
      id: 'task-1',
      runId,
      role: 'architect',
      description: 'Run status update',
      payload: {},
      status: 'queued',
    });
    await queue.enqueue({
      id: 'task-1',
      runId,
      role: 'architect',
      description: 'Run status update',
      payload: {},
    });

    const agent: Agent = {
      role: 'architect',
      execute: vi.fn().mockResolvedValue({ taskId: 'task-1', status: 'completed' }),
    };

    const worker = new TaskWorker(queue, store, [agent], {
      pollIntervalMs: 5,
      runStore,
    });

    await worker.tickOnce();

    const run = await runStore.get(runId);
    expect(run?.status).toBe('completed');
  });
});
