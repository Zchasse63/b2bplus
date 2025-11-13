-- AI Metrics and Analytics Tables
-- Task 4.1: Create ai_metrics database table
-- 
-- Track AI usage, performance, and business metrics

-- AI Usage Metrics Table
CREATE TABLE IF NOT EXISTS ai_usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Metric details
  metric_type TEXT NOT NULL, -- 'chatbot', 'opportunity_detection', 'pricing_optimization', 'invoice_processing'
  operation TEXT NOT NULL, -- 'generate_response', 'detect_opportunities', 'optimize_pricing', 'extract_invoice'
  
  -- AI model info
  model_name TEXT NOT NULL, -- 'gemini-2.5-flash', 'gemini-2.5-pro'
  tokens_used INTEGER,
  
  -- Performance metrics
  response_time_ms INTEGER NOT NULL,
  cache_hit BOOLEAN DEFAULT FALSE,
  
  -- Business context
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  
  -- Result tracking
  success BOOLEAN NOT NULL DEFAULT TRUE,
  error_message TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Business Metrics Table
CREATE TABLE IF NOT EXISTS ai_business_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Metric details
  metric_type TEXT NOT NULL, -- 'opportunity_pursued', 'pricing_approved', 'lead_captured', 'forecast_accuracy'
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT, -- 'count', 'dollars', 'percentage'
  
  -- Context
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  opportunity_id UUID REFERENCES customer_opportunities(id) ON DELETE SET NULL,
  pricing_suggestion_id UUID REFERENCES pricing_optimization_suggestions(id) ON DELETE SET NULL,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ
);

-- Performance Metrics Table
CREATE TABLE IF NOT EXISTS ai_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Metric details
  metric_name TEXT NOT NULL, -- 'avg_response_time', 'cache_hit_rate', 'error_rate', 'throughput'
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT, -- 'ms', 'percentage', 'requests_per_minute'
  
  -- Aggregation info
  aggregation_period TEXT NOT NULL, -- 'hourly', 'daily', 'weekly', 'monthly'
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_usage_metrics_org_created 
ON ai_usage_metrics(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_metrics_type 
ON ai_usage_metrics(metric_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_metrics_user 
ON ai_usage_metrics(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_metrics_customer 
ON ai_usage_metrics(customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_business_metrics_org_created 
ON ai_business_metrics(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_business_metrics_type 
ON ai_business_metrics(metric_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_performance_metrics_org_period 
ON ai_performance_metrics(organization_id, period_start DESC, period_end DESC);

CREATE INDEX IF NOT EXISTS idx_ai_performance_metrics_name 
ON ai_performance_metrics(metric_name, period_start DESC);

-- Row Level Security
ALTER TABLE ai_usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_business_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_performance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their organization's AI usage metrics"
ON ai_usage_metrics FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "System can insert AI usage metrics"
ON ai_usage_metrics FOR INSERT
WITH CHECK (TRUE);

CREATE POLICY "Users can view their organization's business metrics"
ON ai_business_metrics FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "System can insert business metrics"
ON ai_business_metrics FOR INSERT
WITH CHECK (TRUE);

CREATE POLICY "Users can view their organization's performance metrics"
ON ai_performance_metrics FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "System can insert performance metrics"
ON ai_performance_metrics FOR INSERT
WITH CHECK (TRUE);

-- Helper function to record AI usage
CREATE OR REPLACE FUNCTION record_ai_usage(
  p_organization_id UUID,
  p_user_id UUID,
  p_metric_type TEXT,
  p_operation TEXT,
  p_model_name TEXT,
  p_tokens_used INTEGER,
  p_response_time_ms INTEGER,
  p_cache_hit BOOLEAN DEFAULT FALSE,
  p_success BOOLEAN DEFAULT TRUE,
  p_error_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  v_metric_id UUID;
BEGIN
  INSERT INTO ai_usage_metrics (
    organization_id,
    user_id,
    metric_type,
    operation,
    model_name,
    tokens_used,
    response_time_ms,
    cache_hit,
    success,
    error_message,
    metadata
  ) VALUES (
    p_organization_id,
    p_user_id,
    p_metric_type,
    p_operation,
    p_model_name,
    p_tokens_used,
    p_response_time_ms,
    p_cache_hit,
    p_success,
    p_error_message,
    p_metadata
  ) RETURNING id INTO v_metric_id;
  
  RETURN v_metric_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get AI usage stats
CREATE OR REPLACE FUNCTION get_ai_usage_stats(
  p_organization_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
) RETURNS TABLE (
  metric_type TEXT,
  total_requests BIGINT,
  total_tokens BIGINT,
  avg_response_time_ms NUMERIC,
  cache_hit_rate NUMERIC,
  error_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.metric_type,
    COUNT(*)::BIGINT AS total_requests,
    SUM(m.tokens_used)::BIGINT AS total_tokens,
    AVG(m.response_time_ms)::NUMERIC AS avg_response_time_ms,
    (COUNT(*) FILTER (WHERE m.cache_hit = TRUE)::NUMERIC / COUNT(*)::NUMERIC * 100) AS cache_hit_rate,
    (COUNT(*) FILTER (WHERE m.success = FALSE)::NUMERIC / COUNT(*)::NUMERIC * 100) AS error_rate
  FROM ai_usage_metrics m
  WHERE m.organization_id = p_organization_id
    AND m.created_at BETWEEN p_start_date AND p_end_date
  GROUP BY m.metric_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

