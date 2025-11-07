-- ============================================================================
-- Add Missing RLS Policies for AI and Security Features
-- Created: 2025-11-06
-- Purpose: Phase 1 - Foundation & Security
-- ============================================================================
-- This migration creates new tables needed for AI features and adds RLS policies
-- to ensure proper data isolation and security.
-- ============================================================================

-- ============================================================================
-- 1. AI USAGE LOGS TABLE
-- ============================================================================
-- Track AI endpoint usage for monitoring and billing
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  
  -- Request Details
  endpoint TEXT NOT NULL,
  request_method TEXT DEFAULT 'POST',
  
  -- AI Usage Metrics
  tokens_used INTEGER,
  cost_usd DECIMAL(10,4),
  model_version TEXT,
  
  -- Performance Metrics
  response_time_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  
  -- Metadata
  request_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_usage_logs_user ON ai_usage_logs(user_id);
CREATE INDEX idx_ai_usage_logs_org ON ai_usage_logs(organization_id);
CREATE INDEX idx_ai_usage_logs_endpoint ON ai_usage_logs(endpoint);
CREATE INDEX idx_ai_usage_logs_created ON ai_usage_logs(created_at DESC);
CREATE INDEX idx_ai_usage_logs_success ON ai_usage_logs(success);

-- Enable RLS
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_usage_logs
-- Admins can view all AI usage logs
CREATE POLICY "Admins can view all AI usage logs"
  ON ai_usage_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'super_admin', 'owner')
    )
  );

-- Users can view their own AI usage logs
CREATE POLICY "Users can view their own AI usage logs"
  ON ai_usage_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- System can insert AI usage logs (service role bypasses RLS)
CREATE POLICY "System can insert AI usage logs"
  ON ai_usage_logs FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- 2. CHATBOT CONVERSATIONS TABLE
-- ============================================================================
-- Store AI chatbot conversation history
CREATE TABLE IF NOT EXISTS chatbot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Conversation Details
  session_id TEXT NOT NULL,
  message_role TEXT NOT NULL CHECK (message_role IN ('user', 'assistant', 'system')),
  message_content TEXT NOT NULL,
  
  -- Context
  context_data JSONB DEFAULT '{}', -- Store cart, recent orders, etc.
  
  -- AI Metadata
  model_version TEXT,
  tokens_used INTEGER,
  confidence_score DECIMAL(3,2),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chatbot_conversations_user ON chatbot_conversations(user_id);
CREATE INDEX idx_chatbot_conversations_org ON chatbot_conversations(organization_id);
CREATE INDEX idx_chatbot_conversations_session ON chatbot_conversations(session_id);
CREATE INDEX idx_chatbot_conversations_created ON chatbot_conversations(created_at DESC);

-- Enable RLS
ALTER TABLE chatbot_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chatbot_conversations
-- Admins can view all conversations
CREATE POLICY "Admins can view all chatbot conversations"
  ON chatbot_conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'super_admin', 'owner')
    )
  );

-- Users can view their own conversations
CREATE POLICY "Users can view their own chatbot conversations"
  ON chatbot_conversations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own conversations
CREATE POLICY "Users can insert their own chatbot conversations"
  ON chatbot_conversations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- System can insert conversations (for assistant responses)
CREATE POLICY "System can insert chatbot conversations"
  ON chatbot_conversations FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- 3. REORDER NOTIFICATIONS TABLE
-- ============================================================================
-- Predictive reorder alerts for customers
CREATE TABLE IF NOT EXISTS reorder_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  
  -- Notification Details
  notification_type TEXT NOT NULL DEFAULT 'reorder_reminder' CHECK (
    notification_type IN ('reorder_reminder', 'low_stock_alert', 'price_drop', 'new_product')
  ),
  
  -- Prediction Data
  predicted_reorder_date DATE,
  predicted_quantity DECIMAL(10,2),
  confidence_level DECIMAL(3,2), -- 0-1
  
  -- Notification Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'sent', 'viewed', 'acted_on', 'dismissed', 'expired')
  ),
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  acted_on_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  
  -- Notification Content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reorder_notifications_user ON reorder_notifications(user_id);
