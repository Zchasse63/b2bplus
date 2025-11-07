import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyCustomerAccess } from '@/lib/ai/customer-context';

/**
 * AI Security Middleware
 * Phase 1, Task 2.2: AI Security Middleware
 * 
 * Provides rate limiting and authorization for AI endpoints to prevent:
 * - Abuse and excessive API usage
 * - Unauthorized access to AI features
 * - Data leakage across organizations
 */

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface ValidationResult {
  authorized: boolean;
  userId?: string;
  organizationId?: string;
  error?: string;
  rateLimitRemaining?: number;
}

// In-memory rate limit store
// TODO: Replace with Redis for production multi-instance deployments
const rateLimits = new Map<string, { count: number; resetAt: number }>();

/**
 * Rate limiting for AI endpoints
 * Prevents abuse by limiting requests per user per time window
 * 
 * @param userId - User ID to check rate limit for
 * @param config - Rate limit configuration (default: 100 requests per minute)
 * @returns true if within limit, false if exceeded
 */
export async function checkRateLimit(
  userId: string,
  config: RateLimitConfig = { maxRequests: 100, windowMs: 60000 }
): Promise<{ allowed: boolean; remaining: number }> {
  const now = Date.now();
  const userLimit = rateLimits.get(userId);
  
  // No existing limit or window expired - create new window
  if (!userLimit || now > userLimit.resetAt) {
    rateLimits.set(userId, {
      count: 1,
      resetAt: now + config.windowMs
    });
    return { allowed: true, remaining: config.maxRequests - 1 };
  }
  
  // Check if limit exceeded
  if (userLimit.count >= config.maxRequests) {
    return { allowed: false, remaining: 0 };
  }
  
  // Increment count
  userLimit.count++;
  return { allowed: true, remaining: config.maxRequests - userLimit.count };
}

/**
 * Clear rate limit for a user (useful for testing or admin overrides)
 * 
 * @param userId - User ID to clear rate limit for
 */
export function clearRateLimit(userId: string): void {
  rateLimits.delete(userId);
}

/**
 * Get current rate limit status for a user
 * 
 * @param userId - User ID to check
 * @returns Current count and reset time, or null if no limit set
 */
export function getRateLimitStatus(userId: string): { count: number; resetAt: number } | null {
  return rateLimits.get(userId) || null;
}

/**
 * Validate AI request has proper authorization
 * Checks authentication, rate limits, and organization approval
 * 
 * @param request - Next.js request object
 * @param config - Optional rate limit configuration
 * @returns Validation result with user info or error
 */
export async function validateAIRequest(
  request: NextRequest,
  config?: RateLimitConfig
): Promise<ValidationResult> {
  const supabase = await createClient();
  
  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { 
      authorized: false, 
      error: 'Not authenticated. Please log in to use AI features.' 
    };
  }
  
  // Check rate limit
  const rateLimit = await checkRateLimit(user.id, config);
  if (!rateLimit.allowed) {
    return { 
      authorized: false, 
      error: 'Rate limit exceeded. Please try again later.',
      rateLimitRemaining: 0
    };
  }
  
  // Get user's organization and verify approval
  const { data: member, error: memberError } = await supabase
    .from('organization_members')
    .select(`
      organization_id,
      organization:organizations!inner(
        id,
        approval_status
      )
    `)
    .eq('user_id', user.id)
    .single();
  
  if (memberError || !member) {
    return { 
      authorized: false, 
      error: 'Organization membership not found' 
    };
  }
  
  const org = member.organization as any;
  
  // Verify organization is approved
  if (org.approval_status !== 'approved') {
    if (org.approval_status === 'pending') {
      return { 
        authorized: false, 
        error: 'Your organization is pending approval. AI features will be available once approved.' 
      };
    }
    return { 
      authorized: false, 
      error: 'Your organization is not approved for AI features. Please contact support.' 
    };
  }
  
  return { 
    authorized: true, 
    userId: user.id,
    organizationId: member.organization_id,
    rateLimitRemaining: rateLimit.remaining
  };
}

/**
 * Validate customer-specific AI request
 * Ensures user has access to the target organization's data
 * 
 * @param request - Next.js request object
 * @param targetOrganizationId - Organization ID to verify access for
 * @param config - Optional rate limit configuration
 * @returns Validation result with user info or error
 */
export async function validateCustomerAIRequest(
  request: NextRequest,
  targetOrganizationId: string,
  config?: RateLimitConfig
): Promise<ValidationResult> {
  // First validate basic AI request
  const validation = await validateAIRequest(request, config);
  if (!validation.authorized) {
    return validation;
  }
  
  // Verify access to target organization
  const hasAccess = await verifyCustomerAccess(validation.userId!, targetOrganizationId);
  if (!hasAccess) {
    return { 
      authorized: false, 
      error: 'Access denied. You do not have permission to access this organization\'s data.' 
    };
  }
  
  return validation;
}

/**
 * Validate admin AI request
 * Ensures user is an admin or super_admin
 * 
 * @param request - Next.js request object
 * @param config - Optional rate limit configuration
 * @returns Validation result with user info or error
 */
export async function validateAdminAIRequest(
  request: NextRequest,
  config?: RateLimitConfig
): Promise<ValidationResult> {
  // First validate basic AI request
  const validation = await validateAIRequest(request, config);
  if (!validation.authorized) {
    return validation;
  }
  
  const supabase = await createClient();
  
  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', validation.userId!)
    .single();
  
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return { 
      authorized: false, 
      error: 'Admin access required for this AI feature.' 
    };
  }
  
  return validation;
}

/**
 * Rate limit configurations for different AI operations
 */
export const AI_RATE_LIMITS = {
  // Standard AI operations (100 requests per minute)
  STANDARD: { maxRequests: 100, windowMs: 60000 },
  
  // Heavy AI operations like embeddings (20 requests per minute)
  HEAVY: { maxRequests: 20, windowMs: 60000 },
  
  // Bulk operations (5 requests per minute)
  BULK: { maxRequests: 5, windowMs: 60000 },
  
  // Admin operations (200 requests per minute)
  ADMIN: { maxRequests: 200, windowMs: 60000 },
  
  // Testing (unlimited for development)
  TESTING: { maxRequests: 10000, windowMs: 60000 },
} as const;

/**
 * Get appropriate rate limit config based on operation type
 * 
 * @param operationType - Type of AI operation
 * @returns Rate limit configuration
 */
export function getRateLimitConfig(
  operationType: 'standard' | 'heavy' | 'bulk' | 'admin' | 'testing' = 'standard'
): RateLimitConfig {
  switch (operationType) {
    case 'heavy':
      return AI_RATE_LIMITS.HEAVY;
    case 'bulk':
      return AI_RATE_LIMITS.BULK;
    case 'admin':
      return AI_RATE_LIMITS.ADMIN;
    case 'testing':
      return AI_RATE_LIMITS.TESTING;
    default:
      return AI_RATE_LIMITS.STANDARD;
  }
}

