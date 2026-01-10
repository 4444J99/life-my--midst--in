import Redis from "ioredis";
import type { RateLimitConfig } from "./config";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export interface RateLimiter {
  check(key: string): Promise<RateLimitResult>;
}

class InMemoryRateLimiter implements RateLimiter {
  private windowMs: number;
  private max: number;
  private history = new Map<string, number[]>();

  constructor(max: number, windowMs: number) {
    this.max = max;
    this.windowMs = windowMs;
  }

  async check(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const existing = this.history.get(key) ?? [];
    const fresh = existing.filter((ts) => now - ts < this.windowMs);
    if (fresh.length >= this.max) {
      const oldest = fresh[0] ?? now;
      return {
        allowed: false,
        remaining: 0,
        resetAt: oldest + this.windowMs
      };
    }
    fresh.push(now);
    this.history.set(key, fresh);
    const resetAt = (fresh[0] ?? now) + this.windowMs;
    return {
      allowed: true,
      remaining: Math.max(0, this.max - fresh.length),
      resetAt
    };
  }
}

class RedisRateLimiter implements RateLimiter {
  private client: Redis;
  private max: number;
  private windowMs: number;
  private prefix: string;

  constructor(client: Redis, config: { max: number; windowMs: number; prefix: string }) {
    this.client = client;
    this.max = config.max;
    this.windowMs = config.windowMs;
    this.prefix = config.prefix;
  }

  async check(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const redisKey = `${this.prefix}:${key}`;
    const count = await this.client.incr(redisKey);
    if (count === 1) {
      await this.client.pexpire(redisKey, this.windowMs);
    }
    const ttl = await this.client.pttl(redisKey);
    const resetAt = ttl > 0 ? now + ttl : now + this.windowMs;
    return {
      allowed: count <= this.max,
      remaining: Math.max(0, this.max - count),
      resetAt
    };
  }
}

export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  if (config.redisUrl) {
    return new RedisRateLimiter(new Redis(config.redisUrl), {
      max: config.max,
      windowMs: config.windowMs,
      prefix: config.keyPrefix
    });
  }
  return new InMemoryRateLimiter(config.max, config.windowMs);
}
