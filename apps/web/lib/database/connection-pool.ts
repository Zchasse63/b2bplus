/**
 * Database Connection Pool Configuration
 * Manages Supabase connection pooling for optimal performance
 */

export interface PoolConfig {
  // Connection pool settings
  maxConnections: number;
  minConnections: number;
  connectionTimeout: number; // milliseconds
  idleTimeout: number; // milliseconds
  maxLifetime: number; // milliseconds

  // Query settings
  queryTimeout: number; // milliseconds
  statementTimeout: number; // milliseconds

  // Monitoring
  enableMetrics: boolean;
  logConnections: boolean;
}

/**
 * Default pool configuration optimized for serverless environments
 */
export const DEFAULT_POOL_CONFIG: PoolConfig = {
  // Supabase default: 3 connections per serverless function
  // We use conservative limits to avoid connection exhaustion
  maxConnections: 10,
  minConnections: 2,
  connectionTimeout: 5000, // 5 seconds
  idleTimeout: 30000, // 30 seconds
  maxLifetime: 3600000, // 1 hour

  // Query timeouts
  queryTimeout: 30000, // 30 seconds
  statementTimeout: 30000, // 30 seconds

  // Monitoring
  enableMetrics: true,
  logConnections: process.env.NODE_ENV === 'development',
};

/**
 * Production pool configuration
 * More aggressive connection reuse
 */
export const PRODUCTION_POOL_CONFIG: PoolConfig = {
  maxConnections: 20,
  minConnections: 5,
  connectionTimeout: 10000,
  idleTimeout: 60000,
  maxLifetime: 7200000, // 2 hours

  queryTimeout: 60000, // 60 seconds
  statementTimeout: 60000,

  enableMetrics: true,
  logConnections: false,
};

/**
 * Development pool configuration
 * Relaxed limits for development
 */
export const DEVELOPMENT_POOL_CONFIG: PoolConfig = {
  maxConnections: 5,
  minConnections: 1,
  connectionTimeout: 3000,
  idleTimeout: 10000,
  maxLifetime: 1800000, // 30 minutes

  queryTimeout: 30000,
  statementTimeout: 30000,

  enableMetrics: true,
  logConnections: true,
};

/**
 * Get appropriate pool configuration based on environment
 */
export function getPoolConfig(): PoolConfig {
  const env = (process.env.NODE_ENV || 'development') as string;

  switch (env) {
    case 'production':
      return PRODUCTION_POOL_CONFIG;
    case 'staging':
      return {
        ...PRODUCTION_POOL_CONFIG,
        maxConnections: 15,
        enableMetrics: true,
      };
    case 'development':
    default:
      return DEVELOPMENT_POOL_CONFIG;
  }
}

/**
 * Connection pool metrics
 */
export interface PoolMetrics {
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  totalConnections: number;
  utilizationPercent: number;
  averageQueryTime: number;
  maxQueryTime: number;
  failedConnections: number;
  successfulConnections: number;
}

/**
 * Connection pool monitor
 */
export class ConnectionPoolMonitor {
  private metrics: PoolMetrics = {
    activeConnections: 0,
    idleConnections: 0,
    waitingRequests: 0,
    totalConnections: 0,
    utilizationPercent: 0,
    averageQueryTime: 0,
    maxQueryTime: 0,
    failedConnections: 0,
    successfulConnections: 0,
  };

  private queryTimes: number[] = [];
  private readonly maxSamples = 100;

  /**
   * Record a query execution
   */
  recordQuery(duration: number, success: boolean): void {
    if (success) {
      this.metrics.successfulConnections++;
    } else {
      this.metrics.failedConnections++;
    }

    this.queryTimes.push(duration);
    if (this.queryTimes.length > this.maxSamples) {
      this.queryTimes.shift();
    }

    this.updateMetrics();
  }

  /**
   * Update calculated metrics
   */
  private updateMetrics(): void {
    if (this.queryTimes.length === 0) return;

    const sum = this.queryTimes.reduce((a, b) => a + b, 0);
    this.metrics.averageQueryTime = sum / this.queryTimes.length;
    this.metrics.maxQueryTime = Math.max(...this.queryTimes);

    const total = this.metrics.activeConnections + this.metrics.idleConnections;
    this.metrics.totalConnections = total;
    this.metrics.utilizationPercent =
      total > 0 ? (this.metrics.activeConnections / total) * 100 : 0;
  }

  /**
   * Get current metrics
   */
  getMetrics(): PoolMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.metrics = {
      activeConnections: 0,
      idleConnections: 0,
      waitingRequests: 0,
      totalConnections: 0,
      utilizationPercent: 0,
      averageQueryTime: 0,
      maxQueryTime: 0,
      failedConnections: 0,
      successfulConnections: 0,
    };
    this.queryTimes = [];
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    healthy: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];

    if (this.metrics.utilizationPercent > 90) {
      warnings.push('High connection pool utilization (>90%)');
    }

    if (this.metrics.averageQueryTime > 5000) {
      warnings.push('High average query time (>5s)');
    }

    if (this.metrics.failedConnections > this.metrics.successfulConnections * 0.1) {
      warnings.push('High connection failure rate (>10%)');
    }

    return {
      healthy: warnings.length === 0,
      warnings,
    };
  }
}

/**
 * Global connection pool monitor instance
 */
export const poolMonitor = new ConnectionPoolMonitor();

/**
 * Recommended connection pool settings for different scenarios
 */
export const POOL_PRESETS = {
  // For high-traffic APIs
  highTraffic: {
    maxConnections: 30,
    minConnections: 10,
    connectionTimeout: 15000,
    idleTimeout: 120000,
  },

  // For batch processing
  batchProcessing: {
    maxConnections: 50,
    minConnections: 20,
    connectionTimeout: 30000,
    idleTimeout: 300000,
  },

  // For real-time applications
  realTime: {
    maxConnections: 20,
    minConnections: 5,
    connectionTimeout: 5000,
    idleTimeout: 60000,
  },

  // For serverless functions
  serverless: {
    maxConnections: 10,
    minConnections: 2,
    connectionTimeout: 5000,
    idleTimeout: 30000,
  },
} as const;

