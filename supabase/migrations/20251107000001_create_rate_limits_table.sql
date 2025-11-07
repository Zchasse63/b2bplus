-- Create rate_limits table for API rate limiting
-- Prevents abuse of expensive AI operations and protects endpoints

CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_key TEXT NOT NULL UNIQUE,
  identifier TEXT NOT NULL,
  requests_count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups by bucket_key
CREATE INDEX IF NOT EXISTS idx_rate_limits_bucket_key ON rate_limits(bucket_key);

-- Index for cleanup of expired entries
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_end ON rate_limits(window_end);

-- Index for queries by identifier
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_rate_limits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rate_limits_updated_at
  BEFORE UPDATE ON rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_rate_limits_updated_at();

-- RLS policies for rate_limits table
-- Only service role should access this table
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role has full access to rate_limits"
  ON rate_limits
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Add comment
COMMENT ON TABLE rate_limits IS 'Rate limiting data for API endpoints to prevent abuse';
