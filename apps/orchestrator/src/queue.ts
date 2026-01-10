import type { AgentTask } from "./agents";
import { getDefaultRedisUrl, loadTaskQueueConfig, type TaskQueueKind } from "./config";
import Redis from "ioredis";

export interface TaskQueue {
  enqueue(task: AgentTask): Promise<void>;
  dequeue(): Promise<AgentTask | undefined>;
  size(): Promise<number>;
}

export interface TaskQueueOptions {
  kind?: TaskQueueKind;
  url?: string;
  key?: string;
  client?: Redis;
}

export class InMemoryTaskQueue implements TaskQueue {
  private queue: AgentTask[] = [];

  async enqueue(task: AgentTask) {
    this.queue.push(task);
  }

  async dequeue(): Promise<AgentTask | undefined> {
    return this.queue.shift();
  }

  async size() {
    return this.queue.length;
  }
}

export class RedisTaskQueue implements TaskQueue {
  private client: Redis;
  private key: string;

  constructor(client: Redis, key = "orchestrator:queue") {
    this.client = client;
    this.key = key;
  }

  async enqueue(task: AgentTask) {
    await this.client.lpush(this.key, JSON.stringify(task));
  }

  async dequeue(): Promise<AgentTask | undefined> {
    const raw = await this.client.rpop(this.key);
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as AgentTask;
    } catch {
      return undefined;
    }
  }

  async size() {
    return this.client.llen(this.key);
  }
}

export function createTaskQueue(options: TaskQueueOptions | TaskQueueKind = {}): TaskQueue {
  const resolvedOptions = typeof options === "string" ? { kind: options } : options;
  const envConfig = loadTaskQueueConfig();
  const resolved = resolvedOptions.kind ?? envConfig.kind;
  if (resolved === "redis") {
    const url = resolvedOptions.url ?? envConfig.url ?? getDefaultRedisUrl();
    const client = resolvedOptions.client ?? new Redis(url);
    const key = resolvedOptions.key ?? envConfig.key;
    return new RedisTaskQueue(client, key);
  }
  return new InMemoryTaskQueue();
}
