/**
 * Readiness Check Endpoint
export const dynamic = 'force-dynamic';
 * Checks if the application is ready to handle requests
 * Verifies database connectivity and external service availability
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/logging/logger';
import { handleError } from '@/lib/middleware/error-handler';

const logger = createLogger('readiness-check');

interface ReadinessStatus {
  ready: boolean;
  timestamp: string;
  checks: {
    database: { status: 'ok' | 'error'; message?: string };
    environment: { status: 'ok' | 'error'; message?: string };
  };
}

export async function GET(request: NextRequest) {
  const status: ReadinessStatus = {
    ready: true,
    timestamp: new Date().toISOString(),
    checks: {
      database: { status: 'ok' },
      environment: { status: 'ok' },
    },
  };

  try {
    // Check database connectivity
    try {
      const supabase = createClient();
      const { error } = await supabase.from('organizations').select('id').limit(1);

      if (error) {
        status.checks.database = {
          status: 'error',
          message: error.message,
        };
        status.ready = false;
        logger.warn('Database check failed', { error: error.message });
      }
    } catch (error) {
      status.checks.database = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
      status.ready = false;
      logger.error('Database connectivity check failed', error);
    }

    // Check environment variables
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
    ];

    const missingEnvVars = requiredEnvVars.filter(
      (envVar) => !process.env[envVar]
    );

    if (missingEnvVars.length > 0) {
      status.checks.environment = {
        status: 'error',
        message: `Missing environment variables: ${missingEnvVars.join(', ')}`,
      };
      status.ready = false;
      logger.warn('Environment check failed', { missingEnvVars });
    }

    // Return appropriate status code
    const statusCode = status.ready ? 200 : 503;

    logger.debug('Readiness check', status);

    return NextResponse.json(status, { status: statusCode });
  } catch (error) {
    logger.error('Readiness check failed', error);
    return handleError(error);
  }
}

