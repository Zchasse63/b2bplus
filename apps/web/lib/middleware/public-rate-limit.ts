/**
 * Phase 2: AI Backend Logic - Public Rate Limiting
 * 
 * IP-based rate limiting for public endpoints (unauthenticated users)
 * Prevents abuse of public chatbot and other public AI features
 */

import { NextRequest } from 'next/server';

/**
 * Rate limit configuration
 */
export interface PublicRateLimitConfig {
  name: string;
  maxRequests: number;
  windowMs: number;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  error?: string;
}

/**
 * In-memory store for rate limiting
 * In production, this should be replaced with Redis or similar
 */
class RateLimitStore {
  private store: Map<string, { count: number; resetAt: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (value.resetAt < now) {
        this.store.delete(key);
      }
    }
  }

  increment(key: string, windowMs: number): { count: number; resetAt: number } {
    const now = Date.now();
    const existing = this.store.get(key);

    if (existing && existing.resetAt > now) {
      // Increment existing counter
      existing.count++;
      return existing;
    } else {
      // Create new counter
      const resetAt = now + windowMs;
      const entry = { count: 1, resetAt };
      this.store.set(key, entry);
      return entry;
    }
  }

  get(key: string): { count: number; resetAt: number } | null {
    const now = Date.now();
    const existing = this.store.get(key);

    if (existing && existing.resetAt > now) {
      return existing;
    }

    return null;
  }

  destroy() {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Global rate limit store
const rateLimitStore = new RateLimitStore();

/**
 * Get client IP address from request
 */
export function getClientIp(request: NextRequest): string {
  // Try to get IP from various headers (for proxies/load balancers)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback to a default (should not happen in production)
  return 'unknown';
}

/**
 * Check if IP is rate limited
 */
export function checkPublicRateLimit(
  request: NextRequest,
  config: PublicRateLimitConfig
): RateLimitResult {
  const ip = getClientIp(request);
  const key = `${config.name}:${ip}`;

  const entry = rateLimitStore.increment(key, config.windowMs);

  if (entry.count > config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(entry.resetAt),
      error: `Rate limit exceeded. Maximum ${config.maxRequests} requests per ${config.windowMs / 1000} seconds.`,
    };
  }

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: new Date(entry.resetAt),
  };
}

/**
 * Predefined rate limit configurations
 */
export const PUBLIC_RATE_LIMITS = {
  // Public chatbot: 10 messages per hour per IP
  PUBLIC_CHATBOT: {
    name: 'public_chatbot',
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  
  // Lead form submission: 3 submissions per hour per IP
  LEAD_SUBMISSION: {
    name: 'lead_submission',
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  
  // Contact form: 5 submissions per hour per IP
  CONTACT_FORM: {
    name: 'contact_form',
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  
  // Product search (public): 30 requests per minute per IP
  PUBLIC_SEARCH: {
    name: 'public_search',
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
  },
} as const;

/**
 * Validate public request with rate limiting
 * Returns IP address if allowed, throws error if rate limited
 */
export function validatePublicRequest(
  request: NextRequest,
  config: PublicRateLimitConfig
): { ip: string; remaining: number; resetAt: Date } {
  const result = checkPublicRateLimit(request, config);

  if (!result.allowed) {
    throw new Error(result.error || 'Rate limit exceeded');
  }

  return {
    ip: getClientIp(request),
    remaining: result.remaining,
    resetAt: result.resetAt,
  };
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toISOString(),
  };
}

/**
 * Clean up rate limit store (for testing or graceful shutdown)
 */
export function cleanupRateLimitStore() {
  rateLimitStore.destroy();
}

