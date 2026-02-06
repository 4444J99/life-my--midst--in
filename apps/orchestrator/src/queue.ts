import type { AgentTask } from './agents';
import { getDefaultRedisUrl, loadTaskQueueConfig, type TaskQueueKind } from './config';
import Redis from 'ioredis';

export interface TaskQueue {
  enqueue(task: AgentTask): Promise<void>;
  dequeue(): Promise<AgentTask | undefined>;
  size(): Promise<number>;
  /** List all items without removing them (for DLQ inspection). */
  peek?(offset?: number, limit?: number): Promise<AgentTask[]>;
  /** Remove all items from the queue. */
  clear?(): Promise<number>;
}

export interface TaskQueueOptions {
  kind?: TaskQueueKind;
  url?: string;
  key?: string;
  client?: Redis;
}

export class InMemoryTaskQueue implements TaskQueue {
  private queue: AgentTask[] = [];

  enqueue(task: AgentTask): Promise<void> {
    this.queue.push(task);
    return Promise.resolve();
  }

  dequeue(): Promise<AgentTask | undefined> {
    return Promise.resolve(this.queue.shift());
  }

  size(): Promise<number> {
    return Promise.resolve(this.queue.length);
  }

  peek(offset = 0, limit = 50): Promise<AgentTask[]> {
    return Promise.resolve(this.queue.slice(offset, offset + limit));
  }

  clear(): Promise<number> {
    const count = this.queue.length;
    this.queue = [];
    return Promise.resolve(count);
  }
}

export class RedisTaskQueue implements TaskQueue {
  private client: Redis;
  private key: string;

  constructor(client: Redis, key = 'orchestrator:queue') {
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

  async peek(offset = 0, limit = 50): Promise<AgentTask[]> {
    const items = await this.client.lrange(this.key, offset, offset + limit - 1);
    return items
      .map((raw) => {
        try {
          return JSON.parse(raw) as AgentTask;
        } catch {
          return undefined;
        }
      })
      .filter((item): item is AgentTask => item !== undefined);
  }

  async clear(): Promise<number> {
    const count = await this.client.llen(this.key);
    await this.client.del(this.key);
    return count;
  }
}

export function createTaskQueue(options: TaskQueueOptions | TaskQueueKind = {}): TaskQueue {
  const resolvedOptions = typeof options === 'string' ? { kind: options } : options;
  const envConfig = loadTaskQueueConfig();
  const resolved = resolvedOptions.kind ?? envConfig.kind;
  if (resolved === 'redis') {
    const url = resolvedOptions.url ?? envConfig.url ?? getDefaultRedisUrl();
    const client = resolvedOptions.client ?? new Redis(url);
    const key = resolvedOptions.key ?? envConfig.key;
    return new RedisTaskQueue(client, key);
  }
  return new InMemoryTaskQueue();
}
