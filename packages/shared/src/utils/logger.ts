/**
 * Centralized Logger Utility
 *
 * Provides consistent logging across the application with:
 * - Environment-aware output (dev vs production)
 * - Sentry integration for error tracking
 * - Structured logging with timestamps
 * - Error classification and context
 */

import * as Sentry from "@sentry/nextjs";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  userId?: string;
  organizationId?: string;
  orderId?: string;
  sessionId?: string;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
  stack?: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === "development";
  private isProduction = process.env.NODE_ENV === "production";

  /**
   * Debug level logging - detailed information for diagnosing problems
   */
  debug(message: string, context?: LogContext): void {
    const entry = this.createLogEntry("debug", message, context);
    this.output(entry);
  }

  /**
   * Info level logging - informational messages about application flow
   */
  info(message: string, context?: LogContext): void {
    const entry = this.createLogEntry("info", message, context);
    this.output(entry);
  }

  /**
   * Warn level logging - warning messages about potential issues
   */
  warn(message: string, context?: LogContext): void {
    const entry = this.createLogEntry("warn", message, context);
    this.output(entry);

    if (this.isProduction) {
      Sentry.captureMessage(message, "warning");
    }
  }

  /**
   * Error level logging - error messages with optional error object
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorObj = this.normalizeError(error);
    const entry = this.createLogEntry("error", message, context, errorObj);
    this.output(entry);

    if (this.isProduction) {
      Sentry.captureException(errorObj || new Error(message), {
        contexts: {
          app: context || {},
        },
      });
    }
  }

  /**
   * Create a structured log entry
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
      stack: error?.stack,
    };
  }

  /**
   * Output log entry to appropriate destination
   */
  private output(entry: LogEntry): void {
    const formatted = this.formatLogEntry(entry);

    // Always log to console in development
    if (this.isDevelopment) {
      switch (entry.level) {
        case "debug":
          console.debug(formatted, entry.context);
          break;
        case "info":
          console.info(formatted, entry.context);
          break;
        case "warn":
          console.warn(formatted, entry.context);
          break;
        case "error":
          console.error(formatted, entry.context, entry.error);
          break;
      }
    }

    // In production, use structured logging
    if (this.isProduction) {
      // Could integrate with ELK, DataDog, or other logging service
      // For now, Sentry handles error tracking
      if (entry.level === "error") {
        console.error(formatted);
      }
    }
  }

  /**
   * Format log entry for display
   */
  private formatLogEntry(entry: LogEntry): string {
    const levelUpper = entry.level.toUpperCase();
    return `[${entry.timestamp}] ${levelUpper}: ${entry.message}`;
  }

  /**
   * Normalize error from various types to Error object
   */
  private normalizeError(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }

    if (typeof error === "string") {
      return new Error(error);
    }

    if (typeof error === "object" && error !== null) {
      return new Error(JSON.stringify(error));
    }

    return new Error("Unknown error occurred");
  }

  /**
   * Set Sentry user context
   */
  setSentryUser(userId?: string, organizationId?: string): void {
    if (this.isProduction) {
      if (userId) {
        Sentry.setUser({ id: userId, organizationId });
      } else {
        Sentry.setUser(null);
      }
    }
  }

  /**
   * Capture an exception with context
   */
  captureException(error: Error, context?: LogContext): void {
    this.error(error.message, error, context);
  }

  /**
   * Start a transaction for performance monitoring
   */
  startTransaction(name: string, op: string) {
    if (this.isProduction) {
      return Sentry.startTransaction({
        name,
        op,
      });
    }
    return null;
  }
}

// Export singleton instance
export const logger = new Logger();

export default logger;
