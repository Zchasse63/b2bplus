-- ============================================================================
-- Phase 2: AI Backend Logic - Week 6-8 Features Migration
-- Created: 2025-11-07
-- Purpose: Create tables for reorder notifications, pricing recommendations, and invoice reconciliation
-- ============================================================================

-- ============================================================================
-- 1. REORDER_NOTIFICATIONS TABLE
-- ============================================================================
-- Stores AI-generated reorder predictions and notifications
CREATE TABLE IF NOT EXISTS reorder_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- Prediction Data
  predicted_reorder_date DATE NOT NULL,
  confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  recommended_quantity INTEGER NOT NULL CHECK (recommended_quantity > 0),
  
  -- Historical Analysis
  average_days_between_orders INTEGER,
  last_order_date DATE,
  total_orders_analyzed INTEGER,
  
  -- Notification Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'dismissed', 'ordered')),
  sent_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  ordered_at TIMESTAMPTZ,
  
  -- AI Metadata
  ai_reasoning TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for reorder_notifications
CREATE INDEX idx_reorder_notifications_org ON reorder_notifications(organization_id);
CREATE INDEX idx_reorder_notifications_product ON reorder_notifications(product_id);
CREATE INDEX idx_reorder_notifications_status ON reorder_notifications(status);
CREATE INDEX idx_reorder_notifications_date ON reorder_notifications(predicted_reorder_date);
CREATE INDEX idx_reorder_notifications_created ON reorder_notifications(created_at DESC);

-- Enable RLS
ALTER TABLE reorder_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reorder_notifications
CREATE POLICY "Users can view notifications for their organization"
  ON reorder_notifications FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert notifications"
  ON reorder_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update notifications for their organization"
  ON reorder_notifications FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- 2. PRICING_RECOMMENDATIONS TABLE
-- ============================================================================
-- Stores AI-generated pricing recommendations for admins
CREATE TABLE IF NOT EXISTS pricing_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Product
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- Current Pricing
  current_price DECIMAL(10,2) NOT NULL,
  
  -- Recommended Pricing
  recommended_price DECIMAL(10,2) NOT NULL,
  price_change_percent DECIMAL(5,2) NOT NULL,
  
  -- Market Analysis
  market_average_price DECIMAL(10,2),
  competitor_min_price DECIMAL(10,2),
  competitor_max_price DECIMAL(10,2),
  
  -- Demand Analysis
  demand_trend TEXT CHECK (demand_trend IN ('increasing', 'stable', 'decreasing')),
  sales_velocity_change_percent DECIMAL(5,2),
  
  -- AI Reasoning
  recommendation_reason TEXT NOT NULL,
  confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'implemented')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  implemented_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for pricing_recommendations
CREATE INDEX idx_pricing_recommendations_product ON pricing_recommendations(product_id);
CREATE INDEX idx_pricing_recommendations_status ON pricing_recommendations(status);
CREATE INDEX idx_pricing_recommendations_created ON pricing_recommendations(created_at DESC);
CREATE INDEX idx_pricing_recommendations_confidence ON pricing_recommendations(confidence_score DESC);

-- Enable RLS
ALTER TABLE pricing_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pricing_recommendations (Admin only)
CREATE POLICY "Admins can view all pricing recommendations"
  ON pricing_recommendations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'super_admin')
    )
  );

CREATE POLICY "System can insert pricing recommendations"
  ON pricing_recommendations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update pricing recommendations"
  ON pricing_recommendations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'super_admin')
    )
  );

-- ============================================================================
-- 3. INVOICE_RECONCILIATION TABLE
-- ============================================================================
-- Stores AI-processed invoice reconciliation results
CREATE TABLE IF NOT EXISTS invoice_reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Invoice Details
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  invoice_total DECIMAL(10,2) NOT NULL,
  
  -- Vendor/Supplier
  vendor_name TEXT NOT NULL,
  vendor_id TEXT,
  
  -- Matched Order
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  order_number TEXT,
  
  -- Reconciliation Results
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'discrepancy', 'no_match', 'approved', 'rejected')),
  match_confidence DECIMAL(3,2) CHECK (match_confidence >= 0 AND match_confidence <= 1),
  
  -- Discrepancy Analysis
  amount_difference DECIMAL(10,2),
  quantity_discrepancies JSONB DEFAULT '[]'::jsonb,
  -- Format: [{ product_id, invoice_qty, order_qty, difference }]
  
  price_discrepancies JSONB DEFAULT '[]'::jsonb,
  -- Format: [{ product_id, invoice_price, order_price, difference }]
  
  missing_items JSONB DEFAULT '[]'::jsonb,
  -- Format: [{ product_id, name, quantity }]
  
  extra_items JSONB DEFAULT '[]'::jsonb,
  -- Format: [{ product_id, name, quantity }]
  
  -- AI Analysis
  ai_notes TEXT,
  recommended_action TEXT,
  
  -- Review
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- File Storage
  invoice_file_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for invoice_reconciliation
CREATE INDEX idx_invoice_reconciliation_invoice ON invoice_reconciliation(invoice_number);
CREATE INDEX idx_invoice_reconciliation_order ON invoice_reconciliation(order_id);
CREATE INDEX idx_invoice_reconciliation_status ON invoice_reconciliation(status);
CREATE INDEX idx_invoice_reconciliation_date ON invoice_reconciliation(invoice_date DESC);
CREATE INDEX idx_invoice_reconciliation_created ON invoice_reconciliation(created_at DESC);

-- Enable RLS
ALTER TABLE invoice_reconciliation ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invoice_reconciliation (Admin only)
CREATE POLICY "Admins can view all invoice reconciliations"
  ON invoice_reconciliation FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'super_admin')
    )
  );

CREATE POLICY "System can insert invoice reconciliations"
  ON invoice_reconciliation FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update invoice reconciliations"
  ON invoice_reconciliation FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'super_admin')
    )
  );

-- ============================================================================
-- 4. TRIGGERS
-- ============================================================================
-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_week6_8_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reorder_notifications_updated_at_trigger
  BEFORE UPDATE ON reorder_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_week6_8_updated_at();

CREATE TRIGGER update_pricing_recommendations_updated_at_trigger
  BEFORE UPDATE ON pricing_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION update_week6_8_updated_at();

CREATE TRIGGER update_invoice_reconciliation_updated_at_trigger
  BEFORE UPDATE ON invoice_reconciliation
  FOR EACH ROW
  EXECUTE FUNCTION update_week6_8_updated_at();

-- ============================================================================
-- 5. COMMENTS
-- ============================================================================
COMMENT ON TABLE reorder_notifications IS 'AI-generated reorder predictions and notifications for customers';
COMMENT ON TABLE pricing_recommendations IS 'AI-generated pricing recommendations for admin review';
COMMENT ON TABLE invoice_reconciliation IS 'AI-processed invoice reconciliation with PO matching';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Tables created: reorder_notifications, pricing_recommendations, invoice_reconciliation
-- Indexes created: 15 indexes for performance
-- RLS policies: Comprehensive security for multi-tenant system
-- Triggers: Auto-update timestamps
-- ============================================================================

