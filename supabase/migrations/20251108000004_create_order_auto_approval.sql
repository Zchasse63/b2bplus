-- Migration: Order Auto-Approval System
-- Description: Create tables and functions for intelligent order auto-approval workflows
-- Date: November 8, 2025

-- ============================================================================
-- 1. ORDER AUTO-APPROVAL RULES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS order_auto_approval_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Rule Details
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 100, -- Higher priority rules evaluated first
  
  -- Amount Limits
  max_order_amount DECIMAL(10,2), -- Maximum order total for auto-approval
  min_order_amount DECIMAL(10,2), -- Minimum order total (optional)
  
  -- Customer Criteria
  min_customer_lifetime_value DECIMAL(10,2), -- Minimum CLV required
  min_orders_count INTEGER, -- Minimum number of previous orders
  min_account_age_days INTEGER, -- Minimum days since customer account created
  trusted_customers_only BOOLEAN DEFAULT false, -- Only auto-approve trusted customers
  allowed_customer_ids UUID[], -- Whitelist of customer IDs
  blocked_customer_ids UUID[], -- Blacklist of customer IDs
  
  -- Payment Criteria
  require_payment_on_file BOOLEAN DEFAULT false, -- Must have payment method saved
  allowed_payment_methods TEXT[], -- e.g., ['credit_card', 'net_30']
  max_outstanding_balance DECIMAL(10,2), -- Maximum unpaid balance allowed
  
  -- Order Criteria
  require_all_items_in_stock BOOLEAN DEFAULT true,
  max_custom_items INTEGER DEFAULT 0, -- Maximum number of custom/special items
  allowed_shipping_methods TEXT[], -- Whitelist of shipping methods
  
  -- Risk Assessment
  min_risk_score DECIMAL(3,2), -- Minimum AI risk score (0.00 to 1.00)
  max_risk_score DECIMAL(3,2), -- Maximum AI risk score (0.00 to 1.00)
  
  -- Time-based Rules
  business_hours_only BOOLEAN DEFAULT false, -- Only auto-approve during business hours
  excluded_days TEXT[], -- Days to exclude (e.g., ['saturday', 'sunday'])
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_order_auto_approval_rules_active ON order_auto_approval_rules(is_active);
CREATE INDEX idx_order_auto_approval_rules_priority ON order_auto_approval_rules(priority DESC);

-- ============================================================================
-- 2. ORDER APPROVALS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS order_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Order Reference
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Approval Status
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN (
    'pending',
    'auto_approved',
    'manually_approved',
    'rejected',
    'cancelled'
  )),
  
  -- Auto-Approval Details
  auto_approval_eligible BOOLEAN DEFAULT false,
  auto_approval_reason TEXT,
  matched_rule_id UUID REFERENCES order_auto_approval_rules(id),
  matched_rule_name TEXT,
  
  -- Risk Assessment
  risk_score DECIMAL(3,2), -- 0.00 to 1.00 (AI-calculated)
  risk_factors JSONB DEFAULT '[]', -- Array of risk factors identified
  risk_assessment_details JSONB DEFAULT '{}',
  
  -- Manual Approval
  requires_manual_review BOOLEAN DEFAULT false,
  manual_review_reason TEXT,
  assigned_to UUID REFERENCES auth.users(id), -- Admin assigned to review
  
  -- Approval/Rejection
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Notifications
  notification_sent BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_order_approvals_order ON order_approvals(order_id);
CREATE INDEX idx_order_approvals_status ON order_approvals(approval_status);
CREATE INDEX idx_order_approvals_assigned_to ON order_approvals(assigned_to);
CREATE INDEX idx_order_approvals_pending ON order_approvals(approval_status, created_at) 
  WHERE approval_status = 'pending';

