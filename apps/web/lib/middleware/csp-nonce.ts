/**
 * CSP Nonce Middleware
 * Generates cryptographic nonces for Content Security Policy
 * Each request gets a unique nonce to allow inline scripts/styles securely
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Generate a cryptographic nonce
 * Used for Content Security Policy inline script/style allowance
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('base64');
}

/**
 * Add CSP nonce to response headers
 * Middleware to inject nonce into response for use in CSP headers
 */
export function addCspNonceToResponse(
  response: NextResponse,
  nonce: string
): NextResponse {
  // Store nonce in response headers for use in layout
  response.headers.set('X-CSP-Nonce', nonce);
  return response;
}

/**
 * Get nonce from request headers
 * Used in server components to access the nonce
 */
export function getNonceFromHeaders(headers: Headers): string | null {
  return headers.get('X-CSP-Nonce');
}

/**
 * Generate CSP header value with nonce
 * Creates secure CSP policy with per-request nonce
 */
export function generateCspHeader(nonce: string): string {
  return `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' https://cdn.jsdelivr.net https://cdn.tailwindcss.com;
    style-src 'self' 'nonce-${nonce}' https://cdn.tailwindcss.com;
    img-src 'self' data: https:;
    font-src 'self' data: https:;
    connect-src 'self' https: wss:;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
    object-src 'none';
    media-src 'self' https:;
    manifest-src 'self';
  `.replace(/\s+/g, ' ').trim();
}

/**
 * Middleware to apply CSP nonce
 * Use in middleware.ts to add nonce to all responses
 */
export async function cspNonceMiddleware(request: NextRequest) {
  const nonce = generateNonce();
  const response = NextResponse.next();
  return addCspNonceToResponse(response, nonce);
}

/**
 * Hook to get nonce in client components
 * Note: Nonces must be extracted on server-side only
 * This is exported for documentation purposes
 */
export function useNonce(): string | null {
  // This should be called in a server component
  // The nonce is passed via headers during request processing
  if (typeof window !== 'undefined') {
    return null; // Nonces should not be accessed on client
  }
  return null;
}

/**
 * Helper to inject nonce into script tag
 * Returns the nonce attribute string for use in JSX
 */
export function getNonceAttribute(nonce: string | null): string {
  if (!nonce) return '';
  return `nonce="${nonce}"`;
}
