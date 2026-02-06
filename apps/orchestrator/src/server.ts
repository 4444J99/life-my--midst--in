import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Fastify from 'fastify';
import type { Agent, AgentTask } from './agents';
import { loadAgentConfig, loadAgentRegistry, loadRateLimitConfig } from './config';
import { createTaskQueue, TaskQueue } from './queue';
import { createTaskStore, TaskStore } from './persistence';
import { createRunStore, deriveRunStatus, type RunStatus, type RunStore } from './runs';
import { parseGitHubEvent } from './webhooks';
import { checkLocalLLMHealth, isLocalLLMEnabled } from './llm';
import { getLLMMetricsSnapshot } from './llm-metrics';
import type { TaskStatus, TrackedTask } from './tasks';
import { TaskWorker, WorkerMetrics, createWorkerMetrics } from './worker';
import { createRateLimiter } from './rate-limit';
import type { JobHuntScheduler } from './job-hunt-scheduler';

const OPENAPI_PATH = join(process.cwd(), 'apps', 'orchestrator', 'openapi.yaml');
const OPENAPI_SPEC = (() => {
  try {
    return readFileSync(OPENAPI_PATH, 'utf-8');
  } catch {
    return undefined;
  }
})();

export interface OrchestratorOptions {
  queue?: TaskQueue;
  store?: TaskStore;
  runStore?: RunStore;
  deadLetterQueue?: TaskQueue;
  worker?: boolean;
  pollIntervalMs?: number;
  maxRetries?: number;
  backoffMs?: number;
  jobHuntScheduler?: JobHuntScheduler;
}

