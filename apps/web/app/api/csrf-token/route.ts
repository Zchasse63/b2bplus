/**
 * CSRF Token Endpoint
 * Provides CSRF tokens for client-side requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateCSRFToken, addCSRFTokenToCookie } from '@/lib/middleware/csrf';

export async function GET(request: NextRequest) {
  try {
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
    console.error('Error generating CSRF token:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate CSRF token',
      },
      { status: 500 }
    );
  }
}

