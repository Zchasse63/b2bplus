/**
 * Rate Limiting Middleware
 * Implements rate limiting for API endpoints using Upstash Redis
 * with in-memory fallback for when Redis is unavailable
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// In-memory fallback rate limiter for when Redis is unavailable
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitEntry>();

// Clean up old entries every minute
setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];

  for (const [key, entry] of memoryStore.entries()) {
    if (now > entry.resetAt) {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach(key => memoryStore.delete(key));
}, 60000);

/**
 * In-memory fallback rate limiter
 */
function fallbackRateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): { success: boolean; remaining: number; reset: number } {
  const now = Date.now();
  const entry = memoryStore.get(identifier);

  if (!entry || now > entry.resetAt) {
    // Create new entry or reset expired one
    const resetAt = now + windowMs;
    memoryStore.set(identifier, { count: 1, resetAt });
    return {
      success: true,
      remaining: limit - 1,
      reset: resetAt,
    };
  }

  if (entry.count >= limit) {
    return {
      success: false,
      remaining: 0,
      reset: entry.resetAt,
    };
  }

  entry.count++;
  return {
    success: true,
    remaining: limit - entry.count,
    reset: entry.resetAt,
  };
}

// Rate limit configurations (in milliseconds)
export const RATE_LIMITS = {
  // Public endpoints (no auth required)
  public: {
    requests: 100,
    window: 60 * 60 * 1000, // 1 hour
  },
  // Authenticated endpoints
  authenticated: {
    requests: 1000,
    window: 60 * 60 * 1000, // 1 hour
  },
  // Admin endpoints
  admin: {
    requests: 5000,
    window: 60 * 60 * 1000, // 1 hour
  },
  // Strict limits for sensitive operations
  sensitive: {
    requests: 10,
    window: 60 * 60 * 1000, // 1 hour
  },
  // AI endpoints (expensive operations)
  ai: {
    requests: 100,
    window: 24 * 60 * 60 * 1000, // 1 day
  },
};

/**
 * Create a rate limiter for a specific endpoint
 */
export function createRateLimiter(
  config: { requests: number; window: number }
) {
  // Convert milliseconds to seconds for Upstash
  const windowSeconds = Math.floor(config.window / 1000);

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.requests, `${windowSeconds} s`),
    analytics: true,
    prefix: 'ratelimit',
  });
}

/**
 * Get rate limiter for endpoint type
 */
export function getRateLimiter(type: keyof typeof RATE_LIMITS) {
  return createRateLimiter(RATE_LIMITS[type]);
}

/**
 * Get identifier for rate limiting (IP or user ID)
 */
function getIdentifier(request: NextRequest): string {
  // Try to get user ID from auth header
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    try {
      const token = authHeader.replace('Bearer ', '');
      // Use token hash as identifier
      return `user:${hashToken(token)}`;
    } catch {
      // Fall through to IP-based limiting
    }
  }

  // Fall back to IP address
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown';

  return `ip:${ip.trim()}`;
}

/**
 * Simple hash function for tokens
 */
function hashToken(token: string): string {
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    const char = token.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Rate limit middleware for API routes
 * Fails closed - rejects when uncertain about rate limit state
 */
export async function rateLimit(
  request: NextRequest,
  type: keyof typeof RATE_LIMITS = 'authenticated'
): Promise<{ allowed: boolean; response?: NextResponse }> {
  try {
    // Get identifier (IP address or user ID)
    const identifier = getIdentifier(request);

    // Get appropriate rate limiter
    const limiter = getRateLimiter(type);

    // Check rate limit
    const { success, limit, remaining, reset } = await limiter.limit(
      identifier
    );

    // Add rate limit headers to response
    const headers = {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': Math.max(0, remaining).toString(),
      'X-RateLimit-Reset': reset.toString(),
    };

    if (!success) {
      return {
        allowed: false,
        response: NextResponse.json(
          {
            error: 'Too many requests',
            message: `Rate limit exceeded. Try again in ${Math.ceil((reset - Date.now()) / 1000)} seconds.`,
            retryAfter: Math.ceil((reset - Date.now()) / 1000),
          },
          {
            status: 429,
            headers,
          }
        ),
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Redis rate limit check failed, using in-memory fallback:', error);

    // Fail-closed: Use in-memory fallback limiter
    const identifier = getIdentifier(request);
    const config = RATE_LIMITS[type];
    const result = fallbackRateLimit(identifier, config.requests, config.window);

    if (!result.success) {
      return {
        allowed: false,
        response: NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: `Too many requests. Please try again in ${Math.ceil((result.reset - Date.now()) / 1000)} seconds.`,
            retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
            note: 'Using fallback rate limiter (Redis unavailable)',
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': config.requests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': result.reset.toString(),
              'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
            },
          }
        ),
      };
    }

    // Allow the request since we're under the limit
    return { allowed: true };
  }
}

/**
 * Middleware wrapper for API routes
 */
export async function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  type: keyof typeof RATE_LIMITS = 'authenticated'
) {
  return async (request: NextRequest) => {
    const { allowed, response } = await rateLimit(request, type);

    if (!allowed) {
      return response!;
    }

    return handler(request);
  };
}

/**
 * Get current rate limit status for a request
 * Useful for monitoring and debugging
 */
export async function getRateLimitStatus(
  request: NextRequest,
  type: keyof typeof RATE_LIMITS = 'authenticated'
): Promise<{
  identifier: string;
  limit: number;
  remaining: number;
  reset: number;
  isNearLimit: boolean;
} | null> {
  try {
    const identifier = getIdentifier(request);
    const limiter = getRateLimiter(type);
    const { limit, remaining, reset } = await limiter.limit(identifier);

    return {
      identifier,
      limit,
      remaining: Math.max(0, remaining),
      reset,
      isNearLimit: remaining < limit * 0.1, // Alert if less than 10% remaining
    };
  } catch (error) {
    console.error('Error getting rate limit status:', error);
    return null;
  }
}
