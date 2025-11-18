/**
 * Comprehensive API Logging System
 * Logs all API requests with correlation IDs, response times, and errors
 * TASK-034: Add Comprehensive API Logging
 */

import { NextRequest, NextResponse } from 'next/server';

export interface RequestLog {
  correlationId: string;
  timestamp: string;
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  userId?: string;
  organizationId?: string;
  error?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface LogConfig {
  enableConsoleLogging: boolean;
  enableFileLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  excludePaths: string[];
  includeSensitiveData: boolean;
}

const DEFAULT_CONFIG: LogConfig = {
  enableConsoleLogging: true,
  enableFileLogging: process.env.NODE_ENV === 'production',
  logLevel: process.env.LOG_LEVEL as any || 'info',
  excludePaths: ['/health', '/metrics', '/api/public'],
  includeSensitiveData: false,
};

class APILogger {
  private config: LogConfig;
  private logs: RequestLog[] = [];
  private maxLogs = 10000;

  constructor(config: Partial<LogConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate unique correlation ID for request tracking
   */
  generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Extract user info from request
   */
  extractUserInfo(request: NextRequest): { userId?: string; organizationId?: string } {
    try {
      const authHeader = request.headers.get('authorization');
      // In production, decode JWT to get user/org info
      return {
        userId: request.headers.get('x-user-id') || undefined,
        organizationId: request.headers.get('x-org-id') || undefined,
      };
    } catch {
      return {};
    }
  }

  /**
   * Check if path should be logged
   */
  shouldLog(path: string): boolean {
    return !this.config.excludePaths.some(excludePath =>
      path.startsWith(excludePath)
    );
  }

  /**
   * Create request log entry
   */
  createLog(
    correlationId: string,
    request: NextRequest,
    statusCode: number,
    duration: number,
    error?: string
  ): RequestLog {
    const { userId, organizationId } = this.extractUserInfo(request);

    return {
      correlationId,
      timestamp: new Date().toISOString(),
      method: request.method,
      path: new URL(request.url).pathname,
      statusCode,
      duration,
      userId,
      organizationId,
      error,
      userAgent: request.headers.get('user-agent') || undefined,
      ipAddress: request.headers.get('x-forwarded-for') ||
        request.headers.get('x-real-ip') ||
        'unknown',
    };
  }

  /**
   * Log to console
   */
  private logToConsole(log: RequestLog, level: string): void {
    if (!this.config.enableConsoleLogging) return;

    const logLevel = ['debug', 'info', 'warn', 'error'].indexOf(level);
    const configLevel = ['debug', 'info', 'warn', 'error'].indexOf(this.config.logLevel);

    if (logLevel < configLevel) return;

    const message = `[${log.correlationId}] ${log.method} ${log.path} - ${log.statusCode} (${log.duration}ms)`;
    const meta = {
      userId: log.userId,
      organizationId: log.organizationId,
      ipAddress: log.ipAddress,
      ...(log.error && { error: log.error }),
    };

    const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
    (console as any)[consoleMethod](message, meta);
  }

  /**
   * Store log in memory
   */
  private storeLog(log: RequestLog): void {
    this.logs.push(log);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  /**
   * Get recent logs
   */
  getRecentLogs(count: number = 100): RequestLog[] {
    return this.logs.slice(-count);
  }

  /**
   * Get logs by correlation ID
   */
  getLogsByCorrelationId(correlationId: string): RequestLog[] {
    return this.logs.filter(log => log.correlationId === correlationId);
  }

  /**
   * Get logs by user ID
   */
  getLogsByUserId(userId: string, count: number = 100): RequestLog[] {
    return this.logs
      .filter(log => log.userId === userId)
      .slice(-count);
  }

  /**
   * Get error logs
   */
  getErrorLogs(count: number = 100): RequestLog[] {
    return this.logs
      .filter(log => log.statusCode >= 400)
      .slice(-count);
  }

  /**
   * Get performance metrics
   */
  getMetrics(timeWindow: number = 3600000): {
    totalRequests: number;
    avgResponseTime: number;
    errorCount: number;
    errorRate: number;
  } {
    const now = Date.now();
    const cutoff = now - timeWindow;

    const filtered = this.logs.filter(log => {
      const logTime = new Date(log.timestamp).getTime();
      return logTime >= cutoff;
    });

    const errorCount = filtered.filter(log => log.statusCode >= 400).length;
    const avgResponseTime = filtered.length > 0
      ? filtered.reduce((sum, log) => sum + log.duration, 0) / filtered.length
      : 0;

    return {
      totalRequests: filtered.length,
      avgResponseTime: Math.round(avgResponseTime),
      errorCount,
      errorRate: filtered.length > 0 ? (errorCount / filtered.length) * 100 : 0,
    };
  }

  /**
   * Log request
   */
  logRequest(log: RequestLog): void {
    const level = log.statusCode >= 500 ? 'error' : log.statusCode >= 400 ? 'warn' : 'info';
    this.logToConsole(log, level);
    this.storeLog(log);
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.logs = [];
  }
}

// Export singleton instance
export const apiLogger = new APILogger();

/**
 * Middleware for logging API requests
 */
export async function withAPILogging(
  request: NextRequest,
  handler: (request: NextRequest, correlationId: string) => Promise<NextResponse>
): Promise<NextResponse> {
  const correlationId = apiLogger.generateCorrelationId();
  const path = new URL(request.url).pathname;

  // Skip logging for excluded paths
  if (!apiLogger.shouldLog(path)) {
    return handler(request, correlationId);
  }

  const startTime = Date.now();

  try {
    const response = await handler(request, correlationId);
    const duration = Date.now() - startTime;

    const log = apiLogger.createLog(
      correlationId,
      request,
      response.status,
      duration
    );

    apiLogger.logRequest(log);

    // Add correlation ID to response headers
    const headers = new Headers(response.headers);
    headers.set('X-Correlation-ID', correlationId);

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    const log = apiLogger.createLog(
      correlationId,
      request,
      500,
      duration,
      errorMessage
    );

    apiLogger.logRequest(log);

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        correlationId,
      },
      {
        status: 500,
        headers: { 'X-Correlation-ID': correlationId },
      }
    );
  }
}

/**
 * API logging statistics endpoint
 */
export function getLoggingStats() {
  return {
    recentLogs: apiLogger.getRecentLogs(50),
    metrics: apiLogger.getMetrics(),
    errorLogs: apiLogger.getErrorLogs(20),
  };
}

export default apiLogger;
