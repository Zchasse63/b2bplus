import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Higher-order function wrapper for authenticated API routes
 * Handles:
 * - Supabase client creation
 * - Authentication verification
 * - Error handling
 * - Request/response type safety
 *
 * Usage:
 * export const GET = withAuth(async (request, supabase, user) => {
 *   // Your route logic here
 *   return NextResponse.json({ data: 'success' });
 * });
 */
export function withAuth(
  handler: (
    request: NextRequest,
    supabase: SupabaseClient,
    userId: string
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Create Supabase client
      const supabase = await createClient();

      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json(
          {
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required'
            }
          },
          { status: 401 }
        );
      }

      // Call the handler with pre-configured dependencies
      return await handler(request, supabase, user.id);
    } catch (error) {
      console.error('Authenticated route error:', error);
      return NextResponse.json(
        {
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred',
            details: error instanceof Error ? error.message : 'Unknown error'
          }
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Wrapper for public API routes (no authentication required)
 */
export function withPublicRoute(
  handler: (
    request: NextRequest,
    supabase: SupabaseClient
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Create Supabase client
      const supabase = await createClient();

      // Call the handler with pre-configured dependencies
      return await handler(request, supabase);
    } catch (error) {
      console.error('Public route error:', error);
      return NextResponse.json(
        {
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred',
            details: error instanceof Error ? error.message : 'Unknown error'
          }
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Wrapper for routes with multiple HTTP methods
 */
export function withAuthMultiMethod(handlers: {
  GET?: (
    request: NextRequest,
    supabase: SupabaseClient,
    userId: string
  ) => Promise<NextResponse>;
  POST?: (
    request: NextRequest,
    supabase: SupabaseClient,
    userId: string
  ) => Promise<NextResponse>;
  PUT?: (
    request: NextRequest,
    supabase: SupabaseClient,
    userId: string
  ) => Promise<NextResponse>;
  DELETE?: (
    request: NextRequest,
    supabase: SupabaseClient,
    userId: string
  ) => Promise<NextResponse>;
  PATCH?: (
    request: NextRequest,
    supabase: SupabaseClient,
    userId: string
  ) => Promise<NextResponse>;
}) {
  const createMethodHandler = (
    handler: (
      request: NextRequest,
      supabase: SupabaseClient,
      userId: string
    ) => Promise<NextResponse>
  ) => {
    return async (request: NextRequest): Promise<NextResponse> => {
      try {
        // Create Supabase client
        const supabase = await createClient();

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          return NextResponse.json(
            {
              error: {
                code: 'UNAUTHORIZED',
                message: 'Authentication required'
              }
            },
            { status: 401 }
          );
        }

        // Call the handler with pre-configured dependencies
        return await handler(request, supabase, user.id);
      } catch (error) {
        console.error('Authenticated route error:', error);
        return NextResponse.json(
          {
            error: {
              code: 'INTERNAL_SERVER_ERROR',
              message: 'An unexpected error occurred',
              details: error instanceof Error ? error.message : 'Unknown error'
            }
          },
          { status: 500 }
        );
      }
    };
  };

  return {
    GET: handlers.GET ? createMethodHandler(handlers.GET) : undefined,
    POST: handlers.POST ? createMethodHandler(handlers.POST) : undefined,
    PUT: handlers.PUT ? createMethodHandler(handlers.PUT) : undefined,
    DELETE: handlers.DELETE ? createMethodHandler(handlers.DELETE) : undefined,
    PATCH: handlers.PATCH ? createMethodHandler(handlers.PATCH) : undefined
  };
}

