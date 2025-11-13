/**
 * CORS Middleware
 * Implements strict CORS policy for API endpoints
 */

import { NextRequest, NextResponse } from 'next/server';

// Allowed origins - explicitly list all allowed domains
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  // Add production domains here
  // 'https://app.b2bplus.com',
  // 'https://admin.b2bplus.com',
];

// Allowed methods for CORS
const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

// Allowed headers
const ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-CSRF-Token',
  'X-Requested-With',
  'Accept',
  'Accept-Language',
];

// Exposed headers
const EXPOSED_HEADERS = [
  'X-RateLimit-Limit',
  'X-RateLimit-Remaining',
  'X-RateLimit-Reset',
  'Content-Length',
];

/**
 * Check if origin is allowed
 */
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) {
    return false;
  }

  return ALLOWED_ORIGINS.some((allowedOrigin) => {
    // Exact match
    if (origin === allowedOrigin) {
      return true;
    }

    // For localhost, allow any port
    if (allowedOrigin.includes('localhost')) {
      return origin.startsWith('http://localhost:');
    }

    return false;
  });
}

/**
 * CORS middleware for API routes
 */
export async function corsMiddleware(
  request: NextRequest
): Promise<{ allowed: boolean; response?: NextResponse }> {
  const origin = request.headers.get('origin');

  // Check if origin is allowed
  if (!isOriginAllowed(origin)) {
    return {
      allowed: false,
      response: NextResponse.json(
        {
          error: 'CORS policy violation',
          message: `Origin ${origin} is not allowed`,
        },
        { status: 403 }
      ),
    };
  }

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return {
      allowed: true,
      response: new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': origin || '',
          'Access-Control-Allow-Methods': ALLOWED_METHODS.join(', '),
          'Access-Control-Allow-Headers': ALLOWED_HEADERS.join(', '),
          'Access-Control-Expose-Headers': EXPOSED_HEADERS.join(', '),
          'Access-Control-Max-Age': '86400', // 24 hours
          'Access-Control-Allow-Credentials': 'true',
        },
      }),
    };
  }

  return { allowed: true };
}

/**
 * Add CORS headers to response
 */
export function addCORSHeaders(
  response: NextResponse,
  origin: string | null
): NextResponse {
  if (isOriginAllowed(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin || '');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set(
      'Access-Control-Expose-Headers',
      EXPOSED_HEADERS.join(', ')
    );
  }

  return response;
}

/**
 * Middleware wrapper for API routes with CORS
 */
export async function withCORS(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const origin = request.headers.get('origin');

    // Check CORS policy
    const { allowed, response: corsResponse } = await corsMiddleware(request);

    if (!allowed) {
      return corsResponse!;
    }

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return corsResponse!;
    }

    // Call handler
    let response = await handler(request);

    // Add CORS headers to response
    response = addCORSHeaders(response, origin);

    return response;
  };
}

