/**
 * Rate Limiting Configuration
 * Defines rate limits for different endpoints and user types
 */

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message: string; // Error message
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

/**
 * Rate limit configurations for different endpoint categories
 */
export const RATE_LIMIT_CONFIGS = {
  // Public endpoints - very restrictive
  public: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 30, // 30 requests per 15 minutes
    message: 'Too many requests from this IP, please try again later.',
  } as RateLimitConfig,

  // Authentication endpoints - very restrictive to prevent brute force
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    message: 'Too many login attempts, please try again later.',
  } as RateLimitConfig,

  // API endpoints for authenticated users - moderate
  api: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
    message: 'Too many API requests, please try again later.',
  } as RateLimitConfig,

  // Search endpoints - moderate
  search: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 30, // 30 searches per minute
    message: 'Too many search requests, please try again later.',
  } as RateLimitConfig,

  // AI endpoints - restrictive due to cost
  ai: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 100, // 100 AI calls per hour
    message: 'AI request limit exceeded, please try again later.',
  } as RateLimitConfig,

  // Payment endpoints - very restrictive
  payment: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50, // 50 payment attempts per hour
    message: 'Too many payment attempts, please try again later.',
  } as RateLimitConfig,

  // File upload endpoints - moderate
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20, // 20 uploads per hour
    message: 'Too many file uploads, please try again later.',
  } as RateLimitConfig,

  // Admin endpoints - less restrictive for admins
  admin: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 500, // 500 requests per minute
    message: 'Too many admin requests, please try again later.',
  } as RateLimitConfig,

  // Webhook endpoints - very permissive
  webhook: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 1000, // 1000 requests per minute
    message: 'Webhook rate limit exceeded.',
  } as RateLimitConfig,

  // Health check endpoints - no limit
  health: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 10000, // Very high limit
    message: 'Health check rate limit exceeded.',
  } as RateLimitConfig,
};

/**
 * Per-endpoint rate limit overrides
 */
export const ENDPOINT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Authentication
  '/api/auth/login': RATE_LIMIT_CONFIGS.auth,
  '/api/auth/register': RATE_LIMIT_CONFIGS.auth,
  '/api/auth/forgot-password': RATE_LIMIT_CONFIGS.auth,
  '/api/auth/reset-password': RATE_LIMIT_CONFIGS.auth,

  // Orders
  '/api/orders': RATE_LIMIT_CONFIGS.api,
  '/api/orders/bulk-upload': RATE_LIMIT_CONFIGS.upload,
  '/api/orders/bulk-submit': RATE_LIMIT_CONFIGS.api,

  // Pricing
  '/api/pricing/calculate': RATE_LIMIT_CONFIGS.api,
  '/api/pricing/quote': RATE_LIMIT_CONFIGS.api,

  // Invoices
  '/api/invoices': RATE_LIMIT_CONFIGS.api,
  '/api/invoices/generate': RATE_LIMIT_CONFIGS.api,
  '/api/admin/invoices/upload': RATE_LIMIT_CONFIGS.upload,
  '/api/admin/invoices/bulk-upload': RATE_LIMIT_CONFIGS.upload,

  // AI Endpoints
  '/api/ai/insights': RATE_LIMIT_CONFIGS.ai,
  '/api/ai/recommendations': RATE_LIMIT_CONFIGS.ai,
  '/api/ai/generate-email': RATE_LIMIT_CONFIGS.ai,

  // Admin
  '/api/admin/campaigns': RATE_LIMIT_CONFIGS.admin,
  '/api/admin/inventory': RATE_LIMIT_CONFIGS.admin,
  '/api/admin/approvals': RATE_LIMIT_CONFIGS.admin,
  '/api/admin/documents/upload': RATE_LIMIT_CONFIGS.upload,
  '/api/admin/upload-image': RATE_LIMIT_CONFIGS.upload,

  // Search
  '/api/search': RATE_LIMIT_CONFIGS.search,
  '/api/products/search': RATE_LIMIT_CONFIGS.search,

  // Payment
  '/api/payments': RATE_LIMIT_CONFIGS.payment,
  '/api/payments/process': RATE_LIMIT_CONFIGS.payment,

  // Health
  '/api/health': RATE_LIMIT_CONFIGS.health,
  '/api/health/ready': RATE_LIMIT_CONFIGS.health,

  // Webhooks
  '/api/webhooks/stripe': RATE_LIMIT_CONFIGS.webhook,
  '/api/webhooks/sendgrid': RATE_LIMIT_CONFIGS.webhook,
};

/**
 * Get rate limit config for endpoint
 */
export function getRateLimitConfig(endpoint: string): RateLimitConfig {
  // Check for exact match
  if (ENDPOINT_RATE_LIMITS[endpoint]) {
    return ENDPOINT_RATE_LIMITS[endpoint];
  }

  // Check for pattern match
  for (const [pattern, config] of Object.entries(ENDPOINT_RATE_LIMITS)) {
    if (endpoint.startsWith(pattern)) {
      return config;
    }
  }

  // Default to API rate limit
  return RATE_LIMIT_CONFIGS.api;
}

/**
 * Rate limit tiers for different user types
 */
export const RATE_LIMIT_TIERS = {
  // Free tier - most restrictive
  free: {
    multiplier: 0.5, // 50% of standard limits
    description: 'Free tier users',
  },

  // Standard tier - normal limits
  standard: {
    multiplier: 1.0, // 100% of standard limits
    description: 'Standard tier users',
  },

  // Premium tier - higher limits
  premium: {
    multiplier: 2.0, // 200% of standard limits
    description: 'Premium tier users',
  },

  // Enterprise tier - highest limits
  enterprise: {
    multiplier: 5.0, // 500% of standard limits
    description: 'Enterprise tier users',
  },

  // Admin - no limits
  admin: {
    multiplier: 100.0, // Very high limits
    description: 'Admin users',
  },
};

/**
 * Get adjusted rate limit based on user tier
 */
export function getAdjustedRateLimit(
  config: RateLimitConfig,
  userTier: keyof typeof RATE_LIMIT_TIERS
): RateLimitConfig {
  const tier = RATE_LIMIT_TIERS[userTier];
  return {
    ...config,
    maxRequests: Math.ceil(config.maxRequests * tier.multiplier),
  };
}

/**
 * Rate limit documentation
 */
export const RATE_LIMIT_DOCUMENTATION = {
  overview: `
Rate limiting is implemented to protect the API from abuse and ensure fair usage.
Different endpoints have different rate limits based on their resource consumption.
  `,

  tiers: `
Users are assigned to different rate limit tiers based on their subscription level:
- Free: 50% of standard limits
- Standard: 100% of standard limits (default)
- Premium: 200% of standard limits
- Enterprise: 500% of standard limits
- Admin: No rate limits
  `,

  headers: `
Rate limit information is included in response headers:
- X-RateLimit-Limit: Maximum requests allowed
- X-RateLimit-Remaining: Requests remaining in current window
- X-RateLimit-Reset: Unix timestamp when limit resets
  `,

  strategies: `
Rate limiting strategies:
1. IP-based: For unauthenticated requests
2. User-based: For authenticated requests
3. API Key-based: For service-to-service requests
4. Endpoint-specific: Different limits for different endpoints
  `,

  handling: `
When rate limit is exceeded:
1. HTTP 429 (Too Many Requests) is returned
2. Retry-After header indicates when to retry
3. Error message explains the limit
4. Client should implement exponential backoff
  `,
};

