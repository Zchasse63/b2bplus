-- Migration: AI Cost Tracking and Budget Management
-- Description: Track AI API usage and costs to prevent budget overruns
-- COST CONTROL: Monitor and limit AI spending across the platform

-- AI usage tracking table
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  operation_type TEXT NOT NULL CHECK (operation_type IN (
    'embedding',
    'text_generation',
    'semantic_search',
    'sku_mapping',
    'campaign_generation',
    'content_generation'
  )),
  model_name TEXT NOT NULL,  -- 'text-embedding-004', 'gemini-1.5-flash', etc.
  input_tokens INTEGER,       -- For text generation
  output_tokens INTEGER,      -- For text generation
  embedding_dimensions INTEGER, -- For embeddings
  api_call_count INTEGER DEFAULT 1,
  estimated_cost_usd DECIMAL(10, 6) NOT NULL, -- Cost in USD (microdollars precision)
  from_cache BOOLEAN DEFAULT false,  -- Was this served from cache?
  metadata JSONB,  -- Additional context (endpoint, feature, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user
  ON ai_usage_log(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_organization
  ON ai_usage_log(organization_id);

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_operation
  ON ai_usage_log(operation_type);

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_created
  ON ai_usage_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user_date
  ON ai_usage_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_org_date
  ON ai_usage_log(organization_id, created_at DESC);

-- AI budget limits table
CREATE TABLE IF NOT EXISTS ai_budget_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  limit_type TEXT NOT NULL CHECK (limit_type IN ('daily', 'weekly', 'monthly')),
  max_cost_usd DECIMAL(10, 2) NOT NULL CHECK (max_cost_usd > 0),
  alert_threshold_percent INTEGER DEFAULT 80 CHECK (alert_threshold_percent BETWEEN 1 AND 100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, limit_type),
  UNIQUE(user_id, limit_type),
  CHECK (
    (organization_id IS NOT NULL AND user_id IS NULL) OR
    (organization_id IS NULL AND user_id IS NOT NULL)
  )
);

-- Indexes for budget checks
CREATE INDEX IF NOT EXISTS idx_ai_budget_limits_org
  ON ai_budget_limits(organization_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_ai_budget_limits_user
  ON ai_budget_limits(user_id)
  WHERE is_active = true;

-- Enable RLS
ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_budget_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_usage_log

-- Users can view their own usage
CREATE POLICY "Users can view own AI usage"
  ON ai_usage_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all usage
CREATE POLICY "Admins can view all AI usage"
  ON ai_usage_log FOR SELECT
  TO authenticated
  USING (is_admin());

-- System can insert usage logs
CREATE POLICY "Authenticated users can log AI usage"
  ON ai_usage_log FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR is_admin());

-- RLS Policies for ai_budget_limits

-- Users can view their own limits
CREATE POLICY "Users can view own budget limits"
  ON ai_budget_limits FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_admin());

-- Only admins can manage budget limits
CREATE POLICY "Admins can manage budget limits"
  ON ai_budget_limits FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Function to calculate AI operation cost
CREATE OR REPLACE FUNCTION calculate_ai_cost(
  p_operation_type TEXT,
  p_model_name TEXT,
  p_input_tokens INTEGER DEFAULT NULL,
  p_output_tokens INTEGER DEFAULT NULL,
  p_embedding_dimensions INTEGER DEFAULT NULL
)
RETURNS DECIMAL
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cost DECIMAL := 0;
BEGIN
  -- Gemini pricing (as of 2024)
  -- Text generation: $0.00025 per 1K input tokens, $0.0005 per 1K output tokens
  -- Embeddings: $0.0001 per 1K dimensions

  CASE p_operation_type
    WHEN 'embedding' THEN
      -- Cost for embedding generation
      -- Gemini text-embedding-004: ~$0.00001 per 1K dimensions
      cost := (COALESCE(p_embedding_dimensions, 768) / 1000.0) * 0.00001;

    WHEN 'text_generation', 'campaign_generation', 'content_generation' THEN
      -- Cost for text generation
      -- Input: $0.00025 per 1K tokens
      -- Output: $0.0005 per 1K tokens
      cost := (COALESCE(p_input_tokens, 0) / 1000.0) * 0.00025
            + (COALESCE(p_output_tokens, 0) / 1000.0) * 0.0005;

    WHEN 'semantic_search', 'sku_mapping' THEN
      -- These use embeddings, charge per embedding
      cost := (COALESCE(p_embedding_dimensions, 768) / 1000.0) * 0.00001;

    ELSE
      -- Default minimal cost for unknown operations
      cost := 0.00001;
  END CASE;

  RETURN ROUND(cost, 6);
END;
$$;

