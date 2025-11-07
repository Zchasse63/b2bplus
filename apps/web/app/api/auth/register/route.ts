import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { registerSchema } from '@/lib/validation/schemas';
import { apiSuccess, apiError, apiValidationError, apiRateLimitError } from '@/lib/api-response';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    // Validate input
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return apiValidationError(
        'Validation failed',
        validation.error.errors.map(e => e.message)
      );
    }

    const { email, password, fullName } = validation.data;
    const supabase = await createClient();

    // Get IP address for rate limiting
    const ipAddress = request.headers.get('x-forwarded-for') ||
                      request.headers.get('x-real-ip') ||
                      'unknown';

    // Rate limit: 3 attempts per hour per IP
    const rateLimitResult = await checkRateLimit(supabase, {
      key: 'auth:register',
      identifier: ipAddress,
      maxRequests: 3,
      windowSeconds: 3600, // 1 hour
    });

    if (!rateLimitResult.allowed) {
      const resetMinutes = Math.ceil(
        (rateLimitResult.resetAt?.getTime() - Date.now()) / 60000
      );
      logger.warn('Registration rate limit exceeded', {
        email,
        ipAddress,
        resetMinutes
      });
      return apiRateLimitError(
        `Too many registration attempts. Please try again in ${resetMinutes} minute${resetMinutes !== 1 ? 's' : ''}.`,
        resetMinutes * 60
      );
    }

    // Attempt to sign up
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      logger.warn('Registration failed', {
        email,
        error: error.message
      });
      return apiError(error.message, 400);
    }

    logger.info('User registered successfully', {
      userId: data.user?.id,
      email
    });

    return apiSuccess({
      user: data.user,
      session: data.session,
    }, 'Registration successful');

  } catch (error) {
    logger.error('Error in registration', {
      email: body?.email,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return apiError('Internal server error', 500);
  }
}
