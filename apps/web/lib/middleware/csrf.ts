/**
 * CSRF Protection Middleware
 * Implements CSRF token validation for state-changing operations
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// CSRF token configuration
const CSRF_TOKEN_LENGTH = 32;
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 60 * 60 * 24, // 24 hours
};

/**
 * Generate a new CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Get or create CSRF token for a request
 */
export function getOrCreateCSRFToken(request: NextRequest): string {
  // Try to get existing token from cookie
  const existingToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  if (existingToken) {
    return existingToken;
  }

  // Generate new token
  return generateCSRFToken();
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(
  request: NextRequest,
  token: string
): boolean {
  // Get token from cookie
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;

  if (!cookieToken || !token) {
    return false;
  }

  // Compare tokens (constant-time comparison to prevent timing attacks)
  return crypto.timingSafeEqual(
    Buffer.from(cookieToken),
    Buffer.from(token)
  );
}

/**
 * CSRF protection middleware for state-changing operations
 */
export async function csrfProtection(
  request: NextRequest
): Promise<{ valid: boolean; response?: NextResponse }> {
  // Only validate for state-changing methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    return { valid: true };
  }

  try {
    // Get CSRF token from request header
    const token = request.headers.get(CSRF_HEADER_NAME);

    if (!token) {
      return {
        valid: false,
        response: NextResponse.json(
          {
            error: 'CSRF token missing',
            message: 'CSRF token is required for this operation',
          },
          { status: 403 }
        ),
      };
    }

    // Validate token
    if (!validateCSRFToken(request, token)) {
      return {
        valid: false,
        response: NextResponse.json(
          {
            error: 'CSRF token invalid',
            message: 'CSRF token validation failed',
          },
          { status: 403 }
        ),
      };
    }

    return { valid: true };
  } catch (error) {
    console.error('CSRF validation error:', error);
    return {
      valid: false,
      response: NextResponse.json(
        {
          error: 'CSRF validation failed',
          message: 'An error occurred during CSRF validation',
        },
        { status: 500 }
      ),
    };
  }
}

/**
 * Middleware wrapper for API routes with CSRF protection
 */
export function withCSRFProtection(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const { valid, response } = await csrfProtection(request);

    if (!valid) {
      return response!;
    }

    return handler(request);
  };
}

/**
 * Add CSRF token to response cookies
 */
export function addCSRFTokenToCookie(
  response: NextResponse,
  token: string
): NextResponse {
  response.cookies.set(CSRF_COOKIE_NAME, token, CSRF_COOKIE_OPTIONS);
  return response;
}

/**
 * Get CSRF token from request for client-side use
 */
export function getCSRFTokenForClient(request: NextRequest): string {
  return getOrCreateCSRFToken(request);
}

