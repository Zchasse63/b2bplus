import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export interface MFASetupResponse {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface MFAStatus {
  enabled: boolean;
  backupCodesRemaining: number;
}

/**
 * Generate a new MFA secret and QR code for a user
 */
export async function generateMFASecret(
  userId: string,
  email: string
): Promise<MFASetupResponse> {
  // Generate secret
  const secret = speakeasy.generateSecret({
    name: `B2B Plus (${email})`,
    issuer: 'B2B Plus',
    length: 32,
  });

  if (!secret.otpauth_url) {
    throw new Error('Failed to generate OTP auth URL');
  }

  // Generate QR code
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

  // Generate backup codes (10 codes)
  const backupCodes = generateBackupCodes(10);

  return {
    secret: secret.base32,
    qrCodeUrl,
    backupCodes,
  };
}

/**
 * Verify a TOTP token against a secret
 */
export function verifyMFAToken(token: string, secret: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2, // Allow 2 time steps before/after for clock drift
  });
}

/**
 * Enable MFA for a user
 */
export async function enableMFA(
  userId: string,
  secret: string,
  backupCodes: string[]
): Promise<void> {
  const supabase = createClient();

  // Hash backup codes before storing
  const hashedBackupCodes = backupCodes.map((code) =>
    hashBackupCode(code)
  );

  const { error } = await supabase
    .from('profiles')
    .update({
      mfa_enabled: true,
      mfa_secret: secret,
      mfa_backup_codes: hashedBackupCodes,
    })
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to enable MFA: ${error.message}`);
  }
}

/**
 * Disable MFA for a user
 */
export async function disableMFA(userId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('profiles')
    .update({
      mfa_enabled: false,
      mfa_secret: null,
      mfa_backup_codes: null,
    })
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to disable MFA: ${error.message}`);
  }
}

/**
 * Get MFA status for a user
 */
export async function getMFAStatus(userId: string): Promise<MFAStatus> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('mfa_enabled, mfa_backup_codes')
    .eq('id', userId)
    .single();

  if (error) {
    throw new Error(`Failed to get MFA status: ${error.message}`);
  }

  return {
    enabled: data.mfa_enabled || false,
    backupCodesRemaining: data.mfa_backup_codes?.length || 0,
  };
}

/**
 * Verify MFA token or backup code
 */
export async function verifyMFAChallenge(
  userId: string,
  token: string
): Promise<{ valid: boolean; usedBackupCode: boolean }> {
  const supabase = createClient();

  // Get user's MFA settings
  const { data, error } = await supabase
    .from('profiles')
    .select('mfa_secret, mfa_backup_codes')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return { valid: false, usedBackupCode: false };
  }

  // Try to verify as TOTP token first
  if (data.mfa_secret && verifyMFAToken(token, data.mfa_secret)) {
    // Record successful attempt
    await recordMFAAttempt(userId, true);
    return { valid: true, usedBackupCode: false };
  }

  // Try to verify as backup code
  if (data.mfa_backup_codes && data.mfa_backup_codes.length > 0) {
    const hashedToken = hashBackupCode(token);
    const codeIndex = data.mfa_backup_codes.findIndex(
      (code: string) => code === hashedToken
    );

    if (codeIndex !== -1) {
      // Remove used backup code
      const updatedBackupCodes = [...data.mfa_backup_codes];
      updatedBackupCodes.splice(codeIndex, 1);

      await supabase
        .from('profiles')
        .update({ mfa_backup_codes: updatedBackupCodes })
        .eq('id', userId);

      // Record successful attempt
      await recordMFAAttempt(userId, true);
      return { valid: true, usedBackupCode: true };
    }
  }

  // Record failed attempt
  await recordMFAAttempt(userId, false);
  return { valid: false, usedBackupCode: false };
}

/**
 * Check if user has too many failed MFA attempts (brute force protection)
 */
export async function checkMFARateLimit(userId: string): Promise<boolean> {
  const supabase = createClient();

  // Check failed attempts in last 15 minutes
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

  const { data, error } = await supabase
    .from('mfa_verification_attempts')
    .select('id')
    .eq('user_id', userId)
    .eq('success', false)
    .gte('created_at', fifteenMinutesAgo.toISOString());

  if (error) {
    console.error('Failed to check MFA rate limit:', error);
    return false;
  }

  // Allow up to 5 failed attempts in 15 minutes
  return (data?.length || 0) >= 5;
}

/**
 * Record MFA verification attempt
 */
async function recordMFAAttempt(
  userId: string,
  success: boolean
): Promise<void> {
  const supabase = createClient();

  await supabase.from('mfa_verification_attempts').insert({
    user_id: userId,
    success,
  });
}

/**
 * Generate cryptographically secure backup codes
 */
function generateBackupCodes(count: number): string[] {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric code
    const code = crypto
      .randomBytes(5)
      .toString('hex')
      .toUpperCase()
      .substring(0, 8);
    codes.push(code);
  }

  return codes;
}

/**
 * Hash a backup code for secure storage
 */
function hashBackupCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Regenerate backup codes for a user
 */
export async function regenerateBackupCodes(
  userId: string
): Promise<string[]> {
  const supabase = createClient();

  // Generate new backup codes
  const backupCodes = generateBackupCodes(10);
  const hashedBackupCodes = backupCodes.map((code) => hashBackupCode(code));

  // Update user's backup codes
  const { error } = await supabase
    .from('profiles')
    .update({ mfa_backup_codes: hashedBackupCodes })
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to regenerate backup codes: ${error.message}`);
  }

  return backupCodes;
}
