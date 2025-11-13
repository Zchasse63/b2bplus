import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * Validation middleware for API routes
 * Provides helper functions for validating request bodies and query parameters
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  errors?: ValidationError[];
}

/**
 * Validate request body against a Zod schema
 */
export async function validateBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      const errors: ValidationError[] = result.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return { valid: false, errors };
    }

    return { valid: true, data: result.data };
  } catch (error) {
    return {
      valid: false,
      errors: [{ field: 'body', message: 'Invalid JSON' }],
    };
  }
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQuery<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): ValidationResult<T> {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const result = schema.safeParse(params);

    if (!result.success) {
      const errors: ValidationError[] = result.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return { valid: false, errors };
    }

    return { valid: true, data: result.data };
  } catch (error) {
    return {
      valid: false,
      errors: [{ field: 'query', message: 'Invalid query parameters' }],
    };
  }
}

/**
 * Create a validation error response
 */
export function validationErrorResponse(errors: ValidationError[]) {
  return NextResponse.json(
    {
      error: 'Validation failed',
      details: errors,
    },
    { status: 400 }
  );
}

/**
 * Validate and parse request body, returning error response if invalid
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ valid: boolean; data?: T; response?: NextResponse }> {
  const result = await validateBody(request, schema);

  if (!result.valid) {
    return {
      valid: false,
      response: validationErrorResponse(result.errors || []),
    };
  }

  return { valid: true, data: result.data };
}

/**
 * Validate and parse query parameters, returning error response if invalid
 */
export function validateRequestQuery<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): { valid: boolean; data?: T; response?: NextResponse } {
  const result = validateQuery(request, schema);

  if (!result.valid) {
    return {
      valid: false,
      response: validationErrorResponse(result.errors || []),
    };
  }

  return { valid: true, data: result.data };
}

