import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { checkCSRF } from '@/lib/security/csrf'
import { checkAdminRateLimit } from '@/lib/middleware/rate-limit-admin'

export async function middleware(request: NextRequest) {
  // SECURITY: Apply rate limiting to all admin API endpoints
  if (request.nextUrl.pathname.startsWith('/api/admin/')) {
    const rateLimitCheck = await checkAdminRateLimit(request);
    if (rateLimitCheck) {
      return rateLimitCheck; // Return rate limit error response
    }
  }

  // SECURITY: Check CSRF for all state-changing API requests
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const csrfCheck = await checkCSRF(request);
    if (csrfCheck) {
      return csrfCheck; // Return CSRF error response
    }
  }

  // Continue with session management
  const response = await updateSession(request)

  // SECURITY: Add CORS headers for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    const origin = request.headers.get('origin');

    if (origin && (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development')) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
  }

  // SECURITY: Add security headers to all responses
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Add Strict-Transport-Security header in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

