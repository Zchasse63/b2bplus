/**
 * Request validation middleware
 * Validates incoming API requests against Zod schemas
 */

import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

export interface ValidationResult<T = any> {
  valid: boolean;
  success: boolean; // Alias for valid
  data?: T;
  response?: NextResponse;
}

/**
 * Validate request body against a Zod schema
 * Returns validation result with data or error response
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json();
    const validated = schema.parse(body);

    return {
      valid: true,
      success: true,
      data: validated,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });

      return {
        valid: false,
        success: false,
        response: NextResponse.json(
          {
            error: 'Validation failed',
            details: errors,
          },
          { status: 400 }
        ),
      };
    }

    // Handle JSON parse errors
    return {
      valid: false,
      success: false,
      response: NextResponse.json(
        {
          error: 'Invalid JSON in request body',
        },
        { status: 400 }
      ),
    };
  }
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQueryParams<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): ValidationResult<T> {
  try {
    const { searchParams } = new URL(request.url);
    const params: Record<string, any> = {};

    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    const validated = schema.parse(params);

    return {
      valid: true,
      success: true,
      data: validated,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });

      return {
        valid: false,
        success: false,
        response: NextResponse.json(
          {
            error: 'Invalid query parameters',
            details: errors,
          },
          { status: 400 }
        ),
      };
    }

    return {
      valid: false,
      success: false,
      response: NextResponse.json(
        {
          error: 'Query parameter validation failed',
        },
        { status: 400 }
      ),
    };
  }
}
