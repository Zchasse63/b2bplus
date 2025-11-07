import { type NextRequest } from 'next/server'
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
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

