import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  verifyMFAToken,
  enableMFA,
  checkMFARateLimit,
  verifyMFAChallenge,
} from '@/lib/auth/mfa';

/**
 * POST /api/auth/mfa/verify
 *
 * Verify MFA token and enable MFA for the user (during setup)
 * OR verify token during login
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { token, secret, backupCodes, action } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Check rate limit for failed attempts
    const rateLimited = await checkMFARateLimit(user.id);
    if (rateLimited) {
      return NextResponse.json(
        { error: 'Too many failed attempts. Please try again in 15 minutes.' },
        { status: 429 }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, mfa_enabled')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Only allow admin users
    if (profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'MFA is only available for admin accounts' },
        { status: 403 }
      );
    }

    // Handle different actions
    if (action === 'setup') {
      // Setting up MFA for the first time
      if (!secret || !backupCodes) {
        return NextResponse.json(
          { error: 'Secret and backup codes are required for setup' },
          { status: 400 }
        );
      }

      // Verify the token with the provided secret
      const isValid = verifyMFAToken(token, secret);

      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid verification code' },
          { status: 400 }
        );
      }

      // Enable MFA for the user
      await enableMFA(user.id, secret, backupCodes);

      return NextResponse.json({
        success: true,
        message: 'MFA has been enabled successfully',
      });
    } else {
      // Verifying MFA during login or other operations
      const result = await verifyMFAChallenge(user.id, token);

      if (!result.valid) {
        return NextResponse.json(
          { error: 'Invalid verification code' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        usedBackupCode: result.usedBackupCode,
        message: result.usedBackupCode
          ? 'Backup code verified successfully'
          : 'MFA verified successfully',
      });
    }
  } catch (error) {
    console.error('MFA verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify MFA token' },
      { status: 500 }
    );
  }
}
