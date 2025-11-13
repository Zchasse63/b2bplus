/**
 * Health Check Endpoint
 * Returns basic health status of the application
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logging/logger';

const logger = createLogger('health-check');

export async function GET(request: NextRequest) {
  try {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
    };

    logger.debug('Health check', health);

    return NextResponse.json(health, { status: 200 });
  } catch (error) {
    logger.error('Health check failed', error);

    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}

