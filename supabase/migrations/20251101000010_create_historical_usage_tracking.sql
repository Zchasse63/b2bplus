-- Historical Usage Tracking and SKU Mapping Migration
-- Purpose: Track historical customer purchases from multiple systems (Bailey 2023-2024, Brokerage 2025)
-- Enable AI-powered analytics, opportunity detection, and customer retention insights

-- ============================================================================
-- 1. SKU Mapping Table
-- ============================================================================
-- Maps old SKUs (from Bailey) to current SKUs (from brokerage)
CREATE TABLE IF NOT EXISTS sku_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  old_sku TEXT NOT NULL,
  old_system TEXT NOT NULL, -- 'bailey', 'other'
  current_product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  current_sku TEXT NOT NULL,
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  mapping_method TEXT, -- 'ai_embedding', 'fuzzy_match', 'manual', 'exact'
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}', -- Store original product description, category, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(old_sku, old_system)
);

CREATE INDEX idx_sku_mappings_old_sku ON sku_mappings(old_sku);
CREATE INDEX idx_sku_mappings_current_product ON sku_mappings(current_product_id);
CREATE INDEX idx_sku_mappings_verified ON sku_mappings(verified);
CREATE INDEX idx_sku_mappings_confidence ON sku_mappings(confidence_score DESC);

-- ============================================================================
-- 2. Historical Orders Table
-- ============================================================================
-- Stores historical orders from previous systems (Bailey, brokerage)
CREATE TABLE IF NOT EXISTS historical_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  customer_company TEXT,
  order_number TEXT, -- Original order number from old system
  order_date DATE NOT NULL,
  source_system TEXT NOT NULL, -- 'bailey', 'brokerage_2025'
  total_amount DECIMAL(10,2),
  status TEXT DEFAULT 'completed',
  metadata JSONB DEFAULT '{}', -- Store any additional order info
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_historical_orders_customer ON historical_orders(customer_id);
CREATE INDEX idx_historical_orders_email ON historical_orders(customer_email);
CREATE INDEX idx_historical_orders_date ON historical_orders(order_date DESC);
CREATE INDEX idx_historical_orders_source ON historical_orders(source_system);

-- ============================================================================
-- 3. Historical Order Items Table
-- ============================================================================
-- Stores line items from historical orders
CREATE TABLE IF NOT EXISTS historical_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  historical_order_id UUID REFERENCES historical_orders(id) ON DELETE CASCADE,
  old_sku TEXT NOT NULL,
  product_description TEXT,
  current_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2),
  total_price DECIMAL(10,2),
  category TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_historical_items_order ON historical_order_items(historical_order_id);
CREATE INDEX idx_historical_items_sku ON historical_order_items(old_sku);
CREATE INDEX idx_historical_items_product ON historical_order_items(current_product_id);

-- ============================================================================
-- 4. Customer Purchase Analytics Table
-- ============================================================================
-- Aggregated view of customer purchase patterns (current + historical)
CREATE TABLE IF NOT EXISTS customer_purchase_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  first_purchase_date DATE,
  last_purchase_date DATE,
  total_orders INT DEFAULT 0,
  total_quantity DECIMAL(10,2) DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  avg_order_quantity DECIMAL(10,2),
  avg_order_value DECIMAL(10,2),
  purchase_frequency_days INT, -- Average days between purchases
  last_90_days_quantity DECIMAL(10,2) DEFAULT 0,
  last_90_days_revenue DECIMAL(10,2) DEFAULT 0,
  status TEXT, -- 'active', 'at_risk', 'churned', 'new'
  churn_risk_score DECIMAL(3,2), -- 0-1, calculated by AI
  opportunity_score DECIMAL(3,2), -- 0-1, calculated by AI
  metadata JSONB DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(customer_id, product_id)
);

CREATE INDEX idx_customer_analytics_customer ON customer_purchase_analytics(customer_id);
CREATE INDEX idx_customer_analytics_product ON customer_purchase_analytics(product_id);
CREATE INDEX idx_customer_analytics_status ON customer_purchase_analytics(status);
CREATE INDEX idx_customer_analytics_churn_risk ON customer_purchase_analytics(churn_risk_score DESC);
CREATE INDEX idx_customer_analytics_opportunity ON customer_purchase_analytics(opportunity_score DESC);
CREATE INDEX idx_customer_analytics_last_purchase ON customer_purchase_analytics(last_purchase_date DESC);

-- ============================================================================
-- 5. Product Usage Forecasts Table
-- ============================================================================
-- AI-generated forecasts for product usage by customer
CREATE TABLE IF NOT EXISTS product_usage_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  forecast_period TEXT NOT NULL, -- 'next_30_days', 'next_90_days', 'next_year'
  predicted_quantity DECIMAL(10,2),
  predicted_revenue DECIMAL(10,2),
  confidence_level DECIMAL(3,2), -- 0-1
  model_version TEXT,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(customer_id, product_id, forecast_period)
);

CREATE INDEX idx_forecasts_customer ON product_usage_forecasts(customer_id);
CREATE INDEX idx_forecasts_product ON product_usage_forecasts(product_id);
CREATE INDEX idx_forecasts_period ON product_usage_forecasts(forecast_period);

