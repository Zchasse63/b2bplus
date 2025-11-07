/**
 * Admin Endpoint Rate Limiting Middleware
 *
 * Applies rate limits to all admin API endpoints to prevent abuse
 * Uses different limits for different types of operations
 *
 * SECURITY: Prevents brute force, DoS, and resource exhaustion attacks
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, RateLimitConfig } from '@/lib/rate-limit';
import { logSecurityEvent, logger } from '@/lib/logger';

/**
 * Rate limit tiers for different admin operations
 */
const RATE_LIMIT_TIERS = {
  // Read operations - more lenient
  read: {
    maxRequests: 100,
    windowSeconds: 60,
  },
  // Write operations - more restrictive
  write: {
    maxRequests: 50,
    windowSeconds: 60,
  },
  // Bulk operations - very restrictive
  bulk: {
    maxRequests: 10,
    windowSeconds: 60,
  },
  // AI/expensive operations - very restrictive
  expensive: {
    maxRequests: 20,
    windowSeconds: 60,
  },
} as const;

/**
 * Determine rate limit tier based on request method and path
 */
function getRateLimitTier(
  method: string,
  pathname: string
): keyof typeof RATE_LIMIT_TIERS {
  // AI and expensive operations
  if (
    pathname.includes('/ai-') ||
    pathname.includes('/generate') ||
    pathname.includes('/embedding') ||
    pathname.includes('/semantic') ||
    pathname.includes('/sku-mapping')
  ) {
    return 'expensive';
  }

  // Bulk operations
  if (
    pathname.includes('/import') ||
    pathname.includes('/export') ||
    pathname.includes('/bulk') ||
    pathname.includes('/batch')
  ) {
    return 'bulk';
  }

  // Write operations
  if (method !== 'GET' && method !== 'HEAD') {
    return 'write';
  }

  // Default to read
  return 'read';
}

/**
 * Check admin endpoint rate limit
 *
 * @param request - The incoming Next.js request
 * @param options - Configuration options
 * @returns NextResponse with error if rate limit exceeded, null if allowed
 */
export async function checkAdminRateLimit(
  request: NextRequest,
  options: {
    customTier?: keyof typeof RATE_LIMIT_TIERS;
    customLimits?: { maxRequests: number; windowSeconds: number };
  } = {}
): Promise<NextResponse | null> {
  try {
    const supabase = await createClient();

    // Get user ID for rate limiting
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      // If not authenticated, use IP-based rate limiting (more restrictive)
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

      const ipRateLimit = await checkRateLimit(supabase, {
        key: 'admin-endpoint-ip',
        identifier: ip,
        maxRequests: 20, // Very restrictive for unauthenticated
        windowSeconds: 60,
      });

      if (!ipRateLimit.allowed) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: 'Too many requests. Please authenticate and try again.',
            resetAt: ipRateLimit.resetAt.toISOString(),
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': ipRateLimit.limit.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': ipRateLimit.resetAt.toISOString(),
              'Retry-After': Math.ceil(
                (ipRateLimit.resetAt.getTime() - Date.now()) / 1000
              ).toString(),
            },
          }
        );
      }

      return null; // Allow unauthenticated request (will be blocked by auth check later)
    }

    // Determine rate limit tier
    let tier: keyof typeof RATE_LIMIT_TIERS;
    let limits: { maxRequests: number; windowSeconds: number };

    if (options.customLimits) {
      limits = options.customLimits;
      tier = 'read'; // Use tier for logging only
    } else if (options.customTier) {
      tier = options.customTier;
      limits = RATE_LIMIT_TIERS[tier];
    } else {
      tier = getRateLimitTier(request.method, request.nextUrl.pathname);
      limits = RATE_LIMIT_TIERS[tier];
    }

    // Check rate limit for this user and tier
    const rateLimitConfig: RateLimitConfig = {
      key: `admin-endpoint-${tier}`,
      identifier: user.id,
      maxRequests: limits.maxRequests,
      windowSeconds: limits.windowSeconds,
    };

    const rateLimitResult = await checkRateLimit(supabase, rateLimitConfig);

    if (!rateLimitResult.allowed) {
      logSecurityEvent(
        'Admin endpoint rate limit exceeded',
        'medium',
        {
          userId: user.id,
          tier,
          pathname: request.nextUrl.pathname,
          method: request.method,
        }
      );

      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Too many ${tier} requests. You can make ${limits.maxRequests} requests per ${limits.windowSeconds} seconds.`,
          tier,
          limit: rateLimitResult.limit,
          resetAt: rateLimitResult.resetAt.toISOString(),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetAt.toISOString(),
            'X-RateLimit-Tier': tier,
            'Retry-After': Math.ceil(
              (rateLimitResult.resetAt.getTime() - Date.now()) / 1000
            ).toString(),
          },
        }
      );
    }

    // Add rate limit info to response headers (for successful requests)
    // This will be added by the calling route handler if needed

    return null; // Rate limit check passed
  } catch (error) {
    logger.error('Error checking admin rate limit:', error);
    // On error, allow the request (fail open) but log for monitoring
    return null;
  }
}

/**
 * Wrapper to apply rate limiting to admin route handlers
 *
 * Example usage:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   return withAdminRateLimit(request, async (req) => {
 *     // Your route logic here
 *     return NextResponse.json({ data: 'success' });
 *   });
 * }
 * ```
 */
export async function withAdminRateLimit(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>,
  options?: {
    customTier?: keyof typeof RATE_LIMIT_TIERS;
    customLimits?: { maxRequests: number; windowSeconds: number };
  }
): Promise<NextResponse> {
  const rateLimitCheck = await checkAdminRateLimit(request, options);
  if (rateLimitCheck) return rateLimitCheck;

  return handler(request);
}

/**
 * Get recommended rate limit tier for an endpoint
 * Useful for documentation and testing
 */
export function getRecommendedTier(pathname: string, method: string): {
  tier: keyof typeof RATE_LIMIT_TIERS;
  limits: { maxRequests: number; windowSeconds: number };
} {
  const tier = getRateLimitTier(method, pathname);
  return {
    tier,
    limits: RATE_LIMIT_TIERS[tier],
  };
}
