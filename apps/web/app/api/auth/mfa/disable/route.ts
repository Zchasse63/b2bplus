import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { disableMFA, verifyMFAChallenge } from '@/lib/auth/mfa';

/**
 * POST /api/auth/mfa/disable
 *
 * Disable MFA for the authenticated admin user.
 * Requires verification of current MFA token for security.
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
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required to disable MFA' },
        { status: 400 }
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

    // Check if MFA is enabled
    if (!profile.mfa_enabled) {
      return NextResponse.json(
        { error: 'MFA is not enabled' },
        { status: 400 }
      );
    }

    // Verify the token before disabling
    const result = await verifyMFAChallenge(user.id, token);

    if (!result.valid) {
      return NextResponse.json(
        { error: 'Invalid verification code. MFA was not disabled.' },
        { status: 400 }
      );
    }

    // Disable MFA
    await disableMFA(user.id);

    return NextResponse.json({
      success: true,
      message: 'MFA has been disabled successfully',
    });
  } catch (error) {
    console.error('MFA disable error:', error);
    return NextResponse.json(
      { error: 'Failed to disable MFA' },
      { status: 500 }
    );
  }
}
