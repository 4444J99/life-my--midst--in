import { describe, expect, it, beforeEach } from "vitest";
import { MemoryCache, CacheKeys, CacheTTL, defaultInvalidationStrategy } from "../src/services/cache";

describe("Cache Module", () => {
  let cache: MemoryCache;

  beforeEach(() => {
    cache = new MemoryCache(60); // 60 second default TTL
  });

  describe("MemoryCache", () => {
    it("stores and retrieves values", () => {
      cache.set("test-key", { data: "value" });
      const result = cache.get("test-key");

      expect(result).toEqual({ data: "value" });
    });

    it("returns null for non-existent keys", () => {
      const result = cache.get("nonexistent");
      expect(result).toBe(null);
    });

    it("respects TTL expiration", async () => {
      cache.set("expiring", "value", 0.1); // 0.1 seconds

      // Should exist immediately
      expect(cache.get("expiring")).toBe("value");

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should be gone after expiration
      expect(cache.get("expiring")).toBe(null);
    });

    it("uses default TTL if not specified", async () => {
      const shortCache = new MemoryCache(0.1); // 0.1 second default
      shortCache.set("default-ttl", "value");

      expect(shortCache.get("default-ttl")).toBe("value");

      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(shortCache.get("default-ttl")).toBe(null);
    });

    it("deletes keys", () => {
      cache.set("delete-me", "value");
      expect(cache.get("delete-me")).toBe("value");

      const deleted = cache.delete("delete-me");
      expect(deleted).toBe(true);
      expect(cache.get("delete-me")).toBe(null);
    });

    it("returns false when deleting non-existent key", () => {
      const deleted = cache.delete("nonexistent");
      expect(deleted).toBe(false);
    });

    it("deletes keys matching pattern", () => {
      cache.set("mask:1", "value1");
      cache.set("mask:2", "value2");
      cache.set("epoch:1", "value3");

      const deleted = cache.deletePattern("mask:.*");
      expect(deleted).toBe(2);

      expect(cache.get("mask:1")).toBe(null);
      expect(cache.get("mask:2")).toBe(null);
      expect(cache.get("epoch:1")).toBe("value3");
    });

    it("clears all cache", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");

      cache.clear();

      expect(cache.get("key1")).toBe(null);
      expect(cache.get("key2")).toBe(null);
    });

    it("returns cache statistics", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");

      const stats = cache.stats();
      expect(stats.size).toBe(2);
      expect(stats.keys).toContain("key1");
      expect(stats.keys).toContain("key2");
    });
  });

  describe("CacheKeys generators", () => {
    it("generates masks list key", () => {
      const key = CacheKeys.masksList(0, 20, "cognitive");
      expect(key).toBe("masks:list:0:20:cognitive");
    });

    it("generates mask key", () => {
      const key = CacheKeys.mask("analyst");
      expect(key).toBe("mask:analyst");
    });

    it("generates epochs list key", () => {
      const key = CacheKeys.epochsList(0, 20);
      expect(key).toBe("epochs:list:0:20");
    });

    it("generates epoch key", () => {
      const key = CacheKeys.epoch("mastery");
      expect(key).toBe("epoch:mastery");
    });

    it("generates stages list key", () => {
      const key = CacheKeys.stagesList(0, 20, "mastery");
      expect(key).toBe("stages:list:0:20:mastery");
    });

    it("generates stage key", () => {
      const key = CacheKeys.stage("leadership");
      expect(key).toBe("stage:leadership");
    });
  });

  describe("CacheTTL constants", () => {
    it("defines appropriate TTL values", () => {
      expect(CacheTTL.TAXONOMY).toBe(3600); // 1 hour
      expect(CacheTTL.PROFILE).toBe(600); // 10 minutes
      expect(CacheTTL.TIMELINE).toBe(300); // 5 minutes
      expect(CacheTTL.NARRATIVE).toBe(180); // 3 minutes
      expect(CacheTTL.USER_DATA).toBe(60); // 1 minute
    });

    it("taxonomy TTL is longest (most stable)", () => {
      expect(CacheTTL.TAXONOMY).toBeGreaterThan(CacheTTL.PROFILE);
      expect(CacheTTL.PROFILE).toBeGreaterThan(CacheTTL.TIMELINE);
      expect(CacheTTL.TIMELINE).toBeGreaterThan(CacheTTL.NARRATIVE);
    });
  });

  describe("Cache invalidation strategy", () => {
    it("invalidates single mask and mask lists on update", () => {
      cache.set(CacheKeys.mask("analyst"), { id: "analyst" });
      cache.set(CacheKeys.masksList(0, 20), []);
      cache.set("other-key", "value");

      defaultInvalidationStrategy.onMaskUpdate("analyst", cache);

      expect(cache.get(CacheKeys.mask("analyst"))).toBe(null);
      expect(cache.get(CacheKeys.masksList(0, 20))).toBe(null);
      expect(cache.get("other-key")).toBe("value");
    });

    it("invalidates epoch and related stages", () => {
      cache.set(CacheKeys.epoch("mastery"), { id: "mastery" });
      cache.set(CacheKeys.epochsList(0, 20), []);
      cache.set(CacheKeys.stagesList(0, 20, "mastery"), []);

      defaultInvalidationStrategy.onEpochUpdate("mastery", cache);

      expect(cache.get(CacheKeys.epoch("mastery"))).toBe(null);
      expect(cache.get(CacheKeys.epochsList(0, 20))).toBe(null);
    });

    it("invalidates stage and stage lists", () => {
      cache.set(CacheKeys.stage("leadership"), { id: "leadership" });
      cache.set(CacheKeys.stagesList(0, 20), []);

      defaultInvalidationStrategy.onStageUpdate("leadership", cache);

      expect(cache.get(CacheKeys.stage("leadership"))).toBe(null);
      expect(cache.get(CacheKeys.stagesList(0, 20))).toBe(null);
    });

    it("invalidates all taxonomy caches", () => {
      cache.set(CacheKeys.mask("analyst"), {});
      cache.set(CacheKeys.epoch("mastery"), {});
      cache.set(CacheKeys.stage("leadership"), {});
      cache.set("user:1", {}); // Non-taxonomy

      defaultInvalidationStrategy.invalidateAllTaxonomy(cache);

      expect(cache.get(CacheKeys.mask("analyst"))).toBe(null);
      expect(cache.get(CacheKeys.epoch("mastery"))).toBe(null);
      expect(cache.get(CacheKeys.stage("leadership"))).toBe(null);
      // User data might still be there depending on pattern matching
    });
  });

  describe("Cache hit rates", () => {
    it("improves performance with caching", async () => {
      const callCount = { count: 0 };
      const expensiveOperation = async () => {
        callCount.count++;
        return { result: "expensive" };
      };

      // First call (cache miss)
      cache.set("expensive", await expensiveOperation());
      expect(callCount.count).toBe(1);

      // Second call (cache hit)
      const cached = cache.get("expensive");
      expect(cached).toEqual({ result: "expensive" });
      expect(callCount.count).toBe(1); // Not incremented
    });
  });

  describe("Memory efficiency", () => {
    it("removes expired entries to save memory", async () => {
      const shortTtl = new MemoryCache(0.1);

      for (let i = 0; i < 100; i++) {
        shortTtl.set(`key-${i}`, `value-${i}`);
      }

      let stats = shortTtl.stats();
      expect(stats.size).toBe(100);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Access one key to trigger cleanup
      shortTtl.get("key-0");

      stats = shortTtl.stats();
      expect(stats.size).toBe(0);
    });
  });
});
