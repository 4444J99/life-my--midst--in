/**
 * Redis caching layer for taxonomy endpoints.
 * Provides in-memory caching with TTL support and cache invalidation.
 */

import { createClient, RedisClientType } from 'redis';
import { 
  cacheHitsTotal, 
  cacheMissesTotal, 
  redisOperationsTotal, 
  redisOperationDuration 
} from '../metrics';

export interface CacheConfig {
  /**
   * Redis connection URL (e.g., redis://localhost:6379)
   */
  redisUrl?: string;

  /**
   * Default TTL for cached items in seconds
   */
  defaultTtl?: number;

  /**
   * Enable or disable caching
   */
  enabled?: boolean;
}

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * In-memory cache implementation (fallback for when Redis is unavailable)
 */
export class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private defaultTtl: number;

  constructor(defaultTtl: number = 300) {
    this.defaultTtl = defaultTtl;
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const end = redisOperationDuration.startTimer({ operation: 'get' });
    redisOperationsTotal.inc({ operation: 'get' });
    
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      cacheMissesTotal.inc({ cache_type: 'memory' });
      end();
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      cacheMissesTotal.inc({ cache_type: 'memory' });
      end();
      return null;
    }

    cacheHitsTotal.inc({ cache_type: 'memory' });
    end();
    return entry.value;
  }

  /**
   * Set a value in cache
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const end = redisOperationDuration.startTimer({ operation: 'set' });
    redisOperationsTotal.inc({ operation: 'set' });
    
    const expiresAt = Date.now() + (ttl ?? this.defaultTtl) * 1000;
    this.cache.set(key, { value, expiresAt });
    
    end();
  }

  /**
   * Delete a key from cache
   */
  delete(key: string): boolean {
    const end = redisOperationDuration.startTimer({ operation: 'del' });
    redisOperationsTotal.inc({ operation: 'del' });
    
    const result = this.cache.delete(key);
    end();
    return result;
  }

  /**
   * Delete multiple keys matching a pattern
   */
  deletePattern(pattern: string): number {
    const end = redisOperationDuration.startTimer({ operation: 'del' });
    redisOperationsTotal.inc({ operation: 'del' });
    
    let count = 0;
    const regex = new RegExp(pattern);

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    end();
    return count;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  stats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

/**
 * Redis-backed cache implementation
 */
export class RedisCache {
  private client: RedisClientType;
  private defaultTtl: number;
  private isConnected = false;

  constructor(redisUrl: string, defaultTtl: number = 300) {
    this.defaultTtl = defaultTtl;
    this.client = createClient({ url: redisUrl });
    
    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      console.log('Redis connected');
      this.isConnected = true;
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
      this.isConnected = true;
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const end = redisOperationDuration.startTimer({ operation: 'get' });
    redisOperationsTotal.inc({ operation: 'get' });

    try {
      const value = await this.client.get(key);
      
      if (!value || typeof value !== 'string') {
        cacheMissesTotal.inc({ cache_type: 'redis' });
        end();
        return null;
      }

      cacheHitsTotal.inc({ cache_type: 'redis' });
      end();
      return JSON.parse(value) as T;
    } catch (err) {
      console.error('Redis get error:', err);
      cacheMissesTotal.inc({ cache_type: 'redis' });
      end();
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const end = redisOperationDuration.startTimer({ operation: 'set' });
    redisOperationsTotal.inc({ operation: 'set' });

    try {
      const serialized = JSON.stringify(value);
      const expiry = ttl ?? this.defaultTtl;
      await this.client.setEx(key, expiry, serialized);
    } catch (err) {
      console.error('Redis set error:', err);
    } finally {
      end();
    }
  }

  async delete(key: string): Promise<boolean> {
    const end = redisOperationDuration.startTimer({ operation: 'del' });
    redisOperationsTotal.inc({ operation: 'del' });

    try {
      const result = await this.client.del(key);
      end();
      return result > 0;
    } catch (err) {
      console.error('Redis delete error:', err);
      end();
      return false;
    }
  }

  async deletePattern(pattern: string): Promise<number> {
    const end = redisOperationDuration.startTimer({ operation: 'del' });
    redisOperationsTotal.inc({ operation: 'del' });

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) {
        end();
        return 0;
      }
      const result = await this.client.del(keys);
      end();
      return result;
    } catch (err) {
      console.error('Redis deletePattern error:', err);
      end();
      return 0;
    }
  }

  async clear(): Promise<void> {
    try {
      await this.client.flushDb();
    } catch (err) {
      console.error('Redis clear error:', err);
    }
  }

  async stats() {
    try {
      const info = await this.client.info('stats');
      return { info };
    } catch (err) {
      console.error('Redis stats error:', err);
      return { info: 'unavailable' };
    }
  }
}

