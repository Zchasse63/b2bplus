-- Migration: Add MFA (Multi-Factor Authentication) support
-- Description: Add MFA columns to profiles table and create MFA verification attempts tracking table

-- Add MFA columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mfa_secret TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mfa_backup_codes TEXT[]; -- Array of hashed backup codes

-- Add comments for documentation
COMMENT ON COLUMN profiles.mfa_enabled IS 'Whether MFA is enabled for this user (admin accounts only)';
COMMENT ON COLUMN profiles.mfa_secret IS 'TOTP secret key for MFA (base32 encoded)';
COMMENT ON COLUMN profiles.mfa_backup_codes IS 'Array of hashed backup codes for emergency access';

-- MFA verification attempts tracking table (prevent brute force attacks)
CREATE TABLE IF NOT EXISTS mfa_verification_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  success BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_mfa_attempts_user_created
  ON mfa_verification_attempts(user_id, created_at DESC);

-- Add comment for documentation
COMMENT ON TABLE mfa_verification_attempts IS 'Track MFA verification attempts to prevent brute force attacks';

-- RLS (Row Level Security) policies for mfa_verification_attempts
ALTER TABLE mfa_verification_attempts ENABLE ROW LEVEL SECURITY;

-- Users can only view their own MFA attempts
CREATE POLICY "Users can view own MFA attempts"
  ON mfa_verification_attempts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert MFA attempts (API endpoints)
CREATE POLICY "Service can insert MFA attempts"
  ON mfa_verification_attempts
  FOR INSERT
  WITH CHECK (true);

-- Create function to clean up old MFA attempts (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_mfa_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM mfa_verification_attempts
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION cleanup_old_mfa_attempts IS 'Cleanup MFA attempts older than 30 days for privacy and performance';

-- Note: You should schedule this function to run periodically using pg_cron or similar
-- Example: SELECT cron.schedule('cleanup-mfa-attempts', '0 2 * * *', 'SELECT cleanup_old_mfa_attempts()');