CREATE INDEX idx_reorder_notifications_org ON reorder_notifications(organization_id);
CREATE INDEX idx_reorder_notifications_product ON reorder_notifications(product_id);
CREATE INDEX idx_reorder_notifications_status ON reorder_notifications(status);
CREATE INDEX idx_reorder_notifications_type ON reorder_notifications(notification_type);
CREATE INDEX idx_reorder_notifications_created ON reorder_notifications(created_at DESC);

-- Enable RLS
ALTER TABLE reorder_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reorder_notifications
-- Admins can view all notifications
CREATE POLICY "Admins can view all reorder notifications"
  ON reorder_notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'super_admin', 'owner')
    )
  );

-- Users can view their own notifications
CREATE POLICY "Users can view their own reorder notifications"
  ON reorder_notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can update their own notifications (mark as viewed, dismissed, etc.)
CREATE POLICY "Users can update their own reorder notifications"
  ON reorder_notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- System can insert notifications
CREATE POLICY "System can insert reorder notifications"
  ON reorder_notifications FOR INSERT
  WITH CHECK (true);

-- Admins can manage all notifications
CREATE POLICY "Admins can manage all reorder notifications"
  ON reorder_notifications FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'super_admin', 'owner')
    )
  );

-- ============================================================================
-- 4. PRICING RECOMMENDATIONS TABLE
-- ============================================================================
-- Dynamic pricing suggestions (different from pricing_optimization_suggestions)
CREATE TABLE IF NOT EXISTS pricing_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  
  -- Recommendation Details
  recommendation_type TEXT NOT NULL CHECK (
    recommendation_type IN ('dynamic_pricing', 'volume_discount', 'seasonal_adjustment', 'competitive_match')
  ),
  
  -- Pricing Data
  current_price DECIMAL(10,2) NOT NULL,
  recommended_price DECIMAL(10,2) NOT NULL,
  price_change_percentage DECIMAL(5,2),
  
  -- Justification
  reasoning TEXT,
  confidence_score DECIMAL(3,2), -- 0-1
  expected_impact TEXT, -- Expected revenue/margin impact
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'rejected', 'applied', 'expired')
  ),
  
  -- Validity
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  
  -- Approval
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pricing_recommendations_product ON pricing_recommendations(product_id);
CREATE INDEX idx_pricing_recommendations_org ON pricing_recommendations(organization_id);
CREATE INDEX idx_pricing_recommendations_status ON pricing_recommendations(status);
CREATE INDEX idx_pricing_recommendations_type ON pricing_recommendations(recommendation_type);
CREATE INDEX idx_pricing_recommendations_created ON pricing_recommendations(created_at DESC);

-- Enable RLS
ALTER TABLE pricing_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pricing_recommendations
-- Admins can view all pricing recommendations
CREATE POLICY "Admins can view all pricing recommendations"
  ON pricing_recommendations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'super_admin', 'owner')
    )
  );

-- Admins can manage all pricing recommendations
CREATE POLICY "Admins can manage all pricing recommendations"
  ON pricing_recommendations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'super_admin', 'owner')
    )
  );

-- System can insert pricing recommendations
CREATE POLICY "System can insert pricing recommendations"
  ON pricing_recommendations FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Trigger for reorder_notifications
CREATE TRIGGER update_reorder_notifications_updated_at
  BEFORE UPDATE ON reorder_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for pricing_recommendations
CREATE TRIGGER update_pricing_recommendations_updated_at
  BEFORE UPDATE ON pricing_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on tables to authenticated users
GRANT SELECT ON ai_usage_logs TO authenticated;
GRANT SELECT ON chatbot_conversations TO authenticated;
GRANT SELECT, UPDATE ON reorder_notifications TO authenticated;
GRANT SELECT ON pricing_recommendations TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE ai_usage_logs IS 'Tracks AI endpoint usage for monitoring and billing';
COMMENT ON TABLE chatbot_conversations IS 'Stores AI chatbot conversation history with proper data isolation';
COMMENT ON TABLE reorder_notifications IS 'Predictive reorder alerts for customers based on purchase patterns';
COMMENT ON TABLE pricing_recommendations IS 'Dynamic pricing suggestions for products';

