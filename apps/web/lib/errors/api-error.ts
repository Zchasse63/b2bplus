/**
 * Standardized API Error Response
 * Provides consistent error handling across all API routes
 */

import { NextResponse } from 'next/server';

export enum ErrorCode {
  // Client errors (4xx)
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Server errors (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
}

export interface ApiErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, any>;
    requestId?: string;
  };
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  requestId?: string;
}

/**
 * Map error codes to HTTP status codes
 */
function getStatusCode(code: ErrorCode): number {
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
 * Create a standardized error response
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  details?: Record<string, any>,
  requestId?: string
): NextResponse<ApiErrorResponse> {
  const statusCode = getStatusCode(code);

  return NextResponse.json(
    {
      error: {
        code,
        message,
        details,
        requestId,
      },
    },
    { status: statusCode }
  );
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  requestId?: string
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      requestId,
    },
    { status: 200 }
  );
}

/**
 * Handle validation errors
 */
export function createValidationErrorResponse(
  errors: Record<string, string[]>,
  requestId?: string
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    ErrorCode.VALIDATION_ERROR,
    'Validation failed',
    { errors },
    requestId
  );
}

/**
 * Handle authentication errors
 */
export function createUnauthorizedResponse(
  message: string = 'Unauthorized',
  requestId?: string
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    ErrorCode.UNAUTHORIZED,
    message,
    undefined,
    requestId
  );
}

/**
 * Handle authorization errors
 */
export function createForbiddenResponse(
  message: string = 'Forbidden',
  requestId?: string
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    ErrorCode.FORBIDDEN,
    message,
    undefined,
    requestId
  );
}

/**
 * Handle not found errors
 */
export function createNotFoundResponse(
  resource: string,
  requestId?: string
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    ErrorCode.NOT_FOUND,
    `${resource} not found`,
    undefined,
    requestId
  );
}

/**
 * Handle internal server errors
 */
export function createInternalErrorResponse(
  message: string = 'Internal server error',
  requestId?: string
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    ErrorCode.INTERNAL_ERROR,
    message,
    undefined,
    requestId
  );
}

/**
 * Handle database errors
 */
export function createDatabaseErrorResponse(
  requestId?: string
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    ErrorCode.DATABASE_ERROR,
    'Database operation failed',
    undefined,
    requestId
  );
}

/**
 * Handle external service errors
 */
export function createExternalServiceErrorResponse(
  service: string,
  requestId?: string
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    ErrorCode.EXTERNAL_SERVICE_ERROR,
    `${service} service error`,
    undefined,
    requestId
  );
}