export function buildOrchestrator(agents: Agent[], options: OrchestratorOptions = {}) {
  const fastify = Fastify({ logger: true });
  const queue = options.queue ?? createTaskQueue();
  const store = options.store ?? createTaskStore();
  const runStore = options.runStore ?? createRunStore();
  const metrics: WorkerMetrics = createWorkerMetrics();
  const agentConfig = loadAgentConfig();
  const rateLimitConfig = loadRateLimitConfig();
  const rateLimiter = createRateLimiter(rateLimitConfig);
  const agentRegistry = loadAgentRegistry();

  // Create a dedicated dead letter queue (same backend type as main queue, different key)
  const dlq =
    options.deadLetterQueue ?? createTaskQueue({ kind: 'memory', key: 'orchestrator:dlq' });

  const worker = options.worker
    ? new TaskWorker(queue, store, agents, {
        pollIntervalMs: options.pollIntervalMs,
        maxRetries: options.maxRetries,
        backoffMs: options.backoffMs,
        metrics,
        runStore,
        deadLetterQueue: dlq,
      })
    : undefined;

  const jobHuntScheduler = options.jobHuntScheduler;

  if (worker) worker.start();

  fastify.get('/openapi.yaml', (_request, reply) => {
    if (!OPENAPI_SPEC) {
      return reply.code(404).send({ ok: false, error: 'openapi_not_found' });
    }
    reply.header('Content-Type', 'text/yaml');
    return OPENAPI_SPEC;
  });

  fastify.get('/health', async () => {
    const mode = agentConfig.mode;
    let llmStatus = 'disabled';
    if (mode === 'local' || mode === 'oss') {
      if (!isLocalLLMEnabled()) llmStatus = 'blocked';
      else if (agentConfig.checkLLM) {
        llmStatus = (await checkLocalLLMHealth()) ? 'healthy' : 'unreachable';
      } else {
        llmStatus = 'unchecked';
      }
    } else if (mode !== 'stub' && mode !== 'none') {
      llmStatus = 'unknown';
    }
    return {
      status: 'ok',
      queue: await queue.size(),
      tasks: (await store.all()).length,
      worker: worker ? 'running' : 'disabled',
      llm: llmStatus,
      registry: agentRegistry ? Object.keys(agentRegistry.agents ?? {}).length : 0,
    };
  });

  fastify.get('/ready', async (request, reply) => {
    try {
      await queue.size();
      await store.all();
      if (agentConfig.checkLLM && isLocalLLMEnabled()) {
        const healthy = await checkLocalLLMHealth();
        if (!healthy) {
          return reply.code(503).send({ status: 'degraded', llm: 'unreachable' });
        }
      }
      return { status: 'ready' };
    } catch (err) {
      request.log.error({ err }, 'readiness_failed');
      return reply.code(503).send({ status: 'degraded' });
    }
  });

  fastify.get('/metrics', async (_request, reply) => {
    const llmMetrics = getLLMMetricsSnapshot();
    const body = [
      '# HELP orchestrator_queue_size Total tasks waiting in queue.',
      '# TYPE orchestrator_queue_size gauge',
      `orchestrator_queue_size ${await queue.size()}`,
      '# HELP orchestrator_tasks_total Total tasks recorded in store.',
      '# TYPE orchestrator_tasks_total gauge',
      `orchestrator_tasks_total ${(await store.all()).length}`,
      '# HELP orchestrator_tasks_dispatched Total tasks dispatched to agents.',
      '# TYPE orchestrator_tasks_dispatched counter',
      `orchestrator_tasks_dispatched ${metrics.dispatched}`,
      '# HELP orchestrator_tasks_completed Total tasks completed.',
      '# TYPE orchestrator_tasks_completed counter',
      `orchestrator_tasks_completed ${metrics.completed}`,
      '# HELP orchestrator_tasks_failed Total tasks failed.',
      '# TYPE orchestrator_tasks_failed counter',
      `orchestrator_tasks_failed ${metrics.failed}`,
      '# HELP orchestrator_tasks_retries Total task retries.',
      '# TYPE orchestrator_tasks_retries counter',
      `orchestrator_tasks_retries ${metrics.retries}`,
      '# HELP orchestrator_tasks_dead_letter_total Tasks sent to dead letter queue.',
      '# TYPE orchestrator_tasks_dead_letter_total counter',
      `orchestrator_tasks_dead_letter_total ${metrics.deadLettered}`,
      '# HELP orchestrator_llm_requests_total Total LLM requests.',
      '# TYPE orchestrator_llm_requests_total counter',
      `orchestrator_llm_requests_total{status="success"} ${llmMetrics.successes}`,
      `orchestrator_llm_requests_total{status="failure"} ${llmMetrics.failures}`,
      '# HELP orchestrator_llm_latency_ms LLM request latency in milliseconds.',
      '# TYPE orchestrator_llm_latency_ms histogram',
      ...llmMetrics.buckets.map(
        (bucket, idx) =>
          `orchestrator_llm_latency_ms_bucket{le="${bucket}"} ${llmMetrics.bucketCounts[idx]}`,
      ),
      `orchestrator_llm_latency_ms_bucket{le="+Inf"} ${llmMetrics.requests}`,
      `orchestrator_llm_latency_ms_sum ${llmMetrics.latencySumMs}`,
      `orchestrator_llm_latency_ms_count ${llmMetrics.requests}`,
      '# HELP orchestrator_llm_prompt_tokens_total Total prompt tokens.',
      '# TYPE orchestrator_llm_prompt_tokens_total counter',
      `orchestrator_llm_prompt_tokens_total ${llmMetrics.promptTokens}`,
      '# HELP orchestrator_llm_completion_tokens_total Total completion tokens.',
      '# TYPE orchestrator_llm_completion_tokens_total counter',
      `orchestrator_llm_completion_tokens_total ${llmMetrics.completionTokens}`,
      '# HELP orchestrator_llm_total_tokens_total Total tokens.',
      '# TYPE orchestrator_llm_total_tokens_total counter',
      `orchestrator_llm_total_tokens_total ${llmMetrics.totalTokens}`,
      '# HELP orchestrator_llm_tool_calls_total Total tool calls executed.',
      '# TYPE orchestrator_llm_tool_calls_total counter',
      `orchestrator_llm_tool_calls_total ${llmMetrics.toolCalls}`,
    ].join('\n');
    reply.header('Content-Type', 'text/plain; version=0.0.4');
    return body;
  });

  const updateRunStatus = async (task: AgentTask, status: TaskStatus) => {
    if (!task.runId) return;
    const tasks = store.listByRunId
      ? await store.listByRunId(task.runId)
      : (await store.all()).filter((entry) => entry.runId === task.runId);
    if (!tasks.length) return;
    const runStatus = deriveRunStatus(tasks);
    await runStore.updateStatus(task.runId, runStatus, {
      lastTaskId: task.id,
      lastTaskStatus: status,
      taskCount: tasks.length,
    });
  };

  fastify.post('/tasks', async (request, reply) => {
    const body = request.body as Partial<AgentTask>;
    const headerProfile = request.headers['x-profile-id'];
    const headerUser = request.headers['x-user-id'];
    const headerValue =
      (Array.isArray(headerProfile) ? headerProfile[0] : headerProfile) ??
      (Array.isArray(headerUser) ? headerUser[0] : headerUser);
    const requesterId =
      body?.payload?.['profileId'] ||
      body?.payload?.['userId'] ||
      body?.payload?.['identityId'] ||
      headerValue;
    const rateKey = typeof requesterId === 'string' ? `user:${requesterId}` : `ip:${request.ip}`;
    if (rateLimitConfig.enabled) {
      const result = await rateLimiter.check(rateKey);
      if (!result.allowed) {
        request.log.info(
          { rateKey, remaining: result.remaining, resetAt: new Date(result.resetAt).toISOString() },
          'rate_limit_exceeded',
        );
        const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
        reply.header('Retry-After', retryAfter);
        return reply.code(429).send({ ok: false, error: 'rate_limit_exceeded', retryAfter });
      }
    }

    if (!body.role || !body.description || !body.id) {
      return reply.code(400).send({ ok: false, error: 'invalid_task' });
    }
    const runId = body.runId ?? `run-${randomUUID()}`;
    const task: AgentTask = {
      id: body.id,
      runId,
      role: body.role,
      description: body.description,
      payload: body.payload ?? {},
    };
    const tracked: TrackedTask = { ...task, status: 'queued', attempts: 0, history: [] };
    await queue.enqueue(task);
    await store.add(tracked);
    const now = new Date().toISOString();
    const existingRun = await runStore.get(runId);
    if (!existingRun) {
      await runStore.add({
        id: runId,
        type: 'manual',
        status: 'queued',
        payload: { source: 'api' },
        taskIds: [task.id],
        metadata: { source: 'api' },
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await runStore.appendTask(runId, task.id);
    }
    metrics.enqueued += 1;
    return { ok: true, queued: await queue.size(), runId };
  });

  fastify.get('/runs', async (request, reply) => {
    const query = request.query as { status?: string; offset?: string; limit?: string };
    const status = query.status;
    if (status && !['queued', 'running', 'completed', 'failed'].includes(status)) {
      return reply.code(400).send({ ok: false, error: 'invalid_status' });
    }
    const offsetRaw = Number(query.offset ?? 0);
    const limitRaw = Number(query.limit ?? 50);
    const offset = Number.isFinite(offsetRaw) && offsetRaw > 0 ? Math.floor(offsetRaw) : 0;
    const limit =
      Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), 200) : 50;
    const { data, total } = await runStore.list(offset, limit, status as RunStatus | undefined);
    return { ok: true, data, total, offset, limit };
  });

  fastify.get('/runs/:id', async (request, reply) => {
    const id = (request.params as { id: string }).id;
    const run = await runStore.get(id);
    if (!run) return reply.code(404).send({ ok: false, error: 'not_found' });
    return { ok: true, data: run };
  });

  fastify.get('/runs/:id/tasks', async (request, reply) => {
    const id = (request.params as { id: string }).id;
    const run = await runStore.get(id);
    if (!run) return reply.code(404).send({ ok: false, error: 'not_found' });
    const tasks = store.listByRunId
      ? await store.listByRunId(id)
      : (await store.all()).filter((entry) => entry.runId === id);
    return { ok: true, data: tasks };
  });

  fastify.get('/tasks/:id', async (request, reply) => {
    const task = await store.get((request.params as { id: string }).id);
    if (!task) return reply.code(404).send({ ok: false, error: 'not_found' });
    return { ok: true, data: task };
  });

  fastify.get('/tasks/:id/history', async (request, reply) => {
    const id = (request.params as { id: string }).id;
    const history = (await store.history?.(id)) ?? (await store.get(id))?.history;
    if (!history) return reply.code(404).send({ ok: false, error: 'not_found' });
    return { ok: true, data: history };
  });

  fastify.patch('/tasks/:id/metadata', async (request, reply) => {
    const id = (request.params as { id: string }).id;
    const task = await store.get(id);
    if (!task) return reply.code(404).send({ ok: false, error: 'not_found' });
    const patch = (request.body as Record<string, unknown>) ?? {};
    await store.updateMetadata(id, patch);
    return { ok: true };
  });

  fastify.post('/tasks/dispatch', async () => {
    const task = await queue.dequeue();
    if (!task) return { ok: true, dispatched: false };
    await store.setStatus(task.id, 'running');
    await updateRunStatus(task, 'running');
    metrics.dispatched += 1;
    const agent = agents.find((a) => a.role === task.role);
    if (!agent) {
      await store.setStatus(task.id, 'failed');
      await updateRunStatus(task, 'failed');
      return { ok: false, error: 'no_agent' };
    }
    try {
      const result = await agent.execute(task);
      const finalStatus = result.status === 'completed' ? 'completed' : 'failed';
      await store.setStatus(task.id, finalStatus, {
        notes: result.notes,
        output: result.output,
        llm: result.llm,
      });
      await updateRunStatus(task, finalStatus);
      if (result.status === 'completed') metrics.completed += 1;
      else metrics.failed += 1;
      return { ok: true, dispatched: true, result };
    } catch (err) {
      await store.setStatus(task.id, 'failed', { notes: `dispatch_error: ${String(err)}` });
      await updateRunStatus(task, 'failed');
      metrics.failed += 1;
      return { ok: false, error: 'agent_error' };
    }
  });

  fastify.get('/tasks', async (request) => {
    const query = request.query as { status?: string };
    const tasks = await store.all();
    const filtered = query.status ? tasks.filter((t) => t.status === query.status) : tasks;
    return { ok: true, data: filtered };
  });

  fastify.post('/webhooks/github', async (request) => {
    const event = request.headers['x-github-event'] as string | undefined;
    const runId = `run-${randomUUID()}`;
    const task = { ...parseGitHubEvent(event, request.body as Record<string, unknown>), runId };
    await queue.enqueue(task);
    await store.add({ ...task, status: 'queued', attempts: 0, history: [] });
    const now = new Date().toISOString();
    await runStore.add({
      id: runId,
      type: 'github',
      status: 'queued',
      payload: { event, source: 'github', body: request.body },
      taskIds: [task.id],
      metadata: { source: 'github', event },
      createdAt: now,
      updatedAt: now,
    });
    metrics.enqueued += 1;
    return { ok: true, queued: await queue.size(), runId };
  });

  // --- SCHEDULER ROUTES ---

  if (jobHuntScheduler) {
    fastify.get('/scheduler/job-hunts', () => {
      return { ok: true, data: jobHuntScheduler.listJobHunts() };
    });

    fastify.post('/scheduler/job-hunts', (request, reply) => {
      const body = request.body as {
        profileId?: string;
        keywords?: string[];
        location?: string;
        frequency?: 'daily' | 'weekly' | 'monthly';
        autoApply?: boolean;
      };
      if (!body.profileId || !body.keywords) {
        return reply.code(400).send({ ok: false, error: 'missing_fields' });
      }
      jobHuntScheduler.addJobHunt({
        profileId: body.profileId,
        keywords: body.keywords,
        location: body.location,
        frequency: body.frequency,
        autoApply: body.autoApply,
      });
      return { ok: true };
    });

    fastify.delete('/scheduler/job-hunts/:profileId', (request) => {
      const { profileId } = request.params as { profileId: string };
      jobHuntScheduler.removeJobHunt(profileId);
      return { ok: true };
    });

    fastify.post('/scheduler/job-hunts/trigger', async () => {
      await jobHuntScheduler.tickOnce();
      return { ok: true, message: 'triggered' };
    });
  }

  // --- DEAD LETTER QUEUE ROUTES ---

  fastify.get('/dlq', async (request) => {
    const query = request.query as { offset?: string; limit?: string };
    const offset = Math.max(0, Number(query.offset) || 0);
    const limit = Math.min(200, Math.max(1, Number(query.limit) || 50));
    const tasks = dlq.peek ? await dlq.peek(offset, limit) : [];
    return { ok: true, data: tasks, total: await dlq.size(), offset, limit };
  });

  fastify.get('/dlq/size', async () => {
    return { ok: true, size: await dlq.size() };
  });

  fastify.post('/dlq/replay', async () => {
    let replayed = 0;
    let task = await dlq.dequeue();
    while (task) {
      await queue.enqueue(task);
      metrics.enqueued += 1;
      replayed += 1;
      task = await dlq.dequeue();
    }
    return { ok: true, replayed };
  });

  fastify.delete('/dlq', async () => {
    const purged = dlq.clear ? await dlq.clear() : 0;
    return { ok: true, purged };
  });

  return fastify;
}
