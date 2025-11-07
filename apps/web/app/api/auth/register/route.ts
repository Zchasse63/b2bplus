import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { registerSchema } from '@/lib/validation/schemas';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
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
        (rateLimitResult.resetAt.getTime() - Date.now()) / 60000
      );
      return NextResponse.json(
        {
          error: `Too many registration attempts. Please try again in ${resetMinutes} minute${resetMinutes !== 1 ? 's' : ''}.`,
          resetAt: rateLimitResult.resetAt.toISOString()
        },
        { status: 429 }
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
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      user: data.user,
      session: data.session,
    });

  } catch (error) {
    console.error('Error in registration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
