/**
 * Performance Optimization Utilities
 * 
 * This module provides utilities for improving application performance,
 * including caching, query optimization, and rate limiting.
 */

/**
 * Simple in-memory cache with TTL support
 */
export class Cache<T> {
  private cache: Map<string, { value: T; expiry: number }> = new Map();
  private defaultTTL: number;
  
  constructor(defaultTTL: number = 300000) { // Default 5 minutes
    this.defaultTTL = defaultTTL;
  }
  
  set(key: string, value: T, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { value, expiry });
  }
  
  get(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  has(key: string): boolean {
    return this.get(key) !== null;
  }
  
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  size(): number {
    // Clean up expired entries first
    this.cleanup();
    return this.cache.size;
  }
  
  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Memoization decorator for expensive function calls
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  keyGenerator?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyGenerator 
      ? keyGenerator(...args)
      : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = fn(...args);
    cache.set(key, result);
    
    return result;
  }) as T;
}

/**
 * Debounce function to limit execution rate
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

/**
 * Throttle function to limit execution frequency
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Rate limiter for API endpoints
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private maxRequests: number;
  private windowMs: number;
  
  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }
  
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];
    
    // Remove old requests outside the time window
    const recentRequests = userRequests.filter(
      timestamp => now - timestamp < this.windowMs
    );
    
    if (recentRequests.length >= this.maxRequests) {
      return false;
    }
    
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);
    
    return true;
  }
  
  getRemainingRequests(identifier: string): number {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];
    const recentRequests = userRequests.filter(
      timestamp => now - timestamp < this.windowMs
    );
    
    return Math.max(0, this.maxRequests - recentRequests.length);
  }
  
  reset(identifier: string): void {
    this.requests.delete(identifier);
  }
}

/**
 * Database query optimization helpers
 */

export interface QueryOptimizationOptions {
  useIndex?: string;
  selectFields?: string[];
  limit?: number;
  offset?: number;
}

/**
 * Generate optimized SELECT clause
 */
export function buildSelectClause(
  tableName: string,
  fields?: string[]
): string {
  if (!fields || fields.length === 0) {
    return `${tableName}.*`;
  }
  
  return fields.map(field => `${tableName}.${field}`).join(', ');
}

/**
 * Batch database operations to reduce round trips
 */
export async function batchOperation<T, R>(
  items: T[],
  operation: (batch: T[]) => Promise<R[]>,
  batchSize: number = 100
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await operation(batch);
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Parallel execution with concurrency limit
 */
export async function parallelLimit<T, R>(
  items: T[],
  operation: (item: T) => Promise<R>,
  concurrency: number = 5
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];
  
  for (const item of items) {
    const promise = operation(item).then(result => {
      results.push(result);
    });
    
    executing.push(promise);
    
    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(
        executing.findIndex(p => p === promise),
        1
      );
    }
  }
  
  await Promise.all(executing);
  return results;
}

/**
 * Lazy loading helper
 */
export class LazyLoader<T> {
  private loader: () => Promise<T>;
  private cached: T | null = null;
  private loading: Promise<T> | null = null;
  
  constructor(loader: () => Promise<T>) {
    this.loader = loader;
  }
  
  async load(): Promise<T> {
    if (this.cached !== null) {
      return this.cached;
    }
    
    if (this.loading !== null) {
      return this.loading;
    }
    
    this.loading = this.loader();
    this.cached = await this.loading;
    this.loading = null;
    
    return this.cached;
  }
  
  reset(): void {
    this.cached = null;
    this.loading = null;
  }
}

/**
 * Performance monitoring
 */

export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  
  start(label: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.record(label, duration);
    };
  }
  
  record(label: string, duration: number): void {
    const existing = this.metrics.get(label) || [];
    existing.push(duration);
    this.metrics.set(label, existing);
  }
  
  getStats(label: string): {
    count: number;
    min: number;
    max: number;
    avg: number;
    median: number;
  } | null {
    const durations = this.metrics.get(label);
    
    if (!durations || durations.length === 0) {
      return null;
    }
    
    const sorted = [...durations].sort((a, b) => a - b);
    const sum = durations.reduce((a, b) => a + b, 0);
    
    return {
      count: durations.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / durations.length,
      median: sorted[Math.floor(sorted.length / 2)]
    };
  }
  
  clear(label?: string): void {
    if (label) {
      this.metrics.delete(label);
    } else {
      this.metrics.clear();
    }
  }
  
  getAllStats(): Record<string, ReturnType<typeof this.getStats>> {
    const stats: Record<string, ReturnType<typeof this.getStats>> = {};
    
    for (const label of this.metrics.keys()) {
      stats[label] = this.getStats(label);
    }
    
    return stats;
  }
}

/**
 * Connection pooling helper
 */
export class ConnectionPool<T> {
  private pool: T[] = [];
  private inUse: Set<T> = new Set();
  private maxSize: number;
  private factory: () => Promise<T>;
  
  constructor(factory: () => Promise<T>, maxSize: number = 10) {
    this.factory = factory;
    this.maxSize = maxSize;
  }
  
  async acquire(): Promise<T> {
    // Try to get an existing connection from the pool
    if (this.pool.length > 0) {
      const connection = this.pool.pop()!;
      this.inUse.add(connection);
      return connection;
    }
    
    // Create a new connection if under max size
    if (this.inUse.size < this.maxSize) {
      const connection = await this.factory();
      this.inUse.add(connection);
      return connection;
    }
    
    // Wait for a connection to be released
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.pool.length > 0) {
          clearInterval(checkInterval);
          const connection = this.pool.pop()!;
          this.inUse.add(connection);
          resolve(connection);
        }
      }, 100);
    });
  }
  
  release(connection: T): void {
    this.inUse.delete(connection);
    this.pool.push(connection);
  }
  
  async drain(): Promise<void> {
    // Wait for all connections to be released
    while (this.inUse.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.pool = [];
  }
}
