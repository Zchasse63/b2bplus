import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { loginSchema } from '@/lib/validation/schemas';
import { apiSuccess, apiError, apiValidationError, apiRateLimitError } from '@/lib/api-response';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    // Validate input
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return apiValidationError(
        'Validation failed',
        validation.error.errors.map(e => e.message)
      );
    }

    const { email, password } = validation.data;
    const supabase = await createClient();

    // Get IP address for rate limiting
    const ipAddress = request.headers.get('x-forwarded-for') ||
                      request.headers.get('x-real-ip') ||
                      'unknown';

    // Rate limit: 5 attempts per 15 minutes per IP/email combination
    const identifier = `${ipAddress}:${email}`;
    const rateLimitResult = await checkRateLimit(supabase, {
      key: 'auth:login',
      identifier,
      maxRequests: 5,
      windowSeconds: 900, // 15 minutes
    });

    if (!rateLimitResult.allowed) {
      const resetMinutes = Math.ceil(
        (rateLimitResult.resetAt?.getTime() - Date.now()) / 60000
      );
      logger.warn('Login rate limit exceeded', {
        email,
        ipAddress,
        resetMinutes
      });
      return apiRateLimitError(
        `Too many login attempts. Please try again in ${resetMinutes} minute${resetMinutes !== 1 ? 's' : ''}.`,
        resetMinutes * 60
      );
    }

    // Attempt to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      logger.warn('Login failed', {
        email,
        error: error.message
      });
      return apiError(error.message, 401);
    }

    logger.info('User logged in successfully', {
      userId: data.user?.id,
      email
    });

    return apiSuccess({
      user: data.user,
      session: data.session,
    }, 'Login successful');

  } catch (error) {
    logger.error('Error in login', {
      email: body?.email,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return apiError('Internal server error', 500);
  }
}
