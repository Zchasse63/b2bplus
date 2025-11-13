/**
 * Request Context & Tracing
 * Provides request ID and trace context for distributed tracing
 */

import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export interface RequestContext {
  requestId: string;
  traceId: string;
  userId?: string;
  organizationId?: string;
  endpoint: string;
  method: string;
  startTime: number;
}

// Store request context in a map (in production, use AsyncLocalStorage)
const requestContextMap = new Map<string, RequestContext>();

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return randomUUID();
}

/**
 * Generate a trace ID
 */
export function generateTraceId(): string {
  return randomUUID();
}

/**
 * Create request context
 */
export function createRequestContext(
  request: NextRequest,
  userId?: string,
  organizationId?: string
): RequestContext {
  const requestId = generateRequestId();
  const traceId = request.headers.get('x-trace-id') || generateTraceId();

  const context: RequestContext = {
    requestId,
    traceId,
    userId,
    organizationId,
    endpoint: request.nextUrl.pathname,
    method: request.method,
    startTime: Date.now(),
  };

  requestContextMap.set(requestId, context);

  return context;
}

/**
 * Get request context by ID
 */
export function getRequestContext(requestId: string): RequestContext | undefined {
  return requestContextMap.get(requestId);
}

/**
 * Get current request context (in production, use AsyncLocalStorage)
 */
export function getCurrentRequestContext(): RequestContext | undefined {
  // In production, this should use AsyncLocalStorage
  // For now, return undefined - should be passed explicitly
  return undefined;
}

/**
 * Add trace headers to response
 */
export function addTraceHeaders(
  response: NextResponse,
  context: RequestContext
): NextResponse {
  response.headers.set('x-request-id', context.requestId);
  response.headers.set('x-trace-id', context.traceId);
  return response;
}

/**
 * Get trace headers from request
 */
export function getTraceHeaders(request: NextRequest): {
  requestId: string;
  traceId: string;
} {
  return {
    requestId: request.headers.get('x-request-id') || generateRequestId(),
    traceId: request.headers.get('x-trace-id') || generateTraceId(),
  };
}

/**
 * Middleware to add request context
 */
export async function withRequestContext(
  handler: (
    request: NextRequest,
    context: RequestContext
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const context = createRequestContext(request);

    try {
      const response = await handler(request, context);
      return addTraceHeaders(response, context);
    } catch (error) {
      // Log error with context
      console.error('Request error:', {
        requestId: context.requestId,
        traceId: context.traceId,
        endpoint: context.endpoint,
        method: context.method,
        error,
      });

      // Clean up context
      requestContextMap.delete(context.requestId);

      throw error;
    } finally {
      // Calculate request duration
      const duration = Date.now() - context.startTime;
      console.log('Request completed:', {
        requestId: context.requestId,
        traceId: context.traceId,
        endpoint: context.endpoint,
        method: context.method,
        duration: `${duration}ms`,
      });

      // Clean up context
      requestContextMap.delete(context.requestId);
    }
  };
}

