-- Migration: Fix race condition in magic link rate limiting
-- This migration creates a database function to atomically check rate limits
-- and insert magic link tokens, preventing race conditions

-- Drop function if exists
DROP FUNCTION IF EXISTS insert_magic_link_token_with_rate_limit;

-- Create function to atomically check rate limit and insert token
CREATE OR REPLACE FUNCTION insert_magic_link_token_with_rate_limit(
  p_user_id UUID,
  p_lead_id UUID,
  p_token TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_purpose TEXT,
  p_redirect_url TEXT,
  p_expires_at TIMESTAMP,
  p_ip_address TEXT,
  p_user_agent TEXT
) RETURNS TABLE(success BOOLEAN, error_message TEXT) AS $$
DECLARE
  v_recent_count INTEGER;
  v_one_hour_ago TIMESTAMP;
BEGIN
  -- Calculate one hour ago
  v_one_hour_ago := NOW() - INTERVAL '1 hour';

  -- Count recent tokens for this email/phone in the last hour
  SELECT COUNT(*) INTO v_recent_count
  FROM magic_link_tokens
  WHERE (
    (p_email IS NOT NULL AND email = p_email)
    OR (p_phone IS NOT NULL AND phone = p_phone)
  )
  AND created_at >= v_one_hour_ago;

  -- Check if rate limit exceeded
  IF v_recent_count >= 3 THEN
    RETURN QUERY SELECT false, 'Rate limit exceeded. Maximum 3 requests per hour.'::TEXT;
    RETURN;
  END IF;

  -- Insert the token
  INSERT INTO magic_link_tokens (
    user_id,
    lead_id,
    token,
    email,
    phone,
    purpose,
    redirect_url,
    expires_at,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_lead_id,
    p_token,
    p_email,
    p_phone,
    p_purpose,
    p_redirect_url,
    p_expires_at,
    p_ip_address,
    p_user_agent
  );

  -- Return success
  RETURN QUERY SELECT true, NULL::TEXT;

EXCEPTION
  WHEN unique_violation THEN
    -- Handle duplicate token (extremely rare)
    RETURN QUERY SELECT false, 'Token collision detected. Please try again.'::TEXT;
  WHEN OTHERS THEN
    -- Handle any other errors
    RETURN QUERY SELECT false, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION insert_magic_link_token_with_rate_limit IS
  'Atomically checks rate limit and inserts magic link token to prevent race conditions';