/**
 * Cache key generators for taxonomy endpoints
 */
export const CacheKeys = {
  /**
   * Generate cache key for masks list
   */
  masksList: (offset: number, limit: number, ontology?: string) => {
    const parts = ["masks:list", offset, limit];
    if (ontology) parts.push(ontology);
    return parts.join(":");
  },

  /**
   * Generate cache key for single mask
   */
  mask: (id: string) => `mask:${id}`,

  /**
   * Generate cache key for epochs list
   */
  epochsList: (offset: number, limit: number) => `epochs:list:${offset}:${limit}`,

  /**
   * Generate cache key for single epoch
   */
  epoch: (id: string) => `epoch:${id}`,

  /**
   * Generate cache key for stages list
   */
  stagesList: (offset: number, limit: number, epochId?: string) => {
    const parts = ["stages:list", offset, limit];
    if (epochId) parts.push(epochId);
    return parts.join(":");
  },

  /**
   * Generate cache key for single stage
   */
  stage: (id: string) => `stage:${id}`,

  /**
   * Pattern to invalidate all mask caches
   */
  maskPattern: () => "mask:.*",

  /**
   * Pattern to invalidate all epoch caches
   */
  epochPattern: () => "epoch:.*",

  /**
   * Pattern to invalidate all stage caches
   */
  stagePattern: () => "stage:.*"
};

/**
 * Cache TTL configuration for different data types
 */
export const CacheTTL = {
  /**
   * Taxonomy data (masks, epochs, stages) - stable, can be cached longer
   */
  TAXONOMY: 3600, // 1 hour

  /**
   * Profile data - moderate TTL
   */
  PROFILE: 600, // 10 minutes

  /**
   * Timeline and narrative data - shorter TTL due to potential updates
   */
  TIMELINE: 300, // 5 minutes

  /**
   * Narrative blocks - shorter TTL, frequently updated
   */
  NARRATIVE: 180, // 3 minutes

  /**
   * User-specific data - short TTL for freshness
   */
  USER_DATA: 60 // 1 minute
};

/**
 * Cache invalidation strategies
 */
export interface CacheInvalidationStrategy {
  /**
   * Invalidate related caches when a mask is updated
   */
  onMaskUpdate: (maskId: string, cache: MemoryCache) => void;

  /**
   * Invalidate related caches when an epoch is updated
   */
  onEpochUpdate: (epochId: string, cache: MemoryCache) => void;

  /**
   * Invalidate related caches when a stage is updated
   */
  onStageUpdate: (stageId: string, cache: MemoryCache) => void;

  /**
   * Invalidate all taxonomy caches
   */
  invalidateAllTaxonomy: (cache: MemoryCache) => void;
}

/**
 * Default cache invalidation strategy
 */
export const defaultInvalidationStrategy: CacheInvalidationStrategy = {
  onMaskUpdate: (maskId: string, cache: MemoryCache) => {
    // Invalidate single mask and all masks lists
    cache.delete(CacheKeys.mask(maskId));
    cache.deletePattern("masks:list:.*");
  },

  onEpochUpdate: (epochId: string, cache: MemoryCache) => {
    // Invalidate single epoch, all epochs lists, and related stages
    cache.delete(CacheKeys.epoch(epochId));
    cache.deletePattern("epochs:list:.*");
    cache.deletePattern(`stages:list:.*:${epochId}`);
  },

  onStageUpdate: (stageId: string, cache: MemoryCache) => {
    // Invalidate single stage and all stages lists
    cache.delete(CacheKeys.stage(stageId));
    cache.deletePattern("stages:list:.*");
  },

  invalidateAllTaxonomy: (cache: MemoryCache) => {
    cache.deletePattern("(masks|epochs|stages):.*");
  }
};

