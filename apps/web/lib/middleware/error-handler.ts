/**
 * Error Handler Middleware
 *
 * Phase 3: Error Handling Standardization
 * Converts thrown errors into proper API responses using the error classes.
 */

import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createLogger } from '@/lib/logging/logger';
import {
  AppError,
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  DatabaseError,
  ExternalServiceError,
  RateLimitError,
  ConflictError,
  BadRequestError,
  isAppError,
  isOperationalError,
  ErrorCode,
} from '@/lib/errors';

const logger = createLogger('error-handler');

/**
 * Error response format
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    requestId?: string;
  };
}

/**
 * Options for error handling
 */
export interface ErrorHandlerOptions {
  /** Include stack trace in development */
  includeStack?: boolean;
  /** Request ID for correlation */
  requestId?: string;
  /** Log the error */
  logError?: boolean;
  /** Report to Sentry */
  reportToSentry?: boolean;
}

/**
 * Convert an error to a NextResponse
 */
export function handleError(
  error: unknown,
  options: ErrorHandlerOptions = {}
): NextResponse<ErrorResponse> {
  const {
    requestId,
    logError = true,
    reportToSentry = true,
    includeStack = process.env.NODE_ENV === 'development',
  } = options;

  // Handle AppError and its subclasses
  if (isAppError(error)) {
    if (logError) {
      // Only log server errors at error level
      if (error.statusCode >= 500) {
        logger.error(error.message, error, { code: error.code, requestId });
      } else {
        logger.warn(error.message, { code: error.code, requestId });
      }
    }

    // Report non-operational errors to Sentry
    if (reportToSentry && !isOperationalError(error)) {
      Sentry.captureException(error, {
        tags: { errorCode: error.code },
        extra: { requestId, details: error.details },
      });
    }

    const response: ErrorResponse = {
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        requestId,
      },
    };

    // Add stack trace in development
    if (includeStack && error.stack) {
      response.error.details = {
        ...response.error.details,
        stack: error.stack.split('\n'),
      };
    }

    return NextResponse.json(response, { status: error.statusCode });
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    if (logError) {
      logger.error('Unhandled error', error, { requestId });
    }

    if (reportToSentry) {
      Sentry.captureException(error, {
        extra: { requestId },
      });
    }

    const response: ErrorResponse = {
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message:
          process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred'
            : error.message,
        requestId,
      },
    };

    if (includeStack && error.stack) {
      response.error.details = {
        stack: error.stack.split('\n'),
      };
    }

    return NextResponse.json(response, { status: 500 });
  }

  // Handle unknown error types
  if (logError) {
    logger.error('Unknown error type', { error, requestId });
  }

  if (reportToSentry) {
    Sentry.captureMessage('Unknown error type', {
      level: 'error',
      extra: { error, requestId },
    });
  }

  return NextResponse.json(
    {
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'An unexpected error occurred',
        requestId,
      },
    },
    { status: 500 }
  );
}

/**
 * Wrap an async route handler with error handling
 */
export function withErrorHandler<T>(
  handler: (req: Request, context?: T) => Promise<NextResponse>,
  options: Omit<ErrorHandlerOptions, 'requestId'> = {}
) {
  return async (req: Request, context?: T): Promise<NextResponse> => {
    const requestId = crypto.randomUUID();

    try {
      const response = await handler(req, context);

      // Add request ID to successful responses
      response.headers.set('X-Request-ID', requestId);

      return response;
    } catch (error) {
      const errorResponse = handleError(error, { ...options, requestId });
      errorResponse.headers.set('X-Request-ID', requestId);
      return errorResponse;
    }
  };
}

/**
 * Create a validation error from field errors
 */
export function createValidationError(
  errors: Record<string, string[]>
): ValidationError {
  return new ValidationError('Validation failed', errors);
}

/**
 * Assert a condition and throw an error if false
 */
export function assertCondition(
  condition: boolean,
  message: string,
  ErrorClass: new (message: string) => AppError = AppError
): asserts condition {
  if (!condition) {
    throw new ErrorClass(message);
  }
}

/**
 * Assert that a value exists (not null or undefined)
 */
export function assertExists<T>(
  value: T | null | undefined,
  resource: string,
  resourceId?: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new NotFoundError(resource, resourceId);
  }
}

/**
 * Assert that the user is authenticated
 */
export function assertAuthenticated(
  user: { id: string } | null | undefined
): asserts user is { id: string } {
  if (!user) {
    throw new AuthError('Authentication required', 'unauthorized');
  }
}

/**
 * Assert that the user has a specific role
 */
export function assertRole(
  userRole: string | undefined,
  requiredRoles: string[]
): void {
  if (!userRole || !requiredRoles.includes(userRole)) {
    throw ForbiddenError.insufficientRole(requiredRoles.join(' or '));
  }
}

/**
 * Safely execute a database operation with error handling
 */
export async function safeDbOperation<T>(
  operation: () => Promise<{ data: T | null; error: { message: string } | null }>,
  table: string,
  operationName: string
): Promise<T> {
  const { data, error } = await operation();

  if (error) {
    throw DatabaseError.queryFailed(table, operationName);
  }

  if (data === null) {
    throw new NotFoundError(table);
  }

  return data;
}

/**
 * Safely execute an external service call with error handling
 */
export async function safeExternalCall<T>(
  operation: () => Promise<T>,
  serviceName: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw new ExternalServiceError(
      serviceName,
      `${serviceName} request failed`,
      error instanceof Error ? error : undefined
    );
  }
}

// Re-export error classes for convenience
export {
  AppError,
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  DatabaseError,
  ExternalServiceError,
  RateLimitError,
  ConflictError,
  BadRequestError,
  isAppError,
  isOperationalError,
  ErrorCode,
} from '@/lib/errors';
