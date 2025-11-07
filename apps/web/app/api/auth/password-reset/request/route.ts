import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';
import { sendEmail } from '@/lib/sendgrid';

/**
 * POST /api/auth/password-reset/request
 *
 * Request a password reset link
 * Rate limited: 3 requests per hour per email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Check if user exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', email.toLowerCase())
      .single();

    // Always return success to prevent email enumeration attacks
    // Don't reveal if the email exists or not
    const successResponse = NextResponse.json({
      success: true,
      message:
        'If an account with that email exists, we sent you a password reset link.',
    });

    if (profileError || !profile) {
      // Still return success to prevent enumeration
      return successResponse;
    }

    // Check rate limit - 3 requests per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const { data: recentRequests, error: rateLimitError } = await supabase
      .from('password_reset_tokens')
      .select('id')
      .eq('user_id', profile.id)
      .gte('created_at', oneHourAgo.toISOString());

    if (!rateLimitError && recentRequests && recentRequests.length >= 3) {
      // Rate limit exceeded, but still return success to prevent enumeration
      return successResponse;
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store token in database
    const { error: tokenError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: profile.id,
        token,
        expires_at: expiresAt.toISOString(),
      });

    if (tokenError) {
      console.error('Failed to create reset token:', tokenError);
      return successResponse; // Still return success
    }

    // Send password reset email
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${token}`;

    try {
      await sendEmail({
        to: profile.email,
        subject: 'Password Reset Request - B2B Plus',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Password Reset Request</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #2563eb;">Password Reset Request</h1>
                <p>Hi ${profile.full_name || 'there'},</p>
                <p>We received a request to reset your password for your B2B Plus account.</p>
                <p>Click the button below to reset your password:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetUrl}"
                     style="background-color: #2563eb; color: white; padding: 12px 24px;
                            text-decoration: none; border-radius: 5px; display: inline-block;">
                    Reset Password
                  </a>
                </div>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #2563eb;">
                  ${resetUrl}
                </p>
                <p><strong>This link will expire in 1 hour.</strong></p>
                <p>If you didn't request a password reset, you can safely ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                <p style="font-size: 12px; color: #666;">
                  B2B Plus - Your trusted B2B marketplace
                </p>
              </div>
            </body>
          </html>
        `,
        text: `
          Hi ${profile.full_name || 'there'},

          We received a request to reset your password for your B2B Plus account.

          Click the link below to reset your password:
          ${resetUrl}

          This link will expire in 1 hour.

          If you didn't request a password reset, you can safely ignore this email.

          B2B Plus - Your trusted B2B marketplace
        `,
      });
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Continue anyway - token is stored
    }

    return successResponse;
  } catch (error) {
    console.error('Password reset request error:', error);
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    );
  }
}
