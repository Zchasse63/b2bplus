import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRole } from '@/lib/middleware/admin';
import { errorMonitor, handleAPIError } from '@/lib/error-monitoring';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/errors
 * Retrieve error logs and statistics
 * Requires admin authentication
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin authorization
    const authCheck = await checkAdminRole();
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';
    const limit = parseInt(searchParams.get('limit') || '100');

    switch (action) {
      case 'stats':
        // Get error statistics
        const stats = errorMonitor.getStats();
        return NextResponse.json({
          success: true,
          stats,
        });

      case 'list':
        // Get filtered errors
        const category = searchParams.get('category') || undefined;
        const severity = searchParams.get('severity') || undefined;
        const userId = searchParams.get('userId') || undefined;

        const errors = errorMonitor.getErrors({
          category,
          severity,
          userId,
        });

        return NextResponse.json({
          success: true,
          errors: errors.slice(0, limit),
          total: errors.length,
        });

      case 'recent':
        // Get recent errors
        const recentErrors = errorMonitor.getRecentErrors(limit);
        return NextResponse.json({
          success: true,
          errors: recentErrors,
          total: recentErrors.length,
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('Error fetching error logs:', error);
    const errorResponse = handleAPIError(error, {
      operation: 'fetch-error-logs',
      userId: authCheck?.user?.id,
    });

    return NextResponse.json(
      { error: errorResponse.message, details: errorResponse.details },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/errors
 * Clear error logs
 * Requires admin authentication
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin authorization
    const authCheck = await checkAdminRole();
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'clear-all';

    switch (action) {
      case 'clear-all':
        errorMonitor.clearErrors();
        return NextResponse.json({
          success: true,
          message: 'All error logs cleared',
        });

      case 'clear-old':
        const days = parseInt(searchParams.get('days') || '7');
        errorMonitor.clearOldErrors(days);
        return NextResponse.json({
          success: true,
          message: `Errors older than ${days} days cleared`,
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('Error clearing error logs:', error);
    const errorResponse = handleAPIError(error, {
      operation: 'clear-error-logs',
      userId: authCheck?.user?.id,
    });

    return NextResponse.json(
      { error: errorResponse.message, details: errorResponse.details },
      { status: 500 }
    );
  }
}

// Re-declare authCheck variable to avoid TS error
let authCheck: { authorized: boolean; error?: string; status?: number; user?: { id: string } };
