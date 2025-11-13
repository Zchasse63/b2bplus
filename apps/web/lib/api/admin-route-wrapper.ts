import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAdminRole, AdminCheckResult } from '@/lib/middleware/admin';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Higher-order function wrapper for admin API routes
 * Handles:
 * - Admin role verification
 * - Supabase client creation
 * - Error handling
 * - Request/response type safety
 *
 * Usage:
 * export const GET = withAdminAuth(async (request, supabase, user) => {
 *   // Your route logic here
 *   return NextResponse.json({ data: 'success' });
 * });
 */
export function withAdminAuth(
  handler: (
    request: NextRequest,
    supabase: SupabaseClient,
    user: AdminCheckResult['user']
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Check admin authorization
      const { user, error: authError } = await checkAdminRole();
      if (authError) return authError;

      // Create Supabase client
      const supabase = await createClient();

      // Call the handler with pre-configured dependencies
      return await handler(request, supabase, user);
    } catch (error) {
      console.error('Admin route error:', error);
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
 * Wrapper for admin routes that require super_admin role
 */
export function withSuperAdminAuth(
  handler: (
    request: NextRequest,
    supabase: SupabaseClient,
    user: AdminCheckResult['user']
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Check super admin authorization
      const { user, error: authError } = await checkAdminRole(true);
      if (authError) return authError;

      // Create Supabase client
      const supabase = await createClient();

      // Call the handler with pre-configured dependencies
      return await handler(request, supabase, user);
    } catch (error) {
      console.error('Super admin route error:', error);
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
 * Wrapper for admin routes that handle multiple HTTP methods
 */
export function withAdminAuthMultiMethod(handlers: {
  GET?: (
    request: NextRequest,
    supabase: SupabaseClient,
    user: AdminCheckResult['user']
  ) => Promise<NextResponse>;
  POST?: (
    request: NextRequest,
    supabase: SupabaseClient,
    user: AdminCheckResult['user']
  ) => Promise<NextResponse>;
  PUT?: (
    request: NextRequest,
    supabase: SupabaseClient,
    user: AdminCheckResult['user']
  ) => Promise<NextResponse>;
  DELETE?: (
    request: NextRequest,
    supabase: SupabaseClient,
    user: AdminCheckResult['user']
  ) => Promise<NextResponse>;
  PATCH?: (
    request: NextRequest,
    supabase: SupabaseClient,
    user: AdminCheckResult['user']
  ) => Promise<NextResponse>;
}) {
  const createMethodHandler = (
    handler: (
      request: NextRequest,
      supabase: SupabaseClient,
      user: AdminCheckResult['user']
    ) => Promise<NextResponse>
  ) => {
    return async (request: NextRequest): Promise<NextResponse> => {
      try {
        // Check admin authorization
        const { user, error: authError } = await checkAdminRole();
        if (authError) return authError;

        // Create Supabase client
        const supabase = await createClient();

        // Call the handler with pre-configured dependencies
        return await handler(request, supabase, user);
      } catch (error) {
        console.error('Admin route error:', error);
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

