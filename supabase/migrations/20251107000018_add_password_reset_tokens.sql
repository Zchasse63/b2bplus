-- Migration: Add password reset tokens table
-- Description: Create table for secure password reset functionality with rate limiting

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure tokens have reasonable expiration (not more than 24 hours)
  CONSTRAINT valid_expiration CHECK (expires_at <= created_at + INTERVAL '24 hours')
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token
  ON password_reset_tokens(token);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_created
  ON password_reset_tokens(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires
  ON password_reset_tokens(expires_at) WHERE NOT used;

-- Add comments for documentation
COMMENT ON TABLE password_reset_tokens IS 'Secure password reset tokens with expiration and usage tracking';
COMMENT ON COLUMN password_reset_tokens.token IS 'Cryptographically secure random token';
COMMENT ON COLUMN password_reset_tokens.expires_at IS 'Token expiration time (typically 1 hour from creation)';
COMMENT ON COLUMN password_reset_tokens.used IS 'Whether the token has been used (one-time use)';

-- RLS (Row Level Security) policies
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only view their own tokens
CREATE POLICY "Users can view own reset tokens"
  ON password_reset_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert tokens (API endpoints)
CREATE POLICY "Service can insert reset tokens"
  ON password_reset_tokens
  FOR INSERT
  WITH CHECK (true);

-- Service role can update tokens (API endpoints)
CREATE POLICY "Service can update reset tokens"
  ON password_reset_tokens
  FOR UPDATE
  USING (true);

-- Function to clean up expired and used tokens
CREATE OR REPLACE FUNCTION cleanup_old_password_reset_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete expired tokens (older than expiration time)
  DELETE FROM password_reset_tokens
  WHERE expires_at < NOW();

  -- Delete used tokens older than 7 days (for audit purposes)
  DELETE FROM password_reset_tokens
  WHERE used = true
    AND created_at < NOW() - INTERVAL '7 days';
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION cleanup_old_password_reset_tokens IS 'Cleanup expired and old used password reset tokens';

-- Function to check rate limit (3 requests per hour per user)
CREATE OR REPLACE FUNCTION check_password_reset_rate_limit(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request_count INTEGER;
BEGIN
  -- Count requests in the last hour
  SELECT COUNT(*)
  INTO v_request_count
  FROM password_reset_tokens
  WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '1 hour';

  -- Return true if under the limit (3 requests per hour)
  RETURN v_request_count < 3;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION check_password_reset_rate_limit IS 'Check if user has exceeded password reset rate limit (3 per hour)';

-- Note: Schedule the cleanup function to run periodically using pg_cron or similar
-- Example: SELECT cron.schedule('cleanup-reset-tokens', '0 * * * *', 'SELECT cleanup_old_password_reset_tokens()');
