/**
 * Error Monitoring System
 *
 * Centralized error tracking and reporting for production monitoring
 * Integrates with external services (Sentry, LogRocket, etc.)
 */

import { logger } from './logger';

/**
 * Structured error report
 */
export interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  context: Record<string, any>;
  timestamp: string;
  userId?: string;
  url?: string;
  userAgent?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  environment: string;
}

/**
 * Error statistics
 */
export interface ErrorStats {
  total: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  recentErrors: ErrorReport[];
}

/**
 * Error Monitor class for tracking and reporting application errors
 */
class ErrorMonitor {
  private errors: ErrorReport[] = [];
  private maxErrors = 1000;
  private errorIdCounter = 0;

  /**
   * Report an error to the monitoring system
   * @param error - The error object
   * @param context - Additional context about the error
   */
  report(
    error: Error | unknown,
    context: {
      userId?: string;
      url?: string;
      userAgent?: string;
      severity?: 'low' | 'medium' | 'high' | 'critical';
      category?: string;
      [key: string]: any;
    } = {}
  ): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    const severity = context.severity || this.determineSeverity(errorObj);
    const category = context.category || this.categorizeError(errorObj);

    const report: ErrorReport = {
      id: this.generateErrorId(),
      message: errorObj.message,
      stack: errorObj.stack,
      context: {
        ...context,
        // Remove sensitive fields from context
        password: undefined,
        token: undefined,
        apiKey: undefined,
        secret: undefined,
      },
      timestamp: new Date().toISOString(),
      userId: context.userId,
      url: context.url,
      userAgent: context.userAgent,
      severity,
      category,
      environment: process.env.NODE_ENV || 'development',
    };

    // Add to in-memory storage
    this.errors.push(report);

    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Log based on severity
    if (severity === 'critical' || severity === 'high') {
      logger.error('[ErrorMonitor]', report);
    } else if (severity === 'medium') {
      logger.warn('[ErrorMonitor]', report);
    } else {
      logger.info('[ErrorMonitor]', report);
    }

    // Send to external monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalService(report);
    }
  }

  /**
   * Get recent errors
   * @param limit - Maximum number of errors to return
   * @returns Array of recent error reports
   */
  getRecentErrors(limit: number = 100): ErrorReport[] {
    return this.errors.slice(-limit).reverse();
  }

  /**
   * Get errors filtered by criteria
   */
  getErrors(filters: {
    category?: string;
    severity?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }): ErrorReport[] {
    let filtered = [...this.errors];

    if (filters.category) {
      filtered = filtered.filter(e => e.category === filters.category);
    }

    if (filters.severity) {
      filtered = filtered.filter(e => e.severity === filters.severity);
    }

    if (filters.userId) {
      filtered = filtered.filter(e => e.userId === filters.userId);
    }

    if (filters.startDate) {
      filtered = filtered.filter(e => new Date(e.timestamp) >= filters.startDate!);
    }

    if (filters.endDate) {
      filtered = filtered.filter(e => new Date(e.timestamp) <= filters.endDate!);
    }

    return filtered.reverse();
  }

  /**
   * Get error statistics
   */
  getStats(): ErrorStats {
    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    this.errors.forEach(error => {
      byCategory[error.category] = (byCategory[error.category] || 0) + 1;
      bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1;
    });

    return {
      total: this.errors.length,
      byCategory,
      bySeverity,
      recentErrors: this.getRecentErrors(10),
    };
  }

  /**
   * Clear all errors from memory
   */
  clearErrors(): void {
    this.errors = [];
    logger.info('[ErrorMonitor] Error history cleared');
  }

  /**
   * Clear old errors (older than specified days)
   */
  clearOldErrors(daysToKeep: number = 7): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const beforeCount = this.errors.length;
    this.errors = this.errors.filter(
      error => new Date(error.timestamp) >= cutoffDate
    );
    const afterCount = this.errors.length;

    logger.info(`[ErrorMonitor] Cleared ${beforeCount - afterCount} old errors`);
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    this.errorIdCounter++;
    return `err_${Date.now()}_${this.errorIdCounter}`;
  }

  /**
   * Determine error severity based on error message and type
   */
  private determineSeverity(error: Error): 'low' | 'medium' | 'high' | 'critical' {
    const message = error.message.toLowerCase();

    // Critical errors
    if (
      message.includes('database') ||
      message.includes('connection') ||
      message.includes('authentication') ||
      message.includes('payment')
    ) {
      return 'critical';
    }

    // High severity errors
    if (
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('not found') ||
      message.includes('timeout')
    ) {
      return 'high';
    }

    // Medium severity errors
    if (
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('missing')
    ) {
      return 'medium';
    }

    // Default to low
    return 'low';
  }

  /**
   * Categorize error based on context
   */
  private categorizeError(error: Error): string {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    if (message.includes('database') || stack.includes('supabase')) {
      return 'database';
    }

    if (message.includes('auth') || message.includes('unauthorized')) {
      return 'authentication';
    }

    if (message.includes('network') || message.includes('fetch')) {
      return 'network';
    }

    if (message.includes('validation') || message.includes('invalid')) {
      return 'validation';
    }

    if (message.includes('payment') || message.includes('pricing')) {
      return 'payment';
    }

    if (stack.includes('/api/')) {
      return 'api';
    }

    return 'general';
  }

  /**
   * Send error to external monitoring service
   * TODO: Integrate with Sentry, LogRocket, or other service
   */
  private sendToExternalService(report: ErrorReport): void {
    // Example: Send to Sentry
    // if (typeof Sentry !== 'undefined') {
    //   Sentry.captureException(new Error(report.message), {
    //     level: report.severity,
    //     extra: report.context,
    //     tags: {
    //       category: report.category,
    //       environment: report.environment,
    //     },
    //   });
    // }

    // Example: Send to LogRocket
    // if (typeof LogRocket !== 'undefined') {
    //   LogRocket.captureException(new Error(report.message), {
    //     tags: {
    //       severity: report.severity,
    //       category: report.category,
    //     },
    //     extra: report.context,
    //   });
    // }

    // For now, just log to console in production
    console.error('[ErrorMonitor] Production Error:', {
      id: report.id,
      message: report.message,
      category: report.category,
      severity: report.severity,
      timestamp: report.timestamp,
    });
  }
}

// Export singleton instance
export const errorMonitor = new ErrorMonitor();

/**
 * Helper function to safely handle API errors
 * Returns appropriate error response based on environment
 */
export function handleAPIError(
  error: unknown,
  options: {
    operation: string;
    userId?: string;
    context?: Record<string, any>;
  }
): { message: string; details?: any } {
  const errorObj = error instanceof Error ? error : new Error(String(error));

  // Report to monitoring
  errorMonitor.report(errorObj, {
    category: 'api',
    userId: options.userId,
    ...options.context,
  });

  // In production, return generic message
  if (process.env.NODE_ENV === 'production') {
    return {
      message: 'An error occurred. Please try again later.',
    };
  }

  // In development, return detailed error
  return {
    message: errorObj.message,
    details: {
      stack: errorObj.stack,
      operation: options.operation,
      ...options.context,
    },
  };
}

/**
 * Middleware helper for consistent error handling in API routes
 */
export function createErrorHandler(operation: string) {
  return (error: unknown, userId?: string, context?: Record<string, any>) => {
    return handleAPIError(error, { operation, userId, context });
  };
}
