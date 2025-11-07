-- Migration: Email Processing System
-- Description: Create tables for AI-powered email classification, routing, and auto-response
-- Date: November 8, 2025

-- ============================================================================
-- 1. PROCESSED EMAILS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS processed_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Email Metadata
  email_id TEXT UNIQUE NOT NULL, -- External email ID from provider
  message_id TEXT, -- RFC 822 Message-ID
  thread_id TEXT, -- Email thread identifier
  
  -- Email Content
  from_address TEXT NOT NULL,
  to_addresses TEXT[] NOT NULL,
  cc_addresses TEXT[],
  subject TEXT NOT NULL,
  body_text TEXT,
  body_html TEXT,
  attachments JSONB DEFAULT '[]',
  
  -- AI Classification
  classification TEXT NOT NULL CHECK (classification IN (
    'order_inquiry',
    'quote_request',
    'support_request',
    'complaint',
    'invoice_question',
    'shipping_inquiry',
    'product_question',
    'partnership',
    'spam',
    'other'
  )),
  classification_confidence DECIMAL(3,2),
  classification_reasoning TEXT,
  
  -- Sentiment Analysis
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  sentiment_score DECIMAL(3,2), -- -1.0 to 1.0
  urgency_level TEXT CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
  
  -- Entity Extraction
  extracted_entities JSONB DEFAULT '{}', -- organization_id, order_id, product_ids, etc.
  organization_id UUID REFERENCES organizations(id),
  order_id UUID REFERENCES orders(id),
  
  -- Processing Status
  processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN (
    'pending',
    'processing',
    'completed',
    'failed',
    'requires_human'
  )),
  processing_error TEXT,
  
  -- Auto-Response
  auto_response_sent BOOLEAN DEFAULT false,
  auto_response_content TEXT,
  auto_response_sent_at TIMESTAMPTZ,
  
  -- Routing
  routed_to TEXT, -- Department or team
  assigned_to UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ,
  
  -- Actions Taken
  actions_taken JSONB DEFAULT '[]', -- Array of automated actions
  requires_followup BOOLEAN DEFAULT false,
  followup_reason TEXT,
  
  -- Metadata
  received_at TIMESTAMPTZ NOT NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_processed_emails_email_id ON processed_emails(email_id);
CREATE INDEX idx_processed_emails_classification ON processed_emails(classification);
CREATE INDEX idx_processed_emails_status ON processed_emails(processing_status);
CREATE INDEX idx_processed_emails_organization ON processed_emails(organization_id);
CREATE INDEX idx_processed_emails_order ON processed_emails(order_id);
CREATE INDEX idx_processed_emails_assigned_to ON processed_emails(assigned_to);
CREATE INDEX idx_processed_emails_received_at ON processed_emails(received_at DESC);
CREATE INDEX idx_processed_emails_pending ON processed_emails(processing_status, received_at) 
  WHERE processing_status = 'pending';

-- ============================================================================
-- 2. EMAIL ROUTING RULES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Rule Details
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 100,
  
  -- Matching Criteria
  classification_types TEXT[], -- Match specific classifications
  min_urgency_level TEXT, -- Minimum urgency level
  keywords TEXT[], -- Keywords to match in subject/body
  from_domains TEXT[], -- Match sender domains
  
  -- Routing Action
  route_to_department TEXT,
  assign_to_user UUID REFERENCES auth.users(id),
  auto_respond BOOLEAN DEFAULT false,
  auto_response_template TEXT,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_email_routing_rules_active ON email_routing_rules(is_active);
CREATE INDEX idx_email_routing_rules_priority ON email_routing_rules(priority DESC);

-- ============================================================================
-- 3. EMAIL AUTO-RESPONSE TEMPLATES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_auto_response_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Template Details
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Trigger Conditions
  classification_type TEXT NOT NULL,
  urgency_levels TEXT[], -- Which urgency levels to use this template for
  
  -- Template Content
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL, -- Supports variables like {{customer_name}}, {{order_id}}
  
  -- AI Enhancement
  use_ai_personalization BOOLEAN DEFAULT true, -- Use AI to personalize response
  tone TEXT DEFAULT 'professional' CHECK (tone IN ('professional', 'friendly', 'formal', 'casual')),
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_email_templates_active ON email_auto_response_templates(is_active);
CREATE INDEX idx_email_templates_classification ON email_auto_response_templates(classification_type);

