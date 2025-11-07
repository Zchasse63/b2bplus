import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateMFASecret } from '@/lib/auth/mfa';

/**
 * POST /api/auth/mfa/setup
 *
 * Generate MFA secret and QR code for the authenticated user.
 * This does not enable MFA - user must verify the token first.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
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

    // Get user profile to check if they're an admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, email, mfa_enabled')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Only allow admin users to set up MFA
    if (profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'MFA is only available for admin accounts' },
        { status: 403 }
      );
    }

    // Check if MFA is already enabled
    if (profile.mfa_enabled) {
      return NextResponse.json(
        { error: 'MFA is already enabled. Disable it first to regenerate.' },
        { status: 400 }
      );
    }

    // Generate MFA secret and backup codes
    const mfaSetup = await generateMFASecret(user.id, profile.email);

    // Store the secret temporarily in session or return it
    // User needs to verify a token before we permanently enable MFA
    return NextResponse.json({
      success: true,
      data: {
        qrCode: mfaSetup.qrCodeUrl,
        secret: mfaSetup.secret,
        backupCodes: mfaSetup.backupCodes,
      },
    });
  } catch (error) {
    console.error('MFA setup error:', error);
    return NextResponse.json(
      { error: 'Failed to set up MFA' },
      { status: 500 }
    );
  }
}
