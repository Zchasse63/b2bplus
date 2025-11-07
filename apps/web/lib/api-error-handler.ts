/**
 * API Error Handler Utilities
 *
 * Provides consistent error handling patterns for API routes
 * Use these utilities to ensure proper error logging and user-friendly messages
 */

import { NextResponse } from 'next/server';
import { logger } from './logger';
import { errorMonitor } from './error-monitoring';

export interface ErrorHandlerOptions {
  operation: string;
  category?: 'api' | 'database' | 'authentication' | 'validation' | 'payment' | 'pricing' | 'network' | 'general';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  context?: Record<string, any>;
}

/**
 * Handle API errors with consistent logging and response format
 *
 * Production: Returns generic error message
 * Development: Returns detailed error with stack trace
 *
 * @param error - The error object
 * @param options - Error handling configuration
 * @returns NextResponse with appropriate error message
 *
 * @example
 * ```typescript
 * try {
 *   // API logic
 * } catch (error) {
 *   return handleAPIError(error, {
 *     operation: 'fetch-products',
 *     category: 'database',
 *     userId: user?.id
 *   });
 * }
 * ```
 */
export function handleAPIError(
  error: unknown,
  options: ErrorHandlerOptions
): NextResponse {
  const {
    operation,
    category = 'api',
    severity = 'medium',
    userId,
    context = {}
  } = options;

  const errorObj = error instanceof Error ? error : new Error(String(error));

  // Log error
  logger.error(`[${operation}] Error:`, {
    error: errorObj.message,
    stack: errorObj.stack,
    userId,
    ...context
  });

  // Report to error monitoring
  errorMonitor.report(errorObj, {
    category,
    severity,
    userId,
    operation,
    ...context
  });

  // In production, return generic message
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'An error occurred. Please try again later.' },
      { status: 500 }
    );
  }

  // In development, return detailed error
  return NextResponse.json(
    {
      error: errorObj.message,
      stack: errorObj.stack,
      operation,
      context
    },
    { status: 500 }
  );
}

/**
 * Create a typed error handler for specific operations
 * Useful for maintaining consistency across related endpoints
 *
 * @example
 * ```typescript
 * const handleProductError = createErrorHandler('product');
 *
 * try {
 *   // Logic
 * } catch (error) {
 *   return handleProductError(error, 'fetch', user?.id);
 * }
 * ```
 */
export function createErrorHandler(category: ErrorHandlerOptions['category'] = 'api') {
  return (
    error: unknown,
    operation: string,
    userId?: string,
    context?: Record<string, any>
  ): NextResponse => {
    return handleAPIError(error, {
      operation,
      category,
      userId,
      context
    });
  };
}

/**
 * Handle database errors specifically
 * Provides better context for DB-related issues
 */
export function handleDatabaseError(
  error: unknown,
  options: Omit<ErrorHandlerOptions, 'category'>
): NextResponse {
  return handleAPIError(error, {
    ...options,
    category: 'database',
    severity: options.severity || 'high'
  });
}

/**
 * Handle authentication errors
 * Returns 401 status code
 */
export function handleAuthError(
  error: unknown,
  options: Omit<ErrorHandlerOptions, 'category'>
): NextResponse {
  const errorObj = error instanceof Error ? error : new Error(String(error));

  logger.error(`[${options.operation}] Auth Error:`, {
    error: errorObj.message,
    userId: options.userId,
    ...options.context
  });

  errorMonitor.report(errorObj, {
    category: 'authentication',
    severity: 'high',
    userId: options.userId,
    operation: options.operation,
    ...options.context
  });

  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  );
}

/**
 * Handle validation errors
 * Returns 400 status code with validation details
 */
export function handleValidationError(
  message: string,
  details?: Record<string, any>
): NextResponse {
  logger.warn('Validation error:', { message, details });

  return NextResponse.json(
    {
      error: message,
      ...(process.env.NODE_ENV !== 'production' && details ? { details } : {})
    },
    { status: 400 }
  );
}

/**
 * Wrapper for try-catch blocks in API routes
 * Automatically handles errors with consistent patterns
 *
 * @example
 * ```typescript
 * export async function GET(request: Request) {
 *   return withErrorHandling(async () => {
 *     // Your API logic here
 *     return NextResponse.json({ data: 'success' });
 *   }, {
 *     operation: 'fetch-data',
 *     category: 'api'
 *   });
 * }
 * ```
 */
export async function withErrorHandling<T>(
  handler: () => Promise<T>,
  options: ErrorHandlerOptions
): Promise<T | NextResponse> {
  try {
    return await handler();
  } catch (error) {
    return handleAPIError(error, options);
  }
}
