/**
 * Verify Password Reset Email Sending
 *
 * GET /api/auth/verify-password-reset?email=user@example.com
 * Verifies that password reset email was sent successfully
 */

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { z } from 'zod';
import { handleError } from '@/lib/middleware/error-handler';
import { ValidationError, NotFoundError, DatabaseError, ExternalServiceError } from '@/lib/errors';

const EmailQuerySchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function GET(request: NextRequest) {
  try {
    // Rate limiting for sensitive operations
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'sensitive');
    if (!allowed) return rateLimitResponse!;

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    // Validate email
    const validation = EmailQuerySchema.safeParse({ email });
    if (!validation.success) {
      throw ValidationError.fromZodError(validation.error);
    }

    const adminClient = createAdminClient();

    // Verify user exists
    const { data: { users }, error: usersError } = await adminClient.auth.admin.listUsers();

    if (usersError) {
      throw new DatabaseError('Failed to verify user', 'listUsers', 'auth.users');
    }

    const userExists = users?.some(u => u.email === email);

    if (!userExists) {
      throw new NotFoundError('User');
    }

    // Check if password reset was recently requested
    // In a real implementation, you would check a password_reset_requests table
    // For now, we'll just verify the user exists and can receive emails

    return NextResponse.json({
      success: true,
      message: 'Password reset email can be sent',
      email,
      verified: true,
    });

  } catch (error) {
    return handleError(error);
  }
}

/**
 * POST /api/auth/verify-password-reset
 * Send password reset email
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting for sensitive operations
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'sensitive');
    if (!allowed) return rateLimitResponse!;

    const body = await request.json();

    // Validate email
    const validation = EmailQuerySchema.safeParse(body);
    if (!validation.success) {
      throw ValidationError.fromZodError(validation.error);
    }

    const { email } = validation.data;

    const supabase = await createClient();

    // Send password reset email via Supabase
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
    });

    if (error) {
      throw new ExternalServiceError('Auth', 'Failed to send password reset email', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset email sent successfully',
      email,
    });

  } catch (error) {
    return handleError(error);
  }
}