-- Function to check if user/org is within budget
CREATE OR REPLACE FUNCTION check_ai_budget(
  p_user_id UUID DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL,
  p_estimated_cost DECIMAL DEFAULT 0
)
RETURNS TABLE (
  within_budget BOOLEAN,
  limit_type TEXT,
  current_usage DECIMAL,
  limit_amount DECIMAL,
  percent_used DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_daily_limit DECIMAL;
  v_weekly_limit DECIMAL;
  v_monthly_limit DECIMAL;
  v_daily_usage DECIMAL;
  v_weekly_usage DECIMAL;
  v_monthly_usage DECIMAL;
BEGIN
  -- Get active budget limits
  SELECT max_cost_usd INTO v_daily_limit
  FROM ai_budget_limits
  WHERE (user_id = p_user_id OR organization_id = p_organization_id)
    AND limit_type = 'daily'
    AND is_active = true;

  SELECT max_cost_usd INTO v_weekly_limit
  FROM ai_budget_limits
  WHERE (user_id = p_user_id OR organization_id = p_organization_id)
    AND limit_type = 'weekly'
    AND is_active = true;

  SELECT max_cost_usd INTO v_monthly_limit
  FROM ai_budget_limits
  WHERE (user_id = p_user_id OR organization_id = p_organization_id)
    AND limit_type = 'monthly'
    AND is_active = true;

  -- Calculate current usage
  SELECT COALESCE(SUM(estimated_cost_usd), 0) INTO v_daily_usage
  FROM ai_usage_log
  WHERE (user_id = p_user_id OR organization_id = p_organization_id)
    AND created_at >= NOW() - INTERVAL '1 day'
    AND from_cache = false;  -- Only count actual API calls

  SELECT COALESCE(SUM(estimated_cost_usd), 0) INTO v_weekly_usage
  FROM ai_usage_log
  WHERE (user_id = p_user_id OR organization_id = p_organization_id)
    AND created_at >= NOW() - INTERVAL '7 days'
    AND from_cache = false;

  SELECT COALESCE(SUM(estimated_cost_usd), 0) INTO v_monthly_usage
  FROM ai_usage_log
  WHERE (user_id = p_user_id OR organization_id = p_organization_id)
    AND created_at >= NOW() - INTERVAL '30 days'
    AND from_cache = false;

  -- Check limits and return status
  IF v_daily_limit IS NOT NULL AND (v_daily_usage + p_estimated_cost) > v_daily_limit THEN
    RETURN QUERY SELECT false, 'daily'::TEXT, v_daily_usage, v_daily_limit,
      ROUND((v_daily_usage / v_daily_limit * 100), 2);
    RETURN;
  END IF;

  IF v_weekly_limit IS NOT NULL AND (v_weekly_usage + p_estimated_cost) > v_weekly_limit THEN
    RETURN QUERY SELECT false, 'weekly'::TEXT, v_weekly_usage, v_weekly_limit,
      ROUND((v_weekly_usage / v_weekly_limit * 100), 2);
    RETURN;
  END IF;

  IF v_monthly_limit IS NOT NULL AND (v_monthly_usage + p_estimated_cost) > v_monthly_limit THEN
    RETURN QUERY SELECT false, 'monthly'::TEXT, v_monthly_usage, v_monthly_limit,
      ROUND((v_monthly_usage / v_monthly_limit * 100), 2);
    RETURN;
  END IF;

  -- Within budget
  RETURN QUERY SELECT true, NULL::TEXT, 0::DECIMAL, 0::DECIMAL, 0::DECIMAL;
END;
$$;

-- Function to get AI usage summary
CREATE OR REPLACE FUNCTION get_ai_usage_summary(
  p_user_id UUID DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL,
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  period TEXT,
  total_cost DECIMAL,
  api_calls INTEGER,
  cache_hits INTEGER,
  cache_hit_rate DECIMAL,
  cost_by_operation JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN p_days_back = 1 THEN 'Today'
      WHEN p_days_back = 7 THEN 'Last 7 days'
      WHEN p_days_back = 30 THEN 'Last 30 days'
      ELSE p_days_back || ' days'
    END::TEXT AS period,
    COALESCE(SUM(estimated_cost_usd), 0)::DECIMAL AS total_cost,
    COUNT(*)::INTEGER AS api_calls,
    COUNT(*) FILTER (WHERE from_cache = true)::INTEGER AS cache_hits,
    CASE
      WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE from_cache = true)::DECIMAL / COUNT(*) * 100), 2)
      ELSE 0
    END::DECIMAL AS cache_hit_rate,
    jsonb_object_agg(
      operation_type,
      COALESCE(SUM(estimated_cost_usd), 0)
    ) AS cost_by_operation
  FROM ai_usage_log
  WHERE (p_user_id IS NULL OR user_id = p_user_id)
    AND (p_organization_id IS NULL OR organization_id = p_organization_id)
    AND created_at >= NOW() - (p_days_back || ' days')::INTERVAL
  GROUP BY period;
END;
$$;

-- Trigger to update updated_at on ai_budget_limits
CREATE OR REPLACE FUNCTION update_ai_budget_limits_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_ai_budget_limits_updated_at
  BEFORE UPDATE ON ai_budget_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_budget_limits_updated_at();

-- Comments
COMMENT ON TABLE ai_usage_log IS 'Tracks all AI API usage with cost estimates for budget management';
COMMENT ON TABLE ai_budget_limits IS 'Defines spending limits for AI operations per user or organization';
COMMENT ON FUNCTION calculate_ai_cost IS 'Estimates cost of AI operations based on current Gemini pricing';
COMMENT ON FUNCTION check_ai_budget IS 'Validates if a planned AI operation is within budget limits';
COMMENT ON FUNCTION get_ai_usage_summary IS 'Provides usage and cost analytics for a time period';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'AI Cost Tracking System Created Successfully!';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Features:';
  RAISE NOTICE '- Cost tracking for all AI operations';
  RAISE NOTICE '- Budget limits (daily/weekly/monthly)';
  RAISE NOTICE '- Alert thresholds';
  RAISE NOTICE '- Cache hit rate monitoring';
  RAISE NOTICE '- Usage analytics and reporting';
  RAISE NOTICE '==================================================';
END $$;