-- ============================================================================
-- 6. Customer Opportunities Table
-- ============================================================================
-- Tracks identified sales opportunities (products they stopped buying, cross-sell, etc.)
CREATE TABLE IF NOT EXISTS customer_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_type TEXT NOT NULL, -- 'stopped_buying', 'cross_sell', 'upsell', 'new_product'
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  related_product_id UUID REFERENCES products(id) ON DELETE SET NULL, -- For cross-sell
  opportunity_score DECIMAL(3,2), -- 0-1, AI-calculated
  predicted_revenue DECIMAL(10,2),
  reason TEXT, -- AI-generated explanation
  status TEXT DEFAULT 'open', -- 'open', 'contacted', 'won', 'lost', 'ignored'
  contacted_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_opportunities_customer ON customer_opportunities(customer_id);
CREATE INDEX idx_opportunities_type ON customer_opportunities(opportunity_type);
CREATE INDEX idx_opportunities_status ON customer_opportunities(status);
CREATE INDEX idx_opportunities_score ON customer_opportunities(opportunity_score DESC);
CREATE INDEX idx_opportunities_product ON customer_opportunities(product_id);

-- ============================================================================
-- 7. Pricing Optimization Suggestions Table
-- ============================================================================
-- AI-generated pricing recommendations based on customer behavior and market data
CREATE TABLE IF NOT EXISTS pricing_optimization_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  current_price DECIMAL(10,2),
  suggested_price DECIMAL(10,2),
  win_probability DECIMAL(3,2), -- 0-1, likelihood of closing at suggested price
  expected_revenue DECIMAL(10,2),
  reasoning TEXT, -- AI-generated explanation
  model_version TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'applied', 'rejected'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  applied_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_pricing_suggestions_customer ON pricing_optimization_suggestions(customer_id);
CREATE INDEX idx_pricing_suggestions_product ON pricing_optimization_suggestions(product_id);
CREATE INDEX idx_pricing_suggestions_status ON pricing_optimization_suggestions(status);
CREATE INDEX idx_pricing_suggestions_win_prob ON pricing_optimization_suggestions(win_probability DESC);

-- ============================================================================
-- Row-Level Security (RLS) Policies
-- ============================================================================

-- SKU Mappings: Admin only
ALTER TABLE sku_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view SKU mappings"
  ON sku_mappings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage SKU mappings"
  ON sku_mappings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );

-- Historical Orders: Admin can see all, customers can see their own
ALTER TABLE historical_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all historical orders"
  ON historical_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );

CREATE POLICY "Customers can view their historical orders"
  ON historical_orders FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

-- Historical Order Items: Same as orders
ALTER TABLE historical_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all historical order items"
  ON historical_order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );

CREATE POLICY "Customers can view their historical order items"
  ON historical_order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM historical_orders ho
      WHERE ho.id = historical_order_items.historical_order_id
      AND ho.customer_id = auth.uid()
    )
  );

-- Customer Purchase Analytics: Admin can see all, customers can see their own
ALTER TABLE customer_purchase_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all customer analytics"
  ON customer_purchase_analytics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );

CREATE POLICY "Customers can view their own analytics"
  ON customer_purchase_analytics FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

-- Product Usage Forecasts: Admin can see all, customers can see their own
ALTER TABLE product_usage_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all forecasts"
  ON product_usage_forecasts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );

CREATE POLICY "Customers can view their own forecasts"
  ON product_usage_forecasts FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

-- Customer Opportunities: Admin only
ALTER TABLE customer_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage opportunities"
  ON customer_opportunities FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );

-- Pricing Optimization: Admin only
ALTER TABLE pricing_optimization_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage pricing suggestions"
  ON pricing_optimization_suggestions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to calculate churn risk score
CREATE OR REPLACE FUNCTION calculate_churn_risk(
  customer_id_param UUID,
  product_id_param UUID
) RETURNS DECIMAL AS $$
DECLARE
  days_since_last_purchase INT;
  avg_frequency INT;
  risk_score DECIMAL;
BEGIN
  -- Get days since last purchase and average frequency
  SELECT 
    EXTRACT(DAY FROM NOW() - last_purchase_date)::INT,
    purchase_frequency_days
  INTO days_since_last_purchase, avg_frequency
  FROM customer_purchase_analytics
  WHERE customer_id = customer_id_param
    AND product_id = product_id_param;
  
  -- If no data, return 0
  IF days_since_last_purchase IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calculate risk score (0-1)
  -- Risk increases as days since last purchase exceeds average frequency
  IF avg_frequency IS NULL OR avg_frequency = 0 THEN
    risk_score := 0.5;
  ELSE
    risk_score := LEAST(1.0, days_since_last_purchase::DECIMAL / (avg_frequency * 2));
  END IF;
  
  RETURN risk_score;
END;
$$ LANGUAGE plpgsql;

-- Function to identify stopped purchases
CREATE OR REPLACE FUNCTION identify_stopped_purchases()
RETURNS TABLE (
  customer_id UUID,
  product_id UUID,
  last_purchase_date DATE,
  days_since_purchase INT,
  avg_frequency_days INT,
  total_historical_revenue DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cpa.customer_id,
    cpa.product_id,
    cpa.last_purchase_date,
    EXTRACT(DAY FROM NOW() - cpa.last_purchase_date)::INT as days_since_purchase,
    cpa.purchase_frequency_days,
    cpa.total_revenue
  FROM customer_purchase_analytics cpa
  WHERE cpa.last_purchase_date < NOW() - INTERVAL '90 days'
    AND cpa.total_orders >= 3 -- Only consider products they bought at least 3 times
    AND cpa.purchase_frequency_days IS NOT NULL
    AND EXTRACT(DAY FROM NOW() - cpa.last_purchase_date) > (cpa.purchase_frequency_days * 2)
  ORDER BY cpa.total_revenue DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION calculate_churn_risk TO authenticated;
GRANT EXECUTE ON FUNCTION identify_stopped_purchases TO authenticated;
