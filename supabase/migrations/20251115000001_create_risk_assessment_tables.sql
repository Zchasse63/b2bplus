-- ============================================================================
-- Risk Assessment Tables for Order Auto-Approval
-- Created: 2025-11-15
-- Purpose: Track payment failures, returns, and disputes for fraud detection
-- ============================================================================

-- ============================================================================
-- PAYMENT FAILURES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  payment_method VARCHAR(50),
  failure_reason VARCHAR(255),
  amount DECIMAL(10, 2),
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_payment_failures_customer_id ON payment_failures(customer_id);
CREATE INDEX idx_payment_failures_organization_id ON payment_failures(organization_id);
CREATE INDEX idx_payment_failures_order_id ON payment_failures(order_id);
CREATE INDEX idx_payment_failures_attempted_at ON payment_failures(attempted_at);

-- ============================================================================
-- ORDER RETURNS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS order_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  return_reason VARCHAR(255),
  return_status VARCHAR(50) DEFAULT 'initiated', -- initiated, approved, rejected, completed
  return_amount DECIMAL(10, 2),
  initiated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_order_returns_order_id ON order_returns(order_id);
CREATE INDEX idx_order_returns_customer_id ON order_returns(customer_id);
CREATE INDEX idx_order_returns_organization_id ON order_returns(organization_id);
CREATE INDEX idx_order_returns_status ON order_returns(return_status);
CREATE INDEX idx_order_returns_initiated_at ON order_returns(initiated_at);

-- ============================================================================
-- CUSTOMER DISPUTES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS customer_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  dispute_reason VARCHAR(255),
  dispute_type VARCHAR(50), -- chargeback, quality, shipping, other
  dispute_status VARCHAR(50) DEFAULT 'opened', -- opened, under_review, resolved, lost
  dispute_amount DECIMAL(10, 2),
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_customer_disputes_order_id ON customer_disputes(order_id);
CREATE INDEX idx_customer_disputes_customer_id ON customer_disputes(customer_id);
CREATE INDEX idx_customer_disputes_organization_id ON customer_disputes(organization_id);
CREATE INDEX idx_customer_disputes_status ON customer_disputes(dispute_status);
CREATE INDEX idx_customer_disputes_type ON customer_disputes(dispute_type);
CREATE INDEX idx_customer_disputes_opened_at ON customer_disputes(opened_at);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE payment_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_disputes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES FOR PAYMENT FAILURES
-- ============================================================================

-- Admins can view all payment failures
CREATE POLICY "Admins can view all payment failures" ON payment_failures
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = payment_failures.organization_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'owner', 'super_admin')
    )
  );

-- Admins can insert payment failures
CREATE POLICY "Admins can insert payment failures" ON payment_failures
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = payment_failures.organization_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'owner', 'super_admin')
    )
  );

-- ============================================================================
-- RLS POLICIES FOR ORDER RETURNS
-- ============================================================================

-- Customers can view their own returns
CREATE POLICY "Customers can view their own returns" ON order_returns
  FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

-- Admins can view returns for their organization
CREATE POLICY "Admins can view returns" ON order_returns
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = order_returns.organization_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'owner', 'super_admin')
    )
  );

-- Customers can insert returns for their orders
CREATE POLICY "Customers can insert returns" ON order_returns
  FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM orders
      WHERE id = order_returns.order_id
      AND customer_id = auth.uid()
    )
  );

-- Admins can insert returns
CREATE POLICY "Admins can insert returns" ON order_returns
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = order_returns.organization_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'owner', 'super_admin')
    )
  );

-- ============================================================================
-- RLS POLICIES FOR CUSTOMER DISPUTES
-- ============================================================================

-- Customers can view their own disputes
CREATE POLICY "Customers can view their own disputes" ON customer_disputes
  FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

-- Admins can view disputes for their organization
CREATE POLICY "Admins can view disputes" ON customer_disputes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = customer_disputes.organization_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'owner', 'super_admin')
    )
  );

