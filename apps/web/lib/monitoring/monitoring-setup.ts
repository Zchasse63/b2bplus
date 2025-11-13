/**
 * Monitoring & Alerting Setup
 * Configures monitoring, metrics collection, and alerting
 */

import * as Sentry from '@sentry/nextjs';

export interface MonitoringConfig {
  enabled: boolean;
  environment: string;
  dsn: string;
  tracesSampleRate: number;
  profilesSampleRate: number;
  debug: boolean;
}

export interface AlertThresholds {
  errorRate: number; // percentage
  responseTime: number; // milliseconds
  cpuUsage: number; // percentage
  memoryUsage: number; // percentage
  databaseConnections: number;
  cacheHitRate: number; // percentage
}

/**
 * Initialize Sentry for error tracking
 */
export function initializeSentry(config: MonitoringConfig): void {
  if (!config.enabled) return;

  const integrations: any[] = [];

  // Add Replay integration if available
  if ((Sentry as any).Replay) {
    integrations.push(
      new (Sentry as any).Replay({
        maskAllText: true,
        blockAllMedia: true,
      })
    );
  }

  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    tracesSampleRate: config.tracesSampleRate,
    profilesSampleRate: config.profilesSampleRate,
    debug: config.debug,
    integrations,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

/**
 * Metrics collector
 */
export class MetricsCollector {
  private metrics: Map<string, number[]> = new Map();
  private readonly maxSamples = 1000;

  /**
   * Record a metric
   */
  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const samples = this.metrics.get(name)!;
    samples.push(value);

    // Keep only recent samples
    if (samples.length > this.maxSamples) {
      samples.shift();
    }
  }

  /**
   * Get metric statistics
   */
  getMetricStats(name: string): {
    count: number;
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const samples = this.metrics.get(name);
    if (!samples || samples.length === 0) return null;

    const sorted = [...samples].sort((a, b) => a - b);
    const count = sorted.length;
    const min = sorted[0];
    const max = sorted[count - 1];
    const avg = sorted.reduce((a, b) => a + b, 0) / count;

    return {
      count,
      min,
      max,
      avg,
      p50: sorted[Math.floor(count * 0.5)],
      p95: sorted[Math.floor(count * 0.95)],
      p99: sorted[Math.floor(count * 0.99)],
    };
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
  }

  /**
   * Export metrics
   */
  exportMetrics(): Record<string, any> {
    const exported: Record<string, any> = {};

    for (const [name, samples] of this.metrics.entries()) {
      exported[name] = this.getMetricStats(name);
    }

    return exported;
  }
}

/**
 * Alert manager
 */
export class AlertManager {
  private alerts: Map<string, { triggered: boolean; lastTriggered: number }> = new Map();
  private readonly cooldownPeriod = 300000; // 5 minutes

  /**
   * Check if alert should be triggered
   */
  shouldTriggerAlert(name: string, condition: boolean, thresholds: AlertThresholds): boolean {
    if (!condition) {
      this.alerts.delete(name);
      return false;
    }

    const alert = this.alerts.get(name);
    const now = Date.now();

    // Check cooldown period
    if (alert && alert.triggered && now - alert.lastTriggered < this.cooldownPeriod) {
      return false;
    }

    this.alerts.set(name, { triggered: true, lastTriggered: now });
    return true;
  }

  /**
   * Trigger alert
   */
  async triggerAlert(name: string, message: string, severity: 'critical' | 'warning' | 'info'): Promise<void> {
    console.error(`[ALERT] ${severity.toUpperCase()}: ${name} - ${message}`);

    // Send to Sentry
    Sentry.captureMessage(message, severity === 'critical' ? 'fatal' : severity);

    // Send to monitoring service
    await this.sendToMonitoringService(name, message, severity);
  }

  /**
   * Send alert to monitoring service
   */
  private async sendToMonitoringService(
    name: string,
    message: string,
    severity: string
  ): Promise<void> {
    try {
      // Send to Slack
      if (process.env.SLACK_WEBHOOK_URL) {
        await fetch(process.env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🚨 ${severity.toUpperCase()}: ${name}`,
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*${severity.toUpperCase()}*\n*Alert:* ${name}\n*Message:* ${message}`,
                },
              },
            ],
          }),
        });
      }

      // Send to PagerDuty
      if (process.env.PAGERDUTY_INTEGRATION_KEY && severity === 'critical') {
        await fetch('https://events.pagerduty.com/v2/enqueue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            routing_key: process.env.PAGERDUTY_INTEGRATION_KEY,
            event_action: 'trigger',
            payload: {
              summary: message,
              severity: severity,
              source: 'B2B Plus',
            },
          }),
        });
      }
    } catch (error) {
      console.error('Failed to send alert:', error);
    }
  }
}

/**
 * Performance monitor
 */
export class PerformanceMonitor {
  private collector = new MetricsCollector();
  private alertManager = new AlertManager();

  /**
   * Monitor API endpoint
   */
  async monitorEndpoint(
    name: string,
    fn: () => Promise<any>,
    thresholds: AlertThresholds
  ): Promise<any> {
    const start = performance.now();

    try {
      const result = await fn();
      const duration = performance.now() - start;

      this.collector.recordMetric(`${name}_duration`, duration);

      // Check thresholds
      if (duration > thresholds.responseTime) {
        await this.alertManager.triggerAlert(
          `${name}_slow`,
          `Endpoint ${name} took ${duration}ms (threshold: ${thresholds.responseTime}ms)`,
          'warning'
        );
      }

      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.collector.recordMetric(`${name}_error`, 1);

      Sentry.captureException(error);
      throw error;
    }
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): Record<string, any> {
    return this.collector.exportMetrics();
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.collector.clearMetrics();
  }
}

/**
 * Global monitoring instances
 */
export const metricsCollector = new MetricsCollector();
export const alertManager = new AlertManager();
export const performanceMonitor = new PerformanceMonitor();

/**
 * Default alert thresholds
 */
export const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  errorRate: 1, // 1%
  responseTime: 1000, // 1 second
  cpuUsage: 80, // 80%
  memoryUsage: 85, // 85%
  databaseConnections: 90, // 90% of max
  cacheHitRate: 50, // 50%
};

/**
 * Initialize monitoring
 */
export function initializeMonitoring(config: MonitoringConfig): void {
  initializeSentry(config);

  // Set up periodic health checks
  if (config.enabled) {
    setInterval(() => {
      const metrics = metricsCollector.exportMetrics();
      console.log('[METRICS]', metrics);
    }, 60000); // Every minute
  }
}

/**
 * Middleware for monitoring API routes
 */
export async function monitoringMiddleware(
  request: Request,
  handler: () => Promise<Response>
): Promise<Response> {
  const start = performance.now();
  const path = new URL(request.url).pathname;

  try {
    const response = await handler();
    const duration = performance.now() - start;

    metricsCollector.recordMetric(`api_${path}_duration`, duration);
    metricsCollector.recordMetric(`api_${path}_status_${response.status}`, 1);

    return response;
  } catch (error) {
    const duration = performance.now() - start;
    metricsCollector.recordMetric(`api_${path}_error`, 1);

    Sentry.captureException(error);
    throw error;
  }
}

