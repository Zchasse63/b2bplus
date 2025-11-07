/**
 * Production-Safe Logger
 *
 * Wrapper around console that only logs in development
 * Prevents sensitive information leakage in production
 *
 * Usage:
 * import { logger } from '@/lib/logger';
 * logger.log('debug info');
 * logger.error('error info');
 * logger.warn('warning info');
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

/**
 * Logger levels
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

/**
 * Production-safe logger
 */
export const logger = {
  /**
   * Log error messages
   * Always logged in all environments
   */
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  },

  /**
   * Log warning messages
   * Logged in development and production
   */
  warn: (message: string, ...args: any[]) => {
    if (isDevelopment || process.env.LOG_LEVEL === 'warn') {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },

  /**
   * Log info messages
   * Only logged in development unless LOG_LEVEL=info
   */
  info: (message: string, ...args: any[]) => {
    if (isDevelopment || process.env.LOG_LEVEL === 'info') {
      console.info(`[INFO] ${message}`, ...args);
    }
  },

  /**
   * Log debug messages
   * Only logged in development or test
   */
  log: (message: string, ...args: any[]) => {
    if (isDevelopment || isTest) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },

  /**
   * Log debug messages (alias)
   */
  debug: (message: string, ...args: any[]) => {
    if (isDevelopment || isTest || process.env.LOG_LEVEL === 'debug') {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },

  /**
   * Log table data
   * Only in development
   */
  table: (data: any) => {
    if (isDevelopment) {
      console.table(data);
    }
  },

  /**
   * Log time tracking
   * Only in development
   */
  time: (label: string) => {
    if (isDevelopment) {
      console.time(label);
    }
  },

  /**
   * End time tracking
   * Only in development
   */
  timeEnd: (label: string) => {
    if (isDevelopment) {
      console.timeEnd(label);
    }
  },

  /**
   * Group console logs
   * Only in development
   */
  group: (label: string) => {
    if (isDevelopment) {
      console.group(label);
    }
  },

  /**
   * End console group
   * Only in development
   */
  groupEnd: () => {
    if (isDevelopment) {
      console.groupEnd();
    }
  },
};

/**
 * Performance logger for tracking operations
 */
export class PerformanceLogger {
  private startTime: number;
  private label: string;

  constructor(label: string) {
    this.label = label;
    this.startTime = Date.now();
    logger.time(label);
  }

  end(additionalInfo?: any) {
    const duration = Date.now() - this.startTime;
    logger.timeEnd(this.label);
    logger.debug(`${this.label} completed in ${duration}ms`, additionalInfo);
  }
}

/**
 * Structured logging for production monitoring
 * Can be integrated with services like LogRocket, Sentry, etc.
 */
export function logToMonitoring(level: LogLevel, message: string, metadata?: any) {
  // In production, send to monitoring service
  if (!isDevelopment) {
    // TODO: Integrate with monitoring service (LogRocket, Sentry, etc.)
    // For now, only log errors to console
    if (level === LogLevel.ERROR) {
      console.error(message, metadata);
    }
  } else {
    // In development, log to console
    console.log(`[${level.toUpperCase()}] ${message}`, metadata);
  }
}

/**
 * Log API errors with context
 */
export function logAPIError(
  endpoint: string,
  error: any,
  context?: any
) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';

  logger.error(`API Error: ${endpoint}`, {
    error: errorMessage,
    endpoint,
    ...context,
  });

  // Send to monitoring in production
  logToMonitoring(LogLevel.ERROR, `API Error: ${endpoint}`, {
    error: errorMessage,
    endpoint,
    ...context,
  });
}

/**
 * Log security events
 */
export function logSecurityEvent(
  event: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  details?: any
) {
  const message = `SECURITY [${severity.toUpperCase()}]: ${event}`;

  logger.warn(message, details);

  // Always send security events to monitoring
  logToMonitoring(LogLevel.ERROR, message, {
    severity,
    event,
    ...details,
  });
}

export default logger;