-- ============================================================================
-- 4. EMAIL ACTIONS LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_actions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  email_id UUID NOT NULL REFERENCES processed_emails(id) ON DELETE CASCADE,
  
  -- Action Details
  action_type TEXT NOT NULL CHECK (action_type IN (
    'classified',
    'routed',
    'assigned',
    'auto_responded',
    'created_order',
    'created_quote',
    'created_ticket',
    'updated_customer',
    'sent_notification',
    'escalated',
    'archived'
  )),
  
  -- Action Result
  success BOOLEAN NOT NULL,
  error_message TEXT,
  action_details JSONB DEFAULT '{}',
  
  -- Actor
  performed_by UUID REFERENCES auth.users(id),
  performed_by_system BOOLEAN DEFAULT true,
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_email_actions_email ON email_actions_log(email_id);
CREATE INDEX idx_email_actions_type ON email_actions_log(action_type);
CREATE INDEX idx_email_actions_created_at ON email_actions_log(created_at DESC);

-- ============================================================================
-- 5. RLS POLICIES
-- ============================================================================

-- Processed Emails
ALTER TABLE processed_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all processed emails"
  ON processed_emails FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert processed emails"
  ON processed_emails FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update processed emails"
  ON processed_emails FOR UPDATE
  TO authenticated
  USING (is_admin());

-- Email Routing Rules
ALTER TABLE email_routing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage routing rules"
  ON email_routing_rules FOR ALL
  TO authenticated
  USING (is_admin());

-- Email Auto-Response Templates
ALTER TABLE email_auto_response_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage auto-response templates"
  ON email_auto_response_templates FOR ALL
  TO authenticated
  USING (is_admin());

-- Email Actions Log
ALTER TABLE email_actions_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view email actions log"
  ON email_actions_log FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert email actions"
  ON email_actions_log FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Function to get email processing statistics
CREATE OR REPLACE FUNCTION get_email_processing_statistics(
  p_from_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_to_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  total_emails INTEGER,
  auto_responded INTEGER,
  requires_human INTEGER,
  avg_processing_time_seconds DECIMAL,
  by_classification JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_emails,
    COUNT(*) FILTER (WHERE auto_response_sent = true)::INTEGER as auto_responded,
    COUNT(*) FILTER (WHERE processing_status = 'requires_human')::INTEGER as requires_human,
    AVG(EXTRACT(EPOCH FROM (processed_at - received_at)))::DECIMAL as avg_processing_time_seconds,
    jsonb_object_agg(
      classification,
      count
    ) as by_classification
  FROM processed_emails
  LEFT JOIN LATERAL (
    SELECT classification, COUNT(*)::INTEGER as count
    FROM processed_emails
    WHERE received_at >= p_from_date AND received_at <= p_to_date
    GROUP BY classification
  ) counts ON true
  WHERE received_at >= p_from_date
    AND received_at <= p_to_date;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_email_processing_statistics TO authenticated;

-- ============================================================================
-- 7. TRIGGERS
-- ============================================================================

-- Updated_at triggers
CREATE TRIGGER update_processed_emails_updated_at
  BEFORE UPDATE ON processed_emails
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_routing_rules_updated_at
  BEFORE UPDATE ON email_routing_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_auto_response_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. COMMENTS
-- ============================================================================

COMMENT ON TABLE processed_emails IS 'AI-processed incoming emails with classification and routing';
COMMENT ON TABLE email_routing_rules IS 'Rules for automatic email routing and assignment';
COMMENT ON TABLE email_auto_response_templates IS 'Templates for automated email responses';
COMMENT ON TABLE email_actions_log IS 'Audit log of all automated email actions';

