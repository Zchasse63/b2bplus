/**
 * CSRF Protection Middleware
 *
 * Protects against Cross-Site Request Forgery attacks on state-changing endpoints
 * Uses origin/referer validation and double-submit cookie pattern
 *
 * SECURITY: Prevents malicious websites from making unauthorized requests
 * to your API using a user's authenticated session
 */

import { NextRequest, NextResponse } from 'next/server';
import { logSecurityEvent } from '@/lib/logger';

/**
 * Check if the request origin is trusted
 * SECURITY: Validates that requests come from your own domain
 */
function isTrustedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  // Allow requests with no origin/referer (same-origin navigation)
  if (!origin && !referer) {
    return true;
  }

  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    // Allow localhost for development
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
  ].filter(Boolean) as string[];

  // Check origin header
  if (origin) {
    const isAllowed = allowedOrigins.some(allowed =>
      origin === allowed || origin.startsWith(allowed)
    );
    if (isAllowed) return true;
  }

  // Check referer header as fallback
  if (referer) {
    const isAllowed = allowedOrigins.some(allowed =>
      referer.startsWith(allowed)
    );
    if (isAllowed) return true;
  }

  return false;
}

/**
 * Verify CSRF token for high-risk operations
 * Uses double-submit cookie pattern
 */
function verifyCSRFToken(request: NextRequest): boolean {
  // Get CSRF token from header
  const tokenFromHeader = request.headers.get('x-csrf-token');

  // Get CSRF token from cookie
  const tokenFromCookie = request.cookies.get('csrf-token')?.value;

  // Both must exist and match
  if (!tokenFromHeader || !tokenFromCookie) {
    return false;
  }

  return tokenFromHeader === tokenFromCookie;
}

/**
 * Check if endpoint is exempt from CSRF protection
 */
function isExemptPath(pathname: string): boolean {
  const exemptPaths = [
    '/api/webhooks/', // Webhooks use signature verification instead
    '/api/auth/', // Auth endpoints handle CSRF differently
  ];

  return exemptPaths.some(exempt => pathname.startsWith(exempt));
}

/**
 * CSRF Protection Middleware
 *
 * Call this at the beginning of state-changing API routes (POST, PUT, DELETE, PATCH)
 * GET and HEAD requests are exempt as they should not modify state
 *
 * @param request - The incoming Next.js request
 * @param options - Configuration options
 * @returns NextResponse with error if CSRF check fails, null if successful
 */
export async function checkCSRF(
  request: NextRequest,
  options: {
    requireToken?: boolean; // Require CSRF token validation (for high-risk operations)
    customAllowedOrigins?: string[]; // Additional allowed origins
  } = {}
): Promise<NextResponse | null> {
  const { requireToken = false, customAllowedOrigins = [] } = options;

  // Only check state-changing methods
  const method = request.method;
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return null; // Allow safe methods
  }

  // Skip CSRF check for exempt paths
  if (isExemptPath(request.nextUrl.pathname)) {
    return null;
  }

  // Check origin/referer headers
  if (!isTrustedOrigin(request)) {
    // Add custom allowed origins if provided
    if (customAllowedOrigins.length > 0) {
      const origin = request.headers.get('origin');
      const isCustomAllowed = customAllowedOrigins.some(
        allowed => origin === allowed || origin?.startsWith(allowed)
      );
      if (isCustomAllowed) {
        return null; // Allow custom origin
      }
    }

    logSecurityEvent(
      'CSRF: Blocked request from untrusted origin',
      'high',
      {
        method,
        pathname: request.nextUrl.pathname,
        origin: request.headers.get('origin'),
        referer: request.headers.get('referer'),
      }
    );

    return NextResponse.json(
      {
        error: 'Forbidden: Invalid origin',
        message: 'This request appears to be from an untrusted source',
      },
      { status: 403 }
    );
  }

  // For high-risk operations, also verify CSRF token
  if (requireToken) {
    if (!verifyCSRFToken(request)) {
      logSecurityEvent(
        'CSRF: Invalid or missing CSRF token',
        'high',
        {
          method,
          pathname: request.nextUrl.pathname,
        }
      );

      return NextResponse.json(
        {
          error: 'Forbidden: Invalid CSRF token',
          message: 'CSRF token is missing or invalid',
        },
        { status: 403 }
      );
    }
  }

  return null; // CSRF check passed
}

/**
 * Generate a new CSRF token
 * Should be called when creating a new session
 */
export function generateCSRFToken(): string {
  // Generate cryptographically secure random token
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Helper to add CSRF token to response cookies
 * Call this when user logs in or session is created
 */
export function setCSRFToken(response: NextResponse, token?: string): NextResponse {
  const csrfToken = token || generateCSRFToken();

  response.cookies.set('csrf-token', csrfToken, {
    httpOnly: false, // Must be readable by JavaScript for double-submit pattern
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'lax', // Provides some CSRF protection by default
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return response;
}

/**
 * Middleware helper for route handlers
 * Use this as a wrapper for your route handlers
 *
 * Example:
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const csrfCheck = await checkCSRF(request);
 *   if (csrfCheck) return csrfCheck;
 *
 *   // Your route logic here...
 * }
 * ```
 */
export async function withCSRFProtection(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>,
  options?: { requireToken?: boolean }
): Promise<NextResponse> {
  const csrfCheck = await checkCSRF(request, options);
  if (csrfCheck) return csrfCheck;

  return handler(request);
}
