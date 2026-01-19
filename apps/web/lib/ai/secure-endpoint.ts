import { NextRequest, NextResponse } from 'next/server';
import { validateAIRequest, validateAdminAIRequest, getRateLimitConfig } from '@/lib/middleware/ai-security';
import { getCustomerContext, CustomerContext } from '@/lib/ai/customer-context';
import { sanitizeAIResponse } from '@/lib/ai/sanitize';
import { logAIUsage } from '@/lib/ai/usage-tracking';

/**
 * Secure AI Endpoint Wrapper
 * Phase 1, Task 2.3: Audit Existing AI Endpoints
 * 
 * Provides a standardized wrapper for AI endpoints that:
 * - Validates authentication and rate limits
 * - Enforces customer data isolation
 * - Sanitizes AI responses
 * - Logs AI usage
 * - Handles errors consistently
 */

export interface SecureEndpointOptions {
  /** Require admin role */
  requireAdmin?: boolean;
  
  /** Rate limit type */
  rateLimitType?: 'standard' | 'heavy' | 'bulk' | 'admin';
  
  /** Operation type for logging */
  operationType: string;
  
  /** Whether to sanitize response */
  sanitizeResponse?: boolean;
  
  /** Whether to log usage */
  logUsage?: boolean;
}

export interface SecureEndpointContext {
  /** Customer context with organization data */
  customerContext: CustomerContext;
  
  /** Validated user ID */
  userId: string;
  
  /** Organization ID */
  organizationId: string;
  
  /** Request parameters (from body or query string) */
  params: Record<string, unknown>;
}

export interface SecureEndpointResult {
  /** Result data */
  data?: unknown;

  /** Number of tokens used (for billing) */
  tokensUsed?: number;

  /** Success flag */
  success?: boolean;

  /** Error message if failed */
  error?: string;
}

/**
 * Wrap an AI endpoint handler with security middleware
 * 
 * @param request - Next.js request object
 * @param handler - Async function that processes the request
 * @param options - Security options
 * @returns Next.js response
 * 
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   return secureAIEndpoint(
 *     request,
 *     async (context) => {
 *       const { customerId } = context.params;
 *       const insights = await generateInsights(customerId, context.customerContext);
 *       return { data: insights, tokensUsed: 1500 };
 *     },
 *     {
 *       requireAdmin: true,
 *       operationType: 'customer-insights',
 *       rateLimitType: 'standard',
 *     }
 *   );
 * }
 * ```
 */
export async function secureAIEndpoint(
  request: NextRequest,
  handler: (context: SecureEndpointContext) => Promise<SecureEndpointResult>,
  options: SecureEndpointOptions
): Promise<NextResponse> {
  const {
    requireAdmin = false,
    rateLimitType = 'standard',
    operationType,
    sanitizeResponse = true,
    logUsage = true,
  } = options;
  
  const startTime = Date.now();
  
  try {
    // Validate request and check rate limits
    const validation = requireAdmin
      ? await validateAdminAIRequest(request, getRateLimitConfig(rateLimitType))
      : await validateAIRequest(request, getRateLimitConfig(rateLimitType));
    
    if (!validation.authorized) {
      return NextResponse.json(
        { error: validation.error },
        { status: 403 }
      );
    }
    
    // Get customer context for data isolation
    const customerContext = await getCustomerContext(validation.userId!);
    
    // Parse request parameters
    const params = request.method === 'GET'
      ? Object.fromEntries(new URL(request.url).searchParams)
      : await request.json();
    
    // Create context for handler
    const context: SecureEndpointContext = {
      customerContext,
      userId: validation.userId!,
      organizationId: validation.organizationId!,
      params,
    };
    
    // Execute handler
    const result = await handler(context);
    
    // Log AI usage if enabled
    if (logUsage) {
      await logAIUsage({
        userId: validation.userId!,
        organizationId: validation.organizationId!,
        endpoint: new URL(request.url).pathname,
        operationType,
        tokensUsed: result.tokensUsed || 0,
        success: result.success !== false,
        errorMessage: result.error,
        metadata: {
          duration: Date.now() - startTime,
          rateLimitRemaining: validation.rateLimitRemaining,
        },
      });
    }
    
    // Sanitize response if enabled
    let responseData = result.data || result;
    if (sanitizeResponse && responseData) {
      const sanitized = sanitizeAIResponse(responseData, {
        allowedOrganizationIds: [validation.organizationId!],
        redactEmails: true,
        redactPhones: true,
        redactAddresses: true,
        redactUUIDs: true,
        logViolations: true,
      });
      responseData = sanitized.sanitized;
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      ...responseData,
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error(`AI endpoint error (${operationType}):`, error);

    // Log failed usage if enabled
    if (logUsage) {
      try {
        const validation = await validateAIRequest(request);
        if (validation.authorized) {
          await logAIUsage({
            userId: validation.userId!,
            organizationId: validation.organizationId!,
            endpoint: new URL(request.url).pathname,
            operationType,
            tokensUsed: 0,
            success: false,
            errorMessage,
            metadata: {
              duration: Date.now() - startTime,
            },
          });
        }
      } catch {
        // Ignore logging errors
      }
    }

    // Return error response
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * Simplified wrapper for GET endpoints
 * 
 * @param request - Next.js request object
 * @param handler - Async function that processes the request
 * @param options - Security options
 * @returns Next.js response
 */
export async function secureAIGet(
  request: NextRequest,
  handler: (context: SecureEndpointContext) => Promise<SecureEndpointResult>,
  options: SecureEndpointOptions
): Promise<NextResponse> {
  return secureAIEndpoint(request, handler, options);
}

/**
 * Simplified wrapper for POST endpoints
 * 
 * @param request - Next.js request object
 * @param handler - Async function that processes the request
 * @param options - Security options
 * @returns Next.js response
 */
export async function secureAIPost(
  request: NextRequest,
  handler: (context: SecureEndpointContext) => Promise<SecureEndpointResult>,
  options: SecureEndpointOptions
): Promise<NextResponse> {
  return secureAIEndpoint(request, handler, options);
}

