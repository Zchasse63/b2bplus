/**
 * Redis Caching Client
 * Wrapper around Upstash Redis with fallback and error handling
 * Used for TASK-022: Redis Caching Layer
 */

import { Redis } from '@upstash/redis';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // For cache invalidation
}

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
}

class RedisClient {
  private redis: Redis | null = null;
  private fallbackCache: Map<string, { value: any; expires: number }> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    totalRequests: 0,
  };
  private isAvailable = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize Redis connection
   */
  private async initialize(): Promise<void> {
    try {
      if (process.env.REDIS_URL) {
        this.redis = new Redis({
          url: process.env.REDIS_URL,
          token: process.env.REDIS_TOKEN,
        });
        // Test connection
        await this.redis.ping();
        this.isAvailable = true;
        console.log('[Redis] Connection established');
      } else {
        console.warn('[Redis] REDIS_URL not configured, using fallback');
        this.isAvailable = false;
      }
    } catch (error) {
      console.error('[Redis] Connection failed, using fallback:', error);
      this.isAvailable = false;
    }
  }

  /**
   * Get value from cache
   */
  async get(key: string): Promise<any> {
    this.stats.totalRequests++;
    try {
      if (this.isAvailable && this.redis) {
        const value = await this.redis.get(key);
        if (value) {
          this.stats.hits++;
          this.updateHitRate();
          return JSON.parse(value as string);
        }
      }
    } catch (error) {
      console.error(`[Redis] Get failed for key: ${key}`, error);
    }

    // Try fallback cache
    const fallback = this.fallbackCache.get(key);
    if (fallback && fallback.expires > Date.now()) {
      this.stats.hits++;
      this.updateHitRate();
      return fallback.value;
    }

    this.stats.misses++;
    this.updateHitRate();
    return null;
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: any, options?: CacheOptions): Promise<boolean> {
    try {
      const ttl = options?.ttl || 300; // Default 5 minutes
      const serialized = JSON.stringify(value);

      if (this.isAvailable && this.redis) {
        await this.redis.setex(key, ttl, serialized);
        return true;
      }

      // Fallback: store in memory
      this.fallbackCache.set(key, {
        value,
        expires: Date.now() + ttl * 1000,
      });
      return true;
    } catch (error) {
      console.error(`[Redis] Set failed for key: ${key}`, error);
      // Still store in fallback
      this.fallbackCache.set(key, {
        value,
        expires: Date.now() + (options?.ttl || 300) * 1000,
      });
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<boolean> {
    try {
      if (this.isAvailable && this.redis) {
        await this.redis.del(key);
      }
      this.fallbackCache.delete(key);
      return true;
    } catch (error) {
      console.error(`[Redis] Delete failed for key: ${key}`, error);
      return false;
    }
  }

  /**
   * Invalidate multiple keys by pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    let count = 0;

    try {
      if (this.isAvailable && this.redis) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
          count = keys.length;
        }
      }
    } catch (error) {
      console.error(`[Redis] Pattern invalidation failed: ${pattern}`, error);
    }

    // Fallback: delete from memory cache
    for (const [key] of this.fallbackCache) {
      if (this.matchPattern(key, pattern)) {
        this.fallbackCache.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Check if pattern matches key (simple glob matching)
   */
  private matchPattern(key: string, pattern: string): boolean {
    const regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*');
    return new RegExp(`^${regexPattern}$`).test(key);
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      if (this.isAvailable && this.redis) {
        await this.redis.flushdb();
      }
    } catch (error) {
      console.error('[Redis] Clear failed', error);
    }

    this.fallbackCache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalRequests: 0,
    };
  }

  /**
   * Update hit rate calculation
   */
  private updateHitRate(): void {
    if (this.stats.totalRequests > 0) {
      this.stats.hitRate = this.stats.hits / this.stats.totalRequests;
    }
  }

  /**
   * Check if Redis is available
   */
  isConnected(): boolean {
    return this.isAvailable;
  }

  /**
   * Get fallback cache size (memory usage)
   */
  getFallbackCacheSize(): number {
    return this.fallbackCache.size;
  }
}

// Export singleton instance
export const redisClient = new RedisClient();

export default redisClient;
