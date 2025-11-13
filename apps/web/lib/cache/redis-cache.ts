import { Redis } from '@upstash/redis';
import { CACHE } from '@/lib/constants/api-constants';

/**
 * Redis Cache Manager
 * Provides a unified interface for caching frequently accessed data
 * Uses Upstash Redis for serverless environments
 */

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Tags for cache invalidation
}

/**
 * Get value from cache
 */
export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const value = await redis.get(key);
    if (!value) return null;
    return JSON.parse(value as string) as T;
  } catch (error) {
    console.error(`Cache get error for key ${key}:`, error);
    return null;
  }
}

/**
 * Set value in cache
 */
export async function setCached<T>(
  key: string,
  value: T,
  options?: CacheOptions
): Promise<void> {
  try {
    const ttl = options?.ttl || CACHE.DEFAULT_TTL_SECONDS;
    await redis.setex(key, ttl, JSON.stringify(value));
  } catch (error) {
    console.error(`Cache set error for key ${key}:`, error);
  }
}

/**
 * Delete value from cache
 */
export async function deleteCached(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
    console.error(`Cache delete error for key ${key}:`, error);
  }
}

/**
 * Clear all cache entries matching a pattern
 */
export async function clearCachePattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error(`Cache clear pattern error for ${pattern}:`, error);
  }
}

/**
 * Get or set cache (cache-aside pattern)
 */
export async function getOrSetCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: CacheOptions
): Promise<T> {
  // Try to get from cache first
  const cached = await getCached<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetcher();

  // Store in cache
  await setCached(key, data, options);

  return data;
}

/**
 * Cache keys for different data types
 */
export const CACHE_KEYS = {
  // Products
  PRODUCT: (id: string) => `product:${id}`,
  PRODUCTS_LIST: (orgId: string) => `products:${orgId}`,
  PRODUCT_SEARCH: (query: string, orgId: string) => `product:search:${orgId}:${query}`,

  // Pricing
  PRICING_CALCULATE: (productId: string, quantity: number) =>
    `pricing:${productId}:${quantity}`,
  PRICING_TIERS: (orgId: string) => `pricing:tiers:${orgId}`,
  PRICING_RULES: (orgId: string) => `pricing:rules:${orgId}`,

  // Customers
  CUSTOMER: (id: string) => `customer:${id}`,
  CUSTOMER_ANALYTICS: (id: string) => `customer:analytics:${id}`,
  CUSTOMER_LTV: (id: string) => `customer:ltv:${id}`,
  CUSTOMER_CHURN_RISK: (id: string) => `customer:churn:${id}`,

  // Orders
  ORDER: (id: string) => `order:${id}`,
  ORDERS_LIST: (customerId: string) => `orders:${customerId}`,
  ORDER_HISTORY: (customerId: string, days: number) =>
    `orders:history:${customerId}:${days}`,

  // Recommendations
  RECOMMENDATIONS: (customerId: string) => `recommendations:${customerId}`,
  CROSS_SELL: (customerId: string) => `cross_sell:${customerId}`,
  REORDER_PREDICTIONS: (customerId: string) => `reorder:${customerId}`,

  // Analytics
  ANALYTICS_DASHBOARD: (orgId: string) => `analytics:dashboard:${orgId}`,
  ANALYTICS_REVENUE: (orgId: string, period: string) =>
    `analytics:revenue:${orgId}:${period}`,
  ANALYTICS_TRENDS: (orgId: string) => `analytics:trends:${orgId}`,

  // Opportunities
  OPPORTUNITIES: (customerId: string) => `opportunities:${customerId}`,
  OPPORTUNITIES_LIST: (orgId: string) => `opportunities:${orgId}`,

  // Inventory
  INVENTORY: (productId: string) => `inventory:${productId}`,
  INVENTORY_LEVELS: (orgId: string) => `inventory:levels:${orgId}`,
  REORDER_NEEDED: (orgId: string) => `reorder:needed:${orgId}`,

  // Campaigns
  CAMPAIGN: (id: string) => `campaign:${id}`,
  CAMPAIGNS_LIST: (orgId: string) => `campaigns:${orgId}`,
  CAMPAIGN_STATS: (id: string) => `campaign:stats:${id}`,

  // Feature flags
  FEATURE_FLAGS: () => 'feature:flags',
  FEATURE_FLAG: (name: string) => `feature:${name}`,
} as const;

/**
 * Invalidate cache for a specific entity type
 */
export async function invalidateCache(entityType: string, entityId?: string): Promise<void> {
  const pattern = entityId ? `${entityType}:${entityId}*` : `${entityType}:*`;
  await clearCachePattern(pattern);
}

/**
 * Warm up cache with frequently accessed data
 */
export async function warmupCache(
  fetchers: Array<{
    key: string;
    fetcher: () => Promise<any>;
    ttl?: number;
  }>
): Promise<void> {
  const results = await Promise.allSettled(
    fetchers.map(({ key, fetcher, ttl }) =>
      getOrSetCached(key, fetcher, { ttl })
    )
  );

  const failed = results.filter(r => r.status === 'rejected').length;
  if (failed > 0) {
    console.warn(`Cache warmup: ${failed}/${fetchers.length} items failed`);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  connected: boolean;
  error?: string;
}> {
  try {
    await redis.ping();
    return { connected: true };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Batch get multiple cache entries
 */
export async function getBatchCached<T>(keys: string[]): Promise<(T | null)[]> {
  try {
    const values = await redis.mget(...keys);
    return values.map(v => {
      if (!v) return null;
      try {
        return JSON.parse(v as string) as T;
      } catch {
        return null;
      }
    });
  } catch (error) {
    console.error('Batch cache get error:', error);
    return keys.map(() => null);
  }
}

/**
 * Batch set multiple cache entries
 */
export async function setBatchCached<T>(
  entries: Array<{ key: string; value: T }>,
  options?: CacheOptions
): Promise<void> {
  try {
    const ttl = options?.ttl || CACHE.DEFAULT_TTL_SECONDS;
    const pipeline = redis.pipeline();

    for (const { key, value } of entries) {
      pipeline.setex(key, ttl, JSON.stringify(value));
    }

    await pipeline.exec();
  } catch (error) {
    console.error('Batch cache set error:', error);
  }
}

