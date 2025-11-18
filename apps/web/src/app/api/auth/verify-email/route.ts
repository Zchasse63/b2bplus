import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@b2b-plus/shared';
import crypto from 'crypto';

/**
 * POST /api/auth/verify-email
 * Verifies an email using a verification token
 */
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Hash the token
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find and verify token
    const { data: tokenRecord } = await supabase
      .from('email_verification_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .single();

    if (!tokenRecord) {
      logger.warn('Verification token not found', { tokenHash: tokenHash.substring(0, 8) });
      await supabase
        .from('email_verification_audit')
        .insert({
          email: 'unknown',
          action: 'failed',
          reason: 'Token not found',
          ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        });

      return NextResponse.json(
        { error: 'Invalid verification token' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (new Date(tokenRecord.expires_at) < new Date()) {
      logger.warn('Verification token expired', {
        email: tokenRecord.email,
        expiresAt: tokenRecord.expires_at,
      });
      await supabase
        .from('email_verification_audit')
        .insert({
          email: tokenRecord.email,
          action: 'expired',
          reason: 'Token expired',
          ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        });

      return NextResponse.json(
        { error: 'Verification token has expired' },
        { status: 400 }
      );
    }

    // Check if already verified
    if (tokenRecord.verified_at) {
      logger.warn('Token already used', { email: tokenRecord.email });
      return NextResponse.json(
        { error: 'Token already used' },
        { status: 400 }
      );
    }

    // Mark token as verified
    const { error: updateError } = await supabase
      .from('email_verification_tokens')
      .update({
        verified_at: new Date().toISOString(),
        used_at: new Date().toISOString(),
      })
      .eq('id', tokenRecord.id);

    if (updateError) {
      logger.error('Failed to mark token as verified', updateError as Error);
      return NextResponse.json(
        { error: 'Verification failed' },
        { status: 500 }
      );
    }

    // Update user profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        email_verified_at: new Date().toISOString(),
      })
      .eq('email', tokenRecord.email);

    if (profileError) {
      logger.error('Failed to update user profile', profileError as Error, {
        email: tokenRecord.email,
      });
    }

    // Log successful verification
    await supabase
      .from('email_verification_audit')
      .insert({
        email: tokenRecord.email,
        action: 'verified',
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      });

    logger.info('Email verified successfully', {
      email: tokenRecord.email,
    });

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      email: tokenRecord.email,
    });

  } catch (error) {
    logger.error('Verify email error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
