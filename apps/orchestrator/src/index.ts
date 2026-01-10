import { buildOrchestrator } from "./server";
import { defaultAgents } from "./agents";
import { loadSchedulerConfig, loadServerConfig, loadWorkerConfig } from "./config";
import { resolveAgentExecutor } from "./llm";
import { createTaskQueue } from "./queue";
import { createTaskStore } from "./persistence";
import { createRunStore } from "./runs";
import { TaskScheduler } from "./scheduler";

async function bootstrap() {
  const executor = resolveAgentExecutor();
  const queue = createTaskQueue();
  const store = createTaskStore();
  const runStore = createRunStore();
  const workerConfig = loadWorkerConfig();
  const schedulerConfig = loadSchedulerConfig();
  const scheduler = schedulerConfig.enabled
    ? new TaskScheduler(queue, store, runStore, {
        intervalMs: schedulerConfig.intervalMs,
        roles: schedulerConfig.roles,
        description: schedulerConfig.description
      })
    : undefined;

  const fastify = buildOrchestrator(executor ? defaultAgents(executor) : defaultAgents(), {
    queue,
    store,
    runStore,
    worker: workerConfig.enabled,
    pollIntervalMs: workerConfig.pollIntervalMs,
    maxRetries: workerConfig.maxRetries,
    backoffMs: workerConfig.backoffMs
  });
  const serverConfig = loadServerConfig();
  try {
    if (scheduler) scheduler.start();
    await fastify.listen({ port: serverConfig.port, host: serverConfig.host });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error("Orchestrator failed to start", error);
  process.exit(1);
});
