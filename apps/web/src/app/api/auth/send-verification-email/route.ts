import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@b2b-plus/shared';
import crypto from 'crypto';

const VERIFICATION_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const RESEND_RATE_LIMIT = 60 * 1000; // 1 minute between resends

/**
 * POST /api/auth/send-verification-email
 * Sends an email verification token to the user
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // Validate input
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if user already verified
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('email_verified_at')
      .eq('email', email)
      .single();

    if (existingUser?.email_verified_at) {
      return NextResponse.json(
        { error: 'Email already verified' },
        { status: 400 }
      );
    }

    // Check rate limiting - can't send more than 3 emails per 24 hours
    const { data: recentTokens } = await supabase
      .from('email_verification_tokens')
      .select('created_at')
      .eq('email', email)
      .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (recentTokens && recentTokens.length >= 3) {
      logger.warn('Email verification rate limit exceeded', { email });
      return NextResponse.json(
        { error: 'Too many verification attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Store token in database
    const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY);

    const { error: tokenError } = await supabase
      .from('email_verification_tokens')
      .insert({
        email,
        token,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
      });

    if (tokenError) {
      logger.error('Failed to create verification token', tokenError as Error, {
        email,
      });
      return NextResponse.json(
        { error: 'Failed to send verification email' },
        { status: 500 }
      );
    }

    // Log verification attempt
    await supabase
      .from('email_verification_audit')
      .insert({
        email,
        action: 'sent',
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      });

    logger.info('Verification email sent successfully', {
      email,
      tokenExpiry: expiresAt,
    });

    return NextResponse.json({
      success: true,
      message: 'Verification email sent. Please check your inbox.',
    });

  } catch (error) {
    logger.error('Send verification email error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
