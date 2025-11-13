import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
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

    const supabase = createRouteHandlerClient({ cookies });

    // Hash the token for comparison
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find the verification token record
    const { data: tokenRecord, error: selectError } = await supabase
      .from('email_verification_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .single();

    if (selectError || !tokenRecord) {
      console.error('Token not found:', selectError);

      // Log failed attempt
      await supabase
        .from('email_verification_audit')
        .insert({
          email: 'unknown',
          action: 'failed',
          reason: 'Token not found',
          ip_address: request.headers.get('x-forwarded-for') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown',
        })
        .catch(err => console.error('Audit log error:', err));

      return NextResponse.json(
        { error: 'Invalid verification token' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (new Date(tokenRecord.expires_at) < new Date()) {
      console.warn('Token expired:', tokenRecord.email);

      await supabase
        .from('email_verification_audit')
        .insert({
          email: tokenRecord.email,
          action: 'expired',
          reason: 'Token expired',
          ip_address: request.headers.get('x-forwarded-for') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown',
        })
        .catch(err => console.error('Audit log error:', err));

      return NextResponse.json(
        { error: 'Verification token has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check if already verified
    if (tokenRecord.verified_at) {
      console.warn('Token already used:', tokenRecord.email);

      return NextResponse.json(
        { error: 'This token has already been used' },
        { status: 400 }
      );
    }

    // Mark token as verified
    const { error: updateTokenError } = await supabase
      .from('email_verification_tokens')
      .update({
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', tokenRecord.id);

    if (updateTokenError) {
      console.error('Failed to mark token as verified:', updateTokenError);
      return NextResponse.json(
        { error: 'Verification failed. Please try again.' },
        { status: 500 }
      );
    }

    // Update user profile with email verified timestamp
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        email_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('email', tokenRecord.email);

    if (profileError) {
      console.error('Failed to update profile:', profileError);
      // Don't fail - token was still marked as verified
    }

    // Log successful verification
    await supabase
      .from('email_verification_audit')
      .insert({
        email: tokenRecord.email,
        action: 'verified',
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      })
      .catch(err => console.error('Audit log error:', err));

    console.log('[EMAIL] Email verified successfully:', tokenRecord.email);

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully!',
      email: tokenRecord.email,
    });

  } catch (error) {
    console.error('Verify email endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