-- Customers can insert disputes for their orders
CREATE POLICY "Customers can insert disputes" ON customer_disputes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM orders
      WHERE id = customer_disputes.order_id
      AND customer_id = auth.uid()
    )
  );

-- Admins can insert disputes
CREATE POLICY "Admins can insert disputes" ON customer_disputes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = customer_disputes.organization_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'owner', 'super_admin')
    )
  );

-- ============================================================================
-- HELPER FUNCTION: Get customer risk metrics
-- ============================================================================

CREATE OR REPLACE FUNCTION get_customer_risk_metrics(p_customer_id UUID)
RETURNS TABLE (
  payment_failures_count INTEGER,
  returns_count INTEGER,
  disputes_count INTEGER,
  total_disputed_amount DECIMAL,
  chargeback_count INTEGER,
  recent_failures_7days INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(COUNT(DISTINCT pf.id), 0)::INTEGER as payment_failures_count,
    COALESCE(COUNT(DISTINCT r.id), 0)::INTEGER as returns_count,
    COALESCE(COUNT(DISTINCT d.id), 0)::INTEGER as disputes_count,
    COALESCE(SUM(d.dispute_amount), 0)::DECIMAL as total_disputed_amount,
    COALESCE(COUNT(DISTINCT CASE WHEN d.dispute_type = 'chargeback' THEN d.id END), 0)::INTEGER as chargeback_count,
    COALESCE(COUNT(DISTINCT CASE WHEN pf.attempted_at > now() - interval '7 days' THEN pf.id END), 0)::INTEGER as recent_failures_7days
  FROM profiles p
  LEFT JOIN payment_failures pf ON p.id = pf.customer_id
  LEFT JOIN order_returns r ON p.id = r.customer_id
  LEFT JOIN customer_disputes d ON p.id = d.customer_id
  WHERE p.id = p_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION: Calculate customer risk score
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_customer_risk_score(p_customer_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_payment_failures_count INTEGER;
  v_returns_count INTEGER;
  v_disputes_count INTEGER;
  v_total_orders INTEGER;
  v_chargeback_count INTEGER;
  v_risk_score DECIMAL := 0;
BEGIN
  -- Get risk metrics
  SELECT
    COALESCE(COUNT(DISTINCT pf.id), 0),
    COALESCE(COUNT(DISTINCT r.id), 0),
    COALESCE(COUNT(DISTINCT d.id), 0),
    COALESCE(SUM(CASE WHEN d.dispute_type = 'chargeback' THEN 1 ELSE 0 END), 0)
  INTO
    v_payment_failures_count,
    v_returns_count,
    v_disputes_count,
    v_chargeback_count
  FROM profiles p
  LEFT JOIN payment_failures pf ON p.id = pf.customer_id
  LEFT JOIN order_returns r ON p.id = r.customer_id
  LEFT JOIN customer_disputes d ON p.id = d.customer_id
  WHERE p.id = p_customer_id;

  -- Get total orders
  SELECT COUNT(*) INTO v_total_orders FROM orders WHERE customer_id = p_customer_id;

  -- Calculate risk score (0 to 1)
  -- Payment failures: 0.2 per failure (max 0.4)
  v_risk_score := v_risk_score + LEAST(v_payment_failures_count * 0.2, 0.4);

  -- High return rate: if returns > 30% of orders, add 0.3
  IF v_total_orders > 0 AND (v_returns_count::DECIMAL / v_total_orders) > 0.3 THEN
    v_risk_score := v_risk_score + 0.3;
  END IF;

  -- Chargebacks are serious: 0.3 per chargeback (max 0.6)
  v_risk_score := v_risk_score + LEAST(v_chargeback_count * 0.3, 0.6);

  -- Other disputes: 0.1 per dispute (max 0.3)
  v_risk_score := v_risk_score + LEAST((v_disputes_count - v_chargeback_count) * 0.1, 0.3);

  -- Cap at 1.0
  RETURN LEAST(v_risk_score, 1.0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON payment_failures TO authenticated;
GRANT SELECT ON order_returns TO authenticated;
GRANT SELECT ON customer_disputes TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_risk_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_customer_risk_score TO authenticated;
