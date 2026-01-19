/**
 * Custom Error Classes
 *
 * Phase 3: Error Handling Standardization
 * Provides throwable error classes that integrate with api-error.ts
 */

import { ErrorCode } from './api-error';

/**
 * Base application error class
 * All custom errors should extend this class
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = AppError.getStatusCode(code);
    this.details = details;
    this.isOperational = true; // Operational errors are expected errors

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  private static getStatusCode(code: ErrorCode): number {
    const statusMap: Record<ErrorCode, number> = {
      [ErrorCode.BAD_REQUEST]: 400,
      [ErrorCode.UNAUTHORIZED]: 401,
      [ErrorCode.FORBIDDEN]: 403,
      [ErrorCode.NOT_FOUND]: 404,
      [ErrorCode.CONFLICT]: 409,
      [ErrorCode.VALIDATION_ERROR]: 422,
      [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
      [ErrorCode.INTERNAL_ERROR]: 500,
      [ErrorCode.SERVICE_UNAVAILABLE]: 503,
      [ErrorCode.DATABASE_ERROR]: 500,
      [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
    };
    return statusMap[code] || 500;
  }

  /**
   * Convert to JSON for API responses
   */
  toJSON(): {
    error: {
      code: ErrorCode;
      message: string;
      details?: Record<string, unknown>;
    };
  } {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}

/**
 * Validation error for invalid input data
 */
export class ValidationError extends AppError {
  public readonly errors: Record<string, string[]>;

  constructor(
    message: string = 'Validation failed',
    errors: Record<string, string[]> = {}
  ) {
    super(message, ErrorCode.VALIDATION_ERROR, { errors });
    this.name = 'ValidationError';
    this.errors = errors;
  }

  /**
   * Create from Zod error
   */
  static fromZodError(zodError: { errors: Array<{ path: (string | number)[]; message: string }> }): ValidationError {
    const errors: Record<string, string[]> = {};

    zodError.errors.forEach((err) => {
      const path = err.path.join('.');
      if (!errors[path]) {
        errors[path] = [];
      }
      errors[path].push(err.message);
    });

    return new ValidationError('Validation failed', errors);
  }
}

/**
 * Authentication error for invalid or missing credentials
 */
export class AuthError extends AppError {
  public readonly authType: 'session_expired' | 'invalid_credentials' | 'token_invalid' | 'unauthorized';

  constructor(
    message: string = 'Authentication required',
    authType: 'session_expired' | 'invalid_credentials' | 'token_invalid' | 'unauthorized' = 'unauthorized'
  ) {
    super(message, ErrorCode.UNAUTHORIZED);
    this.name = 'AuthError';
    this.authType = authType;
  }

  static sessionExpired(): AuthError {
    return new AuthError('Your session has expired. Please log in again.', 'session_expired');
  }

  static invalidCredentials(): AuthError {
    return new AuthError('Invalid email or password.', 'invalid_credentials');
  }

  static tokenInvalid(): AuthError {
    return new AuthError('Invalid or expired token.', 'token_invalid');
  }
}

/**
 * Authorization error for insufficient permissions
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'You do not have permission to perform this action') {
    super(message, ErrorCode.FORBIDDEN);
    this.name = 'ForbiddenError';
  }

  static insufficientRole(requiredRole: string): ForbiddenError {
    return new ForbiddenError(`This action requires ${requiredRole} role.`);
  }
}

/**
 * Not found error for missing resources
 */
export class NotFoundError extends AppError {
  public readonly resource: string;
  public readonly resourceId?: string;

  constructor(resource: string, resourceId?: string) {
    const message = resourceId
      ? `${resource} with ID '${resourceId}' not found`
      : `${resource} not found`;
    super(message, ErrorCode.NOT_FOUND);
    this.name = 'NotFoundError';
    this.resource = resource;
    this.resourceId = resourceId;
  }
}

/**
 * Database error for database operation failures
 */
export class DatabaseError extends AppError {
  public readonly operation: string;
  public readonly table?: string;

  constructor(
    message: string = 'Database operation failed',
    operation: string = 'unknown',
    table?: string
  ) {
    super(message, ErrorCode.DATABASE_ERROR, { operation, table });
    this.name = 'DatabaseError';
    this.operation = operation;
    this.table = table;
  }

  static queryFailed(table: string, operation: string): DatabaseError {
    return new DatabaseError(
      `Failed to ${operation} from ${table}`,
      operation,
      table
    );
  }

  static connectionFailed(): DatabaseError {
    return new DatabaseError('Failed to connect to database', 'connect');
  }
}

/**
 * External service error for third-party API failures
 */
export class ExternalServiceError extends AppError {
  public readonly service: string;
  public readonly originalError?: Error;

  constructor(
    service: string,
    message?: string,
    originalError?: Error
  ) {
    super(
      message || `${service} service is unavailable`,
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      { service, originalMessage: originalError?.message }
    );
    this.name = 'ExternalServiceError';
    this.service = service;
    this.originalError = originalError;
  }

  static aiServiceUnavailable(provider: string, originalError?: Error): ExternalServiceError {
    return new ExternalServiceError(
      provider,
      `AI provider ${provider} is currently unavailable`,
      originalError
    );
  }

  static paymentServiceError(originalError?: Error): ExternalServiceError {
    return new ExternalServiceError(
      'Payment',
      'Payment processing failed. Please try again.',
      originalError
    );
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends AppError {
  public readonly retryAfter?: number;

  constructor(message: string = 'Too many requests', retryAfter?: number) {
    super(message, ErrorCode.RATE_LIMIT_EXCEEDED, { retryAfter });
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Conflict error for resource conflicts
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, ErrorCode.CONFLICT);
    this.name = 'ConflictError';
  }

  static alreadyExists(resource: string): ConflictError {
    return new ConflictError(`${resource} already exists`);
  }
}

/**
 * Bad request error for malformed requests
 */
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request') {
    super(message, ErrorCode.BAD_REQUEST);
    this.name = 'BadRequestError';
  }
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Type guard to check if an error is operational (expected)
 */
export function isOperationalError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isOperational;
  }
  return false;
}

// Re-export ErrorCode for convenience
export { ErrorCode } from './api-error';
