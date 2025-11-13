/**
 * Structured Logging Utility
 * Provides consistent logging across the application
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL',
}

export interface LogContext {
  requestId?: string;
  userId?: string;
  organizationId?: string;
  endpoint?: string;
  method?: string;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  duration?: number;
}

/**
 * Format error for logging
 */
function formatError(error: unknown): LogEntry['error'] {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    name: 'Unknown',
    message: String(error),
  };
}

/**
 * Create a log entry
 */
function createLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: unknown
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
    error: error ? formatError(error) : undefined,
  };
}

/**
 * Format log entry for console output
 */
function formatLogEntry(entry: LogEntry): string {
  const parts = [
    `[${entry.timestamp}]`,
    `[${entry.level}]`,
    entry.message,
  ];

  if (entry.context) {
    parts.push(JSON.stringify(entry.context));
  }

  if (entry.error) {
    parts.push(`Error: ${entry.error.name} - ${entry.error.message}`);
    if (entry.error.stack && process.env.NODE_ENV === 'development') {
      parts.push(entry.error.stack);
    }
  }

  if (entry.duration !== undefined) {
    parts.push(`(${entry.duration}ms)`);
  }

  return parts.join(' ');
}

/**
 * Logger class for structured logging
 */
export class Logger {
  private context: LogContext;

  constructor(context: LogContext = {}) {
    this.context = context;
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: LogContext): Logger {
    return new Logger({
      ...this.context,
      ...additionalContext,
    });
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void {
    const entry = createLogEntry(
      LogLevel.DEBUG,
      message,
      { ...this.context, ...context }
    );
    console.debug(formatLogEntry(entry));
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    const entry = createLogEntry(
      LogLevel.INFO,
      message,
      { ...this.context, ...context }
    );
    console.log(formatLogEntry(entry));
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext, error?: unknown): void {
    const entry = createLogEntry(
      LogLevel.WARN,
      message,
      { ...this.context, ...context },
      error
    );
    console.warn(formatLogEntry(entry));
  }

  /**
   * Log error message
   */
  error(message: string, error?: unknown, context?: LogContext): void {
    const entry = createLogEntry(
      LogLevel.ERROR,
      message,
      { ...this.context, ...context },
      error
    );
    console.error(formatLogEntry(entry));
  }

  /**
   * Log fatal error
   */
  fatal(message: string, error?: unknown, context?: LogContext): void {
    const entry = createLogEntry(
      LogLevel.FATAL,
      message,
      { ...this.context, ...context },
      error
    );
    console.error(formatLogEntry(entry));
  }

  /**
   * Time an operation and log the duration
   */
  async time<T>(
    message: string,
    fn: () => Promise<T>,
    context?: LogContext
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      const entry = createLogEntry(
        LogLevel.DEBUG,
        `${message} completed`,
        { ...this.context, ...context },
        undefined
      );
      entry.duration = duration;
      console.debug(formatLogEntry(entry));
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const entry = createLogEntry(
        LogLevel.ERROR,
        `${message} failed`,
        { ...this.context, ...context },
        error
      );
      entry.duration = duration;
      console.error(formatLogEntry(entry));
      throw error;
    }
  }
}

/**
 * Global logger instance
 */
export const logger = new Logger();

/**
 * Create a logger for a specific module
 */
export function createLogger(module: string): Logger {
  return logger.child({ module });
}

