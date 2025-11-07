/**
 * Error Type Definitions
 *
 * Replaces unsafe `error: any` with proper typed error handling
 */

// ============================================
// Base Error Types
// ============================================

export class AppError extends Error {
  constructor(
    message: string,
    public code: string = 'UNKNOWN_ERROR',
    public statusCode: number = 500,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }

  toJSON() {
    return {
      error: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

// ============================================
// Specific Error Types
// ============================================

export class ValidationError extends AppError {
  constructor(message: string, public fields?: Record<string, string[]>) {
    super(message, 'VALIDATION_ERROR', 400, { fields });
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(
    public limit: number,
    public windowSeconds: number,
    public resetAt: Date
  ) {
    super(
      `Rate limit exceeded: ${limit} requests per ${windowSeconds} seconds`,
      'RATE_LIMIT_EXCEEDED',
      429,
      { limit, windowSeconds, resetAt: resetAt.toISOString() }
    );
    this.name = 'RateLimitError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, public originalError?: Error) {
    super(message, 'DATABASE_ERROR', 500, { originalError: originalError?.message });
    this.name = 'DatabaseError';
  }
}

export class ExternalAPIError extends AppError {
  constructor(
    public service: string,
    message: string,
    public originalError?: Error
  ) {
    super(
      `External API error (${service}): ${message}`,
      'EXTERNAL_API_ERROR',
      502,
      { service, originalError: originalError?.message }
    );
    this.name = 'ExternalAPIError';
  }
}

export class AIServiceError extends ExternalAPIError {
  constructor(message: string, originalError?: Error) {
    super('Gemini AI', message, originalError);
    this.name = 'AIServiceError';
  }
}

export class EmailServiceError extends ExternalAPIError {
  constructor(message: string, originalError?: Error) {
    super('SendGrid', message, originalError);
    this.name = 'EmailServiceError';
  }
}

// ============================================
// Error Type Guards
// ============================================

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

export function isAuthorizationError(error: unknown): error is AuthorizationError {
  return error instanceof AuthorizationError;
}

export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}

export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError;
}

export function isDatabaseError(error: unknown): error is DatabaseError {
  return error instanceof DatabaseError;
}

export function isExternalAPIError(error: unknown): error is ExternalAPIError {
  return error instanceof ExternalAPIError;
}

// ============================================
// Error Utilities
// ============================================

/**
 * Safely extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (isAppError(error)) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }

  return 'An unknown error occurred';
}

/**
 * Safely extract error code from unknown error
 */
export function getErrorCode(error: unknown): string {
  if (isAppError(error)) {
    return error.code;
  }

  if (error && typeof error === 'object' && 'code' in error) {
    return String(error.code);
  }

  return 'UNKNOWN_ERROR';
}

/**
 * Convert unknown error to AppError
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message, 'INTERNAL_ERROR', 500);
  }

  return new AppError(getErrorMessage(error), 'UNKNOWN_ERROR', 500);
}

/**
 * Handle error and return appropriate HTTP response
 */
export function handleErrorResponse(error: unknown): {
  statusCode: number;
  body: { error: string; message: string; details?: unknown };
} {
  if (isAppError(error)) {
    return {
      statusCode: error.statusCode,
      body: error.toJSON(),
    };
  }

  const appError = toAppError(error);
  return {
    statusCode: appError.statusCode,
    body: appError.toJSON(),
  };
}

/**
 * Type-safe error handler for async functions
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
  errorHandler?: (error: unknown) => T | Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (errorHandler) {
      return await errorHandler(error);
    }
    throw toAppError(error);
  }
}

/**
 * Assert that a condition is true, throw error if false
 */
export function assert(
  condition: boolean,
  message: string,
  ErrorClass: typeof AppError = AppError
): asserts condition {
  if (!condition) {
    throw new ErrorClass(message);
  }
}

/**
 * Assert that a value is not null or undefined
 */
export function assertExists<T>(
  value: T | null | undefined,
  message: string = 'Value does not exist'
): asserts value is T {
  if (value === null || value === undefined) {
    throw new NotFoundError(message);
  }
}
