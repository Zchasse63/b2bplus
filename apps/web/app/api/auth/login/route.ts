import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { loginSchema } from '@/lib/validation/schemas';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
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
        (rateLimitResult.resetAt.getTime() - Date.now()) / 60000
      );
      return NextResponse.json(
        {
          error: `Too many login attempts. Please try again in ${resetMinutes} minute${resetMinutes !== 1 ? 's' : ''}.`,
          resetAt: rateLimitResult.resetAt.toISOString()
        },
        { status: 429 }
      );
    }

    // Attempt to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: data.user,
      session: data.session,
    });

  } catch (error) {
    console.error('Error in login:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
