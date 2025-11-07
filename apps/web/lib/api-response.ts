/**
 * Standardized API Response Utilities
 *
 * Provides consistent response format across all API routes
 *
 * Usage:
 * import { apiSuccess, apiError } from '@/lib/api-response';
 *
 * return apiSuccess({ user: userData }, 'User created successfully');
 * return apiError('User not found', 404);
 */

import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * Standard success response
 */
export function apiSuccess<T>(data: T, message?: string, statusCode: number = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
      message: message ?? 'Operation successful'
    },
    { status: statusCode }
  );
}

/**
 * Standard error response
 */
export function apiError(
  message: string,
  statusCode: number = 500,
  details?: any
) {
  // Log the error for debugging
  logger.error('API Error Response', {
    message,
    statusCode,
    details,
    timestamp: new Date().toISOString()
  });

  return NextResponse.json(
    {
      success: false,
      error: message,
      details
    },
    { status: statusCode }
  );
}

/**
 * Validation error response (400)
 */
export function apiValidationError(
  message: string = 'Validation failed',
  errors: Record<string, string[]> | string[]
) {
  return apiError(message, 400, { validationErrors: errors });
}

/**
 * Unauthorized error response (401)
 */
export function apiUnauthorized(message: string = 'Unauthorized') {
  return apiError(message, 401);
}

/**
 * Forbidden error response (403)
 */
export function apiForbidden(message: string = 'Forbidden') {
  return apiError(message, 403);
}

/**
 * Not found error response (404)
 */
export function apiNotFound(message: string = 'Resource not found') {
  return apiError(message, 404);
}

/**
 * Internal server error response (500)
 */
export function apiServerError(
  message: string = 'Internal server error',
  error?: Error
) {
  const details = error ? {
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  } : undefined;

  return apiError(message, 500, details);
}

/**
 * Rate limit error response (429)
 */
export function apiRateLimitError(
  message: string = 'Too many requests',
  retryAfter?: number
) {
  const response = apiError(message, 429);

  if (retryAfter) {
    response.headers.set('Retry-After', retryAfter.toString());
  }

  return response;
}
