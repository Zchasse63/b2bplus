/**
 * CSRF Token Endpoint
export const dynamic = 'force-dynamic';
 * Provides CSRF tokens for client-side requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateCSRFToken, addCSRFTokenToCookie } from '@/lib/middleware/csrf';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { handleError } from '@/lib/middleware/error-handler';

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'public');
    if (!allowed) return rateLimitResponse!;

    // Get or create CSRF token
    const token = getOrCreateCSRFToken(request);

    // Create response with token
    const response = NextResponse.json(
      {
        token,
        header: 'x-csrf-token',
      },
      { status: 200 }
    );

    // Add token to cookie
    return addCSRFTokenToCookie(response, token);
  } catch (error) {
    return handleError(error);
  }
}

