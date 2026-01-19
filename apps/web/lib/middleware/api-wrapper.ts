/**
 * Unified API Route Wrapper
 * Combines Sentry error tracking, rate limiting, and logging
 * for consistent API route handling across the application.
 *
 * Phase 2: Observability & Monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { rateLimit, RATE_LIMITS } from './rate-limit';
import { apiLogger } from '@/src/lib/api/logging';

export type RateLimitType = keyof typeof RATE_LIMITS;

export interface APIHandlerOptions {
  /**
   * Rate limit type for this endpoint
   * @default 'authenticated'
   */
  rateLimit?: RateLimitType;

  /**
   * Skip rate limiting for this endpoint
   * @default false
   */
  skipRateLimit?: boolean;

  /**
   * Skip logging for this endpoint
   * @default false
   */
  skipLogging?: boolean;

  /**
   * Custom tags for Sentry error tracking
   */
  sentryTags?: Record<string, string>;

  /**
   * Custom context for Sentry error tracking
   */
  sentryContext?: Record<string, unknown>;
}

export type APIHandler = (
  request: NextRequest,
  context?: { params?: Record<string, string> }
) => Promise<NextResponse>;

/**
 * Wrap an API route handler with observability features
 *
 * Features:
 * - Automatic Sentry error tracking
 * - Rate limiting (configurable)
 * - Request/response logging
 * - Correlation ID generation
 * - Performance timing
 *
 * @example
 * ```ts
 * export const GET = wrapAPIRoute(
 *   async (request) => {
 *     // Your handler logic
 *     return NextResponse.json({ success: true });
 *   },
 *   { rateLimit: 'authenticated' }
 * );
 * ```
 */
export function wrapAPIRoute(
  handler: APIHandler,
  options: APIHandlerOptions = {}
): APIHandler {
  const {
    rateLimit: rateLimitType = 'authenticated',
    skipRateLimit = false,
    skipLogging = false,
    sentryTags = {},
    sentryContext = {},
  } = options;

  return async (request: NextRequest, context?: { params?: Record<string, string> }) => {
    const correlationId = apiLogger.generateCorrelationId();
    const startTime = Date.now();
    const path = new URL(request.url).pathname;

    // Add correlation ID to Sentry scope
    Sentry.withScope((scope) => {
      scope.setTag('correlationId', correlationId);
      scope.setTag('path', path);
      scope.setTag('method', request.method);

      // Add custom tags
      Object.entries(sentryTags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });

      // Add custom context
      if (Object.keys(sentryContext).length > 0) {
        scope.setContext('custom', sentryContext);
      }
    });

    try {
      // Rate limiting check
      if (!skipRateLimit) {
        const { allowed, response: rateLimitResponse } = await rateLimit(
          request,
          rateLimitType
        );
        if (!allowed) {
          const duration = Date.now() - startTime;

          // Log rate limit hit
          if (!skipLogging) {
            const log = apiLogger.createLog(
              correlationId,
              request,
              429,
              duration,
              'Rate limit exceeded'
            );
            apiLogger.logRequest(log);
          }

          // Track in Sentry as a breadcrumb (not error)
          Sentry.addBreadcrumb({
            category: 'rate-limit',
            message: `Rate limit exceeded for ${path}`,
            level: 'warning',
            data: { rateLimitType, path },
          });

          // Add correlation ID to response
          const headers = new Headers(rateLimitResponse!.headers);
          headers.set('X-Correlation-ID', correlationId);

          return new NextResponse(rateLimitResponse!.body, {
            status: rateLimitResponse!.status,
            statusText: rateLimitResponse!.statusText,
            headers,
          });
        }
      }

      // Execute the handler
      const response = await handler(request, context);
      const duration = Date.now() - startTime;

      // Log successful request
      if (!skipLogging && apiLogger.shouldLog(path)) {
        const log = apiLogger.createLog(
          correlationId,
          request,
          response.status,
          duration
        );
        apiLogger.logRequest(log);
      }

      // Add performance breadcrumb for slow requests
      if (duration > 3000) {
        Sentry.addBreadcrumb({
          category: 'performance',
          message: `Slow request: ${path} took ${duration}ms`,
          level: 'warning',
          data: { path, duration, method: request.method },
        });
      }

      // Add correlation ID to response headers
      const headers = new Headers(response.headers);
      headers.set('X-Correlation-ID', correlationId);
      headers.set('X-Response-Time', `${duration}ms`);

      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Log the error
      if (!skipLogging) {
        const log = apiLogger.createLog(
          correlationId,
          request,
          500,
          duration,
          errorMessage
        );
        apiLogger.logRequest(log);
      }

      // Report to Sentry
      Sentry.withScope((scope) => {
        scope.setTag('correlationId', correlationId);
        scope.setTag('handler', 'api-wrapper');
        scope.setContext('request', {
          path,
          method: request.method,
          duration,
        });

        Sentry.captureException(error);
      });

      // Return error response
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
          correlationId,
        },
        {
          status: 500,
          headers: {
            'X-Correlation-ID': correlationId,
            'X-Response-Time': `${duration}ms`,
          },
        }
      );
    }
  };
}

/**
 * Create a pre-configured wrapper for specific use cases
 */
export const apiWrappers = {
  /**
   * Wrapper for public endpoints (no auth required)
   */
  public: (handler: APIHandler) =>
    wrapAPIRoute(handler, { rateLimit: 'public' }),

  /**
   * Wrapper for authenticated endpoints
   */
  authenticated: (handler: APIHandler) =>
    wrapAPIRoute(handler, { rateLimit: 'authenticated' }),

  /**
   * Wrapper for admin endpoints
   */
  admin: (handler: APIHandler) =>
    wrapAPIRoute(handler, {
      rateLimit: 'admin',
      sentryTags: { adminEndpoint: 'true' },
    }),

  /**
   * Wrapper for AI-powered endpoints (expensive operations)
   */
  ai: (handler: APIHandler) =>
    wrapAPIRoute(handler, {
      rateLimit: 'ai',
      sentryTags: { aiEndpoint: 'true' },
    }),

  /**
   * Wrapper for sensitive operations (auth, password reset, etc.)
   */
  sensitive: (handler: APIHandler) =>
    wrapAPIRoute(handler, {
      rateLimit: 'sensitive',
      sentryTags: { sensitiveEndpoint: 'true' },
    }),

  /**
   * Wrapper for health check endpoints (no rate limiting, minimal logging)
   */
  health: (handler: APIHandler) =>
    wrapAPIRoute(handler, {
      skipRateLimit: true,
      skipLogging: true,
    }),
};

/**
 * Helper to track specific events in Sentry
 */
export function trackAPIEvent(
  eventName: string,
  data?: Record<string, unknown>
): void {
  Sentry.addBreadcrumb({
    category: 'api-event',
    message: eventName,
    level: 'info',
    data,
  });
}

/**
 * Helper to set user context for Sentry
 */
export function setAPIUserContext(user: {
  id: string;
  email?: string;
  organizationId?: string;
}): void {
  Sentry.setUser({
    id: user.id,
    email: user.email,
  });

  if (user.organizationId) {
    Sentry.setTag('organizationId', user.organizationId);
  }
}

/**
 * Helper to capture a message in Sentry
 */
export function captureAPIMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  extra?: Record<string, unknown>
): void {
  Sentry.withScope((scope) => {
    if (extra) {
      scope.setContext('extra', extra);
    }
    Sentry.captureMessage(message, level);
  });
}
