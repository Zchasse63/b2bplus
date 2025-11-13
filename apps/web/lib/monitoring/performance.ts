/**
 * Performance Monitoring
 * Tracks and reports performance metrics for API endpoints and operations
 */

import { createLogger } from '@/lib/logging/logger';

const logger = createLogger('performance-monitoring');

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: string;
  endpoint?: string;
  method?: string;
  status?: number;
  userId?: string;
  organizationId?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceThresholds {
  warning: number; // milliseconds
  critical: number; // milliseconds
}

// Default thresholds
const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  warning: 1000, // 1 second
  critical: 5000, // 5 seconds
};

// Endpoint-specific thresholds
const ENDPOINT_THRESHOLDS: Record<string, PerformanceThresholds> = {
  '/api/ai/': { warning: 5000, critical: 30000 }, // AI calls are slower
  '/api/pricing/': { warning: 500, critical: 2000 }, // Pricing should be fast
  '/api/orders/': { warning: 1000, critical: 5000 },
  '/api/invoices/': { warning: 2000, critical: 10000 },
};

/**
 * Get thresholds for an endpoint
 */
function getThresholds(endpoint: string): PerformanceThresholds {
  for (const [pattern, thresholds] of Object.entries(ENDPOINT_THRESHOLDS)) {
    if (endpoint.startsWith(pattern)) {
      return thresholds;
    }
  }
  return DEFAULT_THRESHOLDS;
}

/**
 * Record a performance metric
 */
export function recordMetric(metric: PerformanceMetric): void {
  const thresholds = getThresholds(metric.endpoint || '');

  // Determine severity
  let severity = 'info';
  if (metric.duration >= thresholds.critical) {
    severity = 'critical';
  } else if (metric.duration >= thresholds.warning) {
    severity = 'warning';
  }

  // Log the metric
  logger.info(`Performance metric: ${metric.name}`, {
    ...metric,
    severity,
    thresholds,
  });

  // Send to monitoring service (Sentry, DataDog, etc.)
  if (typeof window !== 'undefined') {
    const windowWithSentry = window as any;
    if (windowWithSentry.__SENTRY__) {
      windowWithSentry.__SENTRY__.captureMessage(`Performance: ${metric.name}`, {
        level: severity as any,
        contexts: {
          performance: metric,
        },
      });
    }
  }
}

/**
 * Measure operation duration
 */
export async function measureOperation<T>(
  name: string,
  operation: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await operation();
    const duration = Date.now() - startTime;

    recordMetric({
      name,
      duration,
      timestamp: new Date().toISOString(),
      metadata,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    recordMetric({
      name: `${name} (failed)`,
      duration,
      timestamp: new Date().toISOString(),
      metadata: {
        ...metadata,
        error: error instanceof Error ? error.message : String(error),
      },
    });

    throw error;
  }
}

/**
 * Measure API endpoint performance
 */
export async function measureEndpoint<T>(
  endpoint: string,
  method: string,
  operation: () => Promise<{ response: T; status: number }>,
  userId?: string,
  organizationId?: string
): Promise<{ response: T; status: number }> {
  const startTime = Date.now();

  try {
    const result = await operation();
    const duration = Date.now() - startTime;

    recordMetric({
      name: `${method} ${endpoint}`,
      duration,
      timestamp: new Date().toISOString(),
      endpoint,
      method,
      status: result.status,
      userId,
      organizationId,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    recordMetric({
      name: `${method} ${endpoint} (failed)`,
      duration,
      timestamp: new Date().toISOString(),
      endpoint,
      method,
      status: 500,
      userId,
      organizationId,
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    });

    throw error;
  }
}

/**
 * Measure database query performance
 */
export async function measureQuery<T>(
  query: string,
  operation: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await operation();
    const duration = Date.now() - startTime;

    if (duration > 1000) {
      logger.warn('Slow database query', {
        query,
        duration,
      });
    }

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Database query failed', error, {
      query,
      duration,
    });

    throw error;
  }
}

/**
 * Measure AI API call performance
 */
export async function measureAICall<T>(
  model: string,
  operation: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await operation();
    const duration = Date.now() - startTime;

    recordMetric({
      name: `AI call: ${model}`,
      duration,
      timestamp: new Date().toISOString(),
      metadata: { model },
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    recordMetric({
      name: `AI call: ${model} (failed)`,
      duration,
      timestamp: new Date().toISOString(),
      metadata: {
        model,
        error: error instanceof Error ? error.message : String(error),
      },
    });

    throw error;
  }
}

