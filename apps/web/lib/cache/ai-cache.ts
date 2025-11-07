/**
 * AI Response Caching Layer
 * 
 * Task 2.1: Implement AI Response Caching
 * - Cache common chatbot responses for 1 hour
 * - Implement cache invalidation strategy
 * - Reduce AI API calls and improve response times
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class AICache {
  private cache: Map<string, CacheEntry<any>>;
  private defaultTTL: number; // Time to live in milliseconds

  constructor(defaultTTLMinutes: number = 60) {
    this.cache = new Map();
    this.defaultTTL = defaultTTLMinutes * 60 * 1000; // Convert to ms
  }

  /**
   * Generate cache key from query parameters
   */
  private generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${JSON.stringify(params[key])}`)
      .join('|');
    return `${prefix}:${sortedParams}`;
  }

  /**
   * Get cached value if it exists and hasn't expired
   */
  get<T>(prefix: string, params: Record<string, any>): T | null {
    const key = this.generateKey(prefix, params);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cache value with optional custom TTL
   */
  set<T>(
    prefix: string,
    params: Record<string, any>,
    data: T,
    ttlMinutes?: number
  ): void {
    const key = this.generateKey(prefix, params);
    const ttl = ttlMinutes ? ttlMinutes * 60 * 1000 : this.defaultTTL;
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    });
  }

  /**
   * Invalidate cache entries by prefix
   */
  invalidate(prefix: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Invalidate specific cache entry
   */
  invalidateKey(prefix: string, params: Record<string, any>): void {
    const key = this.generateKey(prefix, params);
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    entries: Array<{ key: string; age: number; ttl: number }>;
  } {
    const entries: Array<{ key: string; age: number; ttl: number }> = [];
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      entries.push({
        key,
        age: now - entry.timestamp,
        ttl: entry.expiresAt - now,
      });
    }

    return {
      size: this.cache.size,
      entries,
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }
}

// Create singleton instance
export const aiCache = new AICache(60); // 1 hour default TTL

// Cache prefixes for different types of AI responses
export const CACHE_PREFIXES = {
  CHATBOT_RESPONSE: 'chatbot',
  CUSTOMER_CONTEXT: 'customer_context',
  OPPORTUNITIES: 'opportunities',
  PRICING: 'pricing',
  PRODUCT_SEARCH: 'product_search',
  ORDER_STATUS: 'order_status',
} as const;

/**
 * Helper function to get or set cached AI response
 */
export async function getCachedOrGenerate<T>(
  prefix: string,
  params: Record<string, any>,
  generator: () => Promise<T>,
  ttlMinutes?: number
): Promise<T> {
  // Try to get from cache
  const cached = aiCache.get<T>(prefix, params);
  if (cached !== null) {
    return cached;
  }

  // Generate new response
  const result = await generator();

  // Cache the result
  aiCache.set(prefix, params, result, ttlMinutes);

  return result;
}

/**
 * Invalidate cache when data changes
 * Call this after creating/updating/deleting data
 */
export function invalidateCacheForUser(userId: string): void {
  aiCache.invalidate(`${CACHE_PREFIXES.CUSTOMER_CONTEXT}:userId:${userId}`);
  aiCache.invalidate(`${CACHE_PREFIXES.ORDER_STATUS}:userId:${userId}`);
}

export function invalidateCacheForOrganization(organizationId: string): void {
  aiCache.invalidate(`${CACHE_PREFIXES.OPPORTUNITIES}:organizationId:${organizationId}`);
  aiCache.invalidate(`${CACHE_PREFIXES.PRICING}:organizationId:${organizationId}`);
}

// Run cleanup every 5 minutes
if (typeof window === 'undefined') {
  // Server-side only
  setInterval(() => {
    const removed = aiCache.cleanup();
    if (removed > 0) {
      console.log(`[AI Cache] Cleaned up ${removed} expired entries`);
    }
  }, 5 * 60 * 1000);
}

