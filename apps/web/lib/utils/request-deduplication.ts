/**
 * Request Deduplication
 * Prevents duplicate requests from being processed multiple times
 * Useful for preventing redundant AI calls and database queries
 */

export interface DeduplicationOptions {
  // Time window for deduplication (ms)
  ttl?: number;

  // Custom key generator
  keyGenerator?: (args: any) => string;

  // Whether to cache the result
  cache?: boolean;
}

/**
 * In-memory request deduplication cache
 * Stores pending requests and their results
 */
class DeduplicationCache {
  private pending: Map<string, Promise<any>> = new Map();
  private results: Map<string, { value: any; timestamp: number }> = new Map();
  private readonly defaultTTL = 60000; // 1 minute

  /**
   * Get or execute a request
   */
  async getOrExecute<T>(
    key: string,
    executor: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    // Check if result is cached and still valid
    const cached = this.results.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.value;
    }

    // Check if request is already pending
    const pending = this.pending.get(key);
    if (pending) {
      return pending;
    }

    // Execute the request
    const promise = executor();

    // Store pending request
    this.pending.set(key, promise);

    try {
      const result = await promise;

      // Cache the result
      this.results.set(key, { value: result, timestamp: Date.now() });

      return result;
    } finally {
      // Remove from pending
      this.pending.delete(key);
    }
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.pending.clear();
    this.results.clear();
  }

  /**
   * Clear expired entries
   */
  clearExpired(ttl: number = this.defaultTTL): void {
    const now = Date.now();
    for (const [key, { timestamp }] of this.results.entries()) {
      if (now - timestamp > ttl) {
        this.results.delete(key);
      }
    }
  }

  /**
   * Get cache size
   */
  getSize(): number {
    return this.results.size + this.pending.size;
  }
}

// Global deduplication cache
const globalCache = new DeduplicationCache();

/**
 * Deduplicate a request
 */
export async function deduplicateRequest<T>(
  key: string,
  executor: () => Promise<T>,
  options?: DeduplicationOptions
): Promise<T> {
  const ttl = options?.ttl || 60000;
  return globalCache.getOrExecute(key, executor, ttl);
}

/**
 * Deduplicate with automatic key generation
 */
export async function deduplicate<T>(
  executor: () => Promise<T>,
  args: any,
  options?: DeduplicationOptions
): Promise<T> {
  const keyGenerator = options?.keyGenerator || defaultKeyGenerator;
  const key = keyGenerator(args);
  return deduplicateRequest(key, executor, options);
}

/**
 * Default key generator
 */
function defaultKeyGenerator(args: any): string {
  return JSON.stringify(args);
}

/**
 * Clear deduplication cache
 */
export function clearDeduplicationCache(): void {
  globalCache.clear();
}

/**
 * Clear expired deduplication entries
 */
export function clearExpiredDeduplication(ttl?: number): void {
  globalCache.clearExpired(ttl);
}

/**
 * Get deduplication cache size
 */
export function getDeduplicationCacheSize(): number {
  return globalCache.getSize();
}

/**
 * Decorator for deduplicating async functions
 */
export function Deduplicate(options?: DeduplicationOptions) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const keyGenerator = options?.keyGenerator || defaultKeyGenerator;
      const key = `${propertyKey}:${keyGenerator(args)}`;
      const ttl = options?.ttl || 60000;

      return deduplicateRequest(
        key,
        () => originalMethod.apply(this, args),
        { ttl }
      );
    };

    return descriptor;
  };
}

/**
 * Request deduplication for specific use cases
 */

/**
 * Deduplicate AI API calls
 */
export async function deduplicateAICall<T>(
  model: string,
  prompt: string,
  executor: () => Promise<T>,
  ttl: number = 3600000 // 1 hour
): Promise<T> {
  const key = `ai:${model}:${hashString(prompt)}`;
  return deduplicateRequest(key, executor, { ttl });
}

/**
 * Deduplicate database queries
 */
export async function deduplicateQuery<T>(
  query: string,
  params: any,
  executor: () => Promise<T>,
  ttl: number = 300000 // 5 minutes
): Promise<T> {
  const key = `query:${hashString(query + JSON.stringify(params))}`;
  return deduplicateRequest(key, executor, { ttl });
}

/**
 * Deduplicate API calls
 */
export async function deduplicateAPICall<T>(
  method: string,
  url: string,
  body?: any,
  ttl: number = 60000 // 1 minute
): Promise<T> {
  const key = `api:${method}:${url}:${hashString(JSON.stringify(body || {}))}`;
  return deduplicateRequest(key, async () => {
    const response = await fetch(url, {
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers: { 'Content-Type': 'application/json' },
    });
    return response.json();
  }, { ttl });
}

/**
 * Simple hash function for strings
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Request deduplication middleware for API routes
 */
export function createDeduplicationMiddleware(ttl: number = 60000) {
  return async (request: Request, handler: () => Promise<Response>) => {
    const key = `${request.method}:${request.url}:${await request.text()}`;
    
    try {
      const response = await deduplicateRequest(
        key,
        () => handler(),
        { ttl }
      );
      return response;
    } catch (error) {
      throw error;
    }
  };
}

/**
 * Batch request deduplication
 * Deduplicates multiple requests and returns results in order
 */
export async function deduplicateBatch<T>(
  requests: Array<{
    key: string;
    executor: () => Promise<T>;
  }>,
  ttl: number = 60000
): Promise<T[]> {
  return Promise.all(
    requests.map(({ key, executor }) =>
      deduplicateRequest(key, executor, { ttl })
    )
  );
}