/**
 * Middleware factory for caching taxonomy endpoints
 */
export function createCacheMiddleware(
  cache: MemoryCache,
  options: { ttl?: number } = {}
) {
  return async (request: any, reply: any) => {
    // Extract cache key from request
    const cacheKey = generateCacheKey(request);

    // Check cache for GET requests
    if (request.method === "GET" && cacheKey) {
      const cached = cache.get(cacheKey);
      if (cached) {
        // Add cache hit header
        reply.header("X-Cache", "HIT");
        return cached;
      }
    }

    // Intercept response for caching
    const originalSend = reply.send.bind(reply);
    reply.send = function (payload: any) {
      if (request.method === "GET" && cacheKey && reply.statusCode === 200) {
        cache.set(cacheKey, payload, options.ttl);
        reply.header("X-Cache", "MISS");
      }
      return originalSend(payload);
    };
  };
}

/**
 * Generate a cache key from the request
 */
function generateCacheKey(request: any): string | null {
  // Only cache GET requests
  if (request.method !== "GET") {
    return null;
  }

  const path = request.url;

  // Match mask endpoints
  const maskMatch = path.match(/\/masks(?:\?(.*))?$/);
  if (maskMatch) {
    const query = new URLSearchParams(maskMatch[1] || "");
    return CacheKeys.masksList(
      parseInt(query.get("offset") || "0"),
      parseInt(query.get("limit") || "20"),
      query.get("ontology") || undefined
    );
  }

  // Match single mask
  const singleMaskMatch = path.match(/\/masks\/([^/?]+)/);
  if (singleMaskMatch) {
    return CacheKeys.mask(singleMaskMatch[1]);
  }

  // Match epoch endpoints
  const epochMatch = path.match(/\/epochs(?:\?(.*))?$/);
  if (epochMatch) {
    const query = new URLSearchParams(epochMatch[1] || "");
    return CacheKeys.epochsList(
      parseInt(query.get("offset") || "0"),
      parseInt(query.get("limit") || "20")
    );
  }

  // Match single epoch
  const singleEpochMatch = path.match(/\/epochs\/([^/?]+)/);
  if (singleEpochMatch) {
    return CacheKeys.epoch(singleEpochMatch[1]);
  }

  // Match stage endpoints
  const stageMatch = path.match(/\/stages(?:\?(.*))?$/);
  if (stageMatch) {
    const query = new URLSearchParams(stageMatch[1] || "");
    return CacheKeys.stagesList(
      parseInt(query.get("offset") || "0"),
      parseInt(query.get("limit") || "20"),
      query.get("epochId") || undefined
    );
  }

  // Match single stage
  const singleStageMatch = path.match(/\/stages\/([^/?]+)/);
  if (singleStageMatch) {
    return CacheKeys.stage(singleStageMatch[1]);
  }

  return null;
}

/**
 * Create a cache wrapper for service methods
 */
export function withCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  cacheKeyGenerator: (...args: Parameters<T>) => string | null,
  cache: MemoryCache,
  ttl?: number
): T {
  return (async (...args: Parameters<T>) => {
    const cacheKey = cacheKeyGenerator(...args);

    if (cacheKey) {
      const cached = cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const result = await fn(...args);

    if (cacheKey) {
      cache.set(cacheKey, result, ttl);
    }

    return result;
  }) as T;
}


/**
 * Global cache instance
 */
let globalCache: MemoryCache | null = null;

/**
 * Get or create the global cache instance
 */
export function getCache(config?: { defaultTtl?: number }): MemoryCache {
  if (!globalCache) {
    globalCache = new MemoryCache(config?.defaultTtl);
  }
  return globalCache;
}

/**
 * Reset the global cache (for testing)
 */
export function resetCache(): void {
  if (globalCache) {
    globalCache.clear();
  }
  globalCache = null;
}