-- ============================================================================
-- 3. APPROVAL HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS approval_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  order_approval_id UUID NOT NULL REFERENCES order_approvals(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Action Details
  action TEXT NOT NULL CHECK (action IN (
    'created',
    'auto_approved',
    'manually_approved',
    'rejected',
    'assigned',
    'reassigned',
    'cancelled',
    'escalated'
  )),
  
  -- Actor
  performed_by UUID REFERENCES auth.users(id),
  performed_by_system BOOLEAN DEFAULT false, -- True if automated action
  
  -- Details
  notes TEXT,
  previous_status TEXT,
  new_status TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_approval_history_order_approval ON approval_history(order_approval_id);
CREATE INDEX idx_approval_history_order ON approval_history(order_id);
CREATE INDEX idx_approval_history_created_at ON approval_history(created_at DESC);

-- ============================================================================
-- 4. RLS POLICIES
-- ============================================================================

-- Order Auto-Approval Rules
ALTER TABLE order_auto_approval_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all auto-approval rules"
  ON order_auto_approval_rules FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert auto-approval rules"
  ON order_auto_approval_rules FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update auto-approval rules"
  ON order_auto_approval_rules FOR UPDATE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can delete auto-approval rules"
  ON order_auto_approval_rules FOR DELETE
  TO authenticated
  USING (is_admin());

-- Order Approvals
ALTER TABLE order_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all order approvals"
  ON order_approvals FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert order approvals"
  ON order_approvals FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update order approvals"
  ON order_approvals FOR UPDATE
  TO authenticated
  USING (is_admin());

-- Approval History
ALTER TABLE approval_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all approval history"
  ON approval_history FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert approval history"
  ON approval_history FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- ============================================================================
-- 5. HELPER FUNCTIONS
-- ============================================================================

-- Function to get pending approvals count
CREATE OR REPLACE FUNCTION get_pending_approvals_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM order_approvals
    WHERE approval_status = 'pending'
  );
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_pending_approvals_count TO authenticated;

-- Function to get approval statistics
CREATE OR REPLACE FUNCTION get_approval_statistics(
  p_from_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_to_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  total_orders INTEGER,
  auto_approved INTEGER,
  manually_approved INTEGER,
  rejected INTEGER,
  pending INTEGER,
  auto_approval_rate DECIMAL,
  avg_approval_time_hours DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_orders,
    COUNT(*) FILTER (WHERE approval_status = 'auto_approved')::INTEGER as auto_approved,
    COUNT(*) FILTER (WHERE approval_status = 'manually_approved')::INTEGER as manually_approved,
    COUNT(*) FILTER (WHERE approval_status = 'rejected')::INTEGER as rejected,
    COUNT(*) FILTER (WHERE approval_status = 'pending')::INTEGER as pending,
    (COUNT(*) FILTER (WHERE approval_status = 'auto_approved')::DECIMAL / 
     NULLIF(COUNT(*), 0) * 100)::DECIMAL as auto_approval_rate,
    AVG(
      EXTRACT(EPOCH FROM (
        COALESCE(approved_at, rejected_at, NOW()) - created_at
      )) / 3600
    )::DECIMAL as avg_approval_time_hours
  FROM order_approvals
  WHERE created_at >= p_from_date
    AND created_at <= p_to_date;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_approval_statistics TO authenticated;

-- ============================================================================
-- 6. TRIGGERS
-- ============================================================================

-- Updated_at trigger for order_auto_approval_rules
CREATE TRIGGER update_order_auto_approval_rules_updated_at
  BEFORE UPDATE ON order_auto_approval_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Updated_at trigger for order_approvals
CREATE TRIGGER update_order_approvals_updated_at
  BEFORE UPDATE ON order_approvals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to log approval history on status change
CREATE OR REPLACE FUNCTION log_approval_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.approval_status != NEW.approval_status) THEN
    INSERT INTO approval_history (
      order_approval_id,
      order_id,
      action,
      performed_by,
      performed_by_system,
      previous_status,
      new_status,
      notes
    ) VALUES (
      NEW.id,
      NEW.order_id,
      CASE NEW.approval_status
        WHEN 'auto_approved' THEN 'auto_approved'
        WHEN 'manually_approved' THEN 'manually_approved'
        WHEN 'rejected' THEN 'rejected'
        WHEN 'cancelled' THEN 'cancelled'
        ELSE 'created'
      END,
      COALESCE(NEW.approved_by, NEW.rejected_by),
      NEW.approval_status = 'auto_approved',
      OLD.approval_status,
      NEW.approval_status,
      COALESCE(NEW.auto_approval_reason, NEW.rejection_reason)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_order_approval_status_change
  AFTER UPDATE ON order_approvals
  FOR EACH ROW
  EXECUTE FUNCTION log_approval_status_change();

-- ============================================================================
-- 7. COMMENTS
-- ============================================================================

COMMENT ON TABLE order_auto_approval_rules IS 'Configurable rules for automatic order approval';
COMMENT ON TABLE order_approvals IS 'Order approval tracking with auto-approval and manual review';
COMMENT ON TABLE approval_history IS 'Audit log of all approval actions and status changes';

COMMENT ON FUNCTION get_pending_approvals_count IS 'Get count of orders pending approval';
COMMENT ON FUNCTION get_approval_statistics IS 'Get approval metrics and statistics for a date range';

