import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const response = await updateSession(request)
  const pathname = request.nextUrl.pathname

  // Static assets - cache for 1 year (immutable)
  if (pathname.match(/\.(js|css|woff|woff2|ttf|eot)$/)) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  }

  // Images - cache for 30 days
  if (pathname.match(/\.(png|jpg|jpeg|gif|webp|ico)$/)) {
    response.headers.set('Cache-Control', 'public, max-age=2592000')
  }

  // API routes - cache for 5 minutes (except auth)
  if (pathname.startsWith('/api/')) {
    if (pathname.includes('/auth/') || pathname.includes('/login') || pathname.includes('/logout')) {
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    } else {
      response.headers.set('Cache-Control', 'public, max-age=300, must-revalidate')
    }
  }

  // HTML pages - cache for 5 minutes
  if (pathname === '/' || pathname.endsWith('.html') || (!pathname.includes('.') && !pathname.startsWith('/api'))) {
    response.headers.set('Cache-Control', 'public, max-age=300, must-revalidate')
  }

  // Add security headers
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net https://cdn.tailwindcss.com;
    style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://fonts.googleapis.com;
    img-src 'self' blob: data: https://*.supabase.co https://*.supabase.in https://images.unsplash.com;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co wss://*.supabase.in;
    frame-ancestors 'none';
  `

  response.headers.set('Content-Security-Policy', cspHeader.replace(/\s{2,}/g, ' ').trim())
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

