-- TASK-024: Email Verification System
-- Creates tables and policies for email verification workflow

-- 1. Add email_verified_at column to auth.users (if not exists)
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP;

-- 2. Create email_verification_tokens table
CREATE TABLE IF NOT EXISTS public.email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  token_hash TEXT NOT NULL UNIQUE, -- For additional security
  expires_at TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  verified_at TIMESTAMP,
  resend_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT token_length CHECK (LENGTH(token) >= 32)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id
  ON public.email_verification_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token
  ON public.email_verification_tokens(token);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token_hash
  ON public.email_verification_tokens(token_hash);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires_at
  ON public.email_verification_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_email
  ON public.email_verification_tokens(email);

-- 4. Enable RLS on email_verification_tokens
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies
-- Allow users to see their own verification tokens
CREATE POLICY "users_can_view_own_verification_tokens"
  ON public.email_verification_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow service role to manage all tokens
CREATE POLICY "service_role_can_manage_verification_tokens"
  ON public.email_verification_tokens
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 6. Create function to verify email
CREATE OR REPLACE FUNCTION verify_email(
  p_token TEXT,
  p_user_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  user_id UUID
) AS $$
DECLARE
  v_token_record RECORD;
  v_token_hash TEXT;
BEGIN
  -- Hash the provided token
  v_token_hash := encode(digest(p_token, 'sha256'), 'hex');

  -- Find the token
  SELECT * INTO v_token_record
  FROM public.email_verification_tokens
  WHERE token_hash = v_token_hash
    AND user_id = p_user_id
    AND verified_at IS NULL;

  -- Check if token exists
  IF v_token_record IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Token not found or already used'::TEXT, p_user_id;
    RETURN;
  END IF;

  -- Check if token expired
  IF v_token_record.expires_at < NOW() THEN
    RETURN QUERY SELECT FALSE, 'Token has expired'::TEXT, p_user_id;
    RETURN;
  END IF;

  -- Mark as verified
  UPDATE public.email_verification_tokens
  SET verified_at = NOW(),
      updated_at = NOW()
  WHERE id = v_token_record.id;

  -- Update user's email_verified_at
  UPDATE auth.users
  SET email_verified_at = NOW()
  WHERE id = p_user_id;

  RETURN QUERY SELECT TRUE, 'Email verified successfully'::TEXT, p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_verification_tokens()
RETURNS TABLE (
  deleted_count INT
) AS $$
DECLARE
  v_deleted_count INT;
BEGIN
  DELETE FROM public.email_verification_tokens
  WHERE expires_at < NOW()
    AND verified_at IS NULL;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN QUERY SELECT v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create function to resend verification email
CREATE OR REPLACE FUNCTION can_resend_verification_email(
  p_user_id UUID
)
RETURNS TABLE (
  can_resend BOOLEAN,
  message TEXT,
  wait_seconds INT
) AS $$
DECLARE
  v_last_token RECORD;
  v_wait_time INT;
BEGIN
  -- Get last verification token for user
  SELECT * INTO v_last_token
  FROM public.email_verification_tokens
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no token exists, can resend
  IF v_last_token IS NULL THEN
    RETURN QUERY SELECT TRUE, 'Can send verification email'::TEXT, 0;
    RETURN;
  END IF;

  -- If already verified, can't resend
  IF v_last_token.verified_at IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, 'Email already verified'::TEXT, 0;
    RETURN;
  END IF;

  -- If less than 1 minute since last token, rate limit
  v_wait_time := EXTRACT(EPOCH FROM (NOW() - v_last_token.created_at))::INT;
  IF v_wait_time < 60 THEN
    RETURN QUERY SELECT FALSE, 'Please wait before requesting another email'::TEXT, 60 - v_wait_time;
    RETURN;
  END IF;

  -- If exceeded resend limit (3 per 24 hours)
  IF v_last_token.resend_count >= 3 THEN
    RETURN QUERY SELECT FALSE, 'Too many resend attempts. Please contact support'::TEXT, 0;
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, 'Can send verification email'::TEXT, 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create audit table for email verification attempts
CREATE TABLE IF NOT EXISTS public.email_verification_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  action TEXT NOT NULL, -- 'sent', 'verified', 'failed', 'expired'
  reason TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 10. Create index on audit table
CREATE INDEX IF NOT EXISTS idx_email_verification_audit_user_id
  ON public.email_verification_audit(user_id);

CREATE INDEX IF NOT EXISTS idx_email_verification_audit_created_at
  ON public.email_verification_audit(created_at);

-- Enable RLS on audit table
ALTER TABLE public.email_verification_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_can_view_own_verification_audit"
  ON public.email_verification_audit
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "service_role_can_manage_verification_audit"
  ON public.email_verification_audit
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 11. Add comment documenting the email verification system
COMMENT ON TABLE public.email_verification_tokens IS 'Stores email verification tokens for new signups and email changes';
COMMENT ON FUNCTION verify_email(TEXT, UUID) IS 'Verifies an email address using a token';
COMMENT ON FUNCTION cleanup_expired_verification_tokens() IS 'Removes expired verification tokens (run periodically)';
COMMENT ON FUNCTION can_resend_verification_email(UUID) IS 'Checks if a user can resend verification email (rate limited)';

-- 12. Grant permissions
GRANT SELECT ON public.email_verification_tokens TO authenticated;
GRANT SELECT ON public.email_verification_audit TO authenticated;
GRANT EXECUTE ON FUNCTION verify_email(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_resend_verification_email(UUID) TO authenticated;
