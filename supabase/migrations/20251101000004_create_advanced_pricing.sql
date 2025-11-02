-- Migration: Create advanced pricing system
-- Description: Customer-specific pricing, volume discounts, and pricing tiers

-- Pricing tiers (Bronze, Silver, Gold, Platinum, etc.)
CREATE TABLE IF NOT EXISTS pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_percentage DECIMAL(5,2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  priority INTEGER DEFAULT 0, -- Higher priority = applied first
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer tier assignments
CREATE TABLE IF NOT EXISTS customer_pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  tier_id UUID REFERENCES pricing_tiers(id) ON DELETE CASCADE,
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(customer_id, tier_id, effective_from)
);

-- Customer-specific product pricing (overrides tier pricing)
CREATE TABLE IF NOT EXISTS customer_product_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  custom_price DECIMAL(10,2) NOT NULL CHECK (custom_price >= 0),
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(customer_id, product_id, effective_from)
);

-- Volume discounts (quantity-based pricing)
CREATE TABLE IF NOT EXISTS volume_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  min_quantity INTEGER NOT NULL CHECK (min_quantity > 0),
  max_quantity INTEGER CHECK (max_quantity IS NULL OR max_quantity >= min_quantity),
  discount_percentage DECIMAL(5,2) CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  discount_amount DECIMAL(10,2) CHECK (discount_amount >= 0),
  is_active BOOLEAN DEFAULT true,
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (
    (discount_percentage IS NOT NULL AND discount_amount IS NULL) OR
    (discount_percentage IS NULL AND discount_amount IS NOT NULL)
  )
);

-- Category-level pricing tiers (apply discount to entire categories)
CREATE TABLE IF NOT EXISTS category_pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id UUID REFERENCES pricing_tiers(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  discount_percentage DECIMAL(5,2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tier_id, category)
);

-- Indexes for performance
CREATE INDEX idx_customer_pricing_tiers_customer ON customer_pricing_tiers(customer_id);
CREATE INDEX idx_customer_pricing_tiers_tier ON customer_pricing_tiers(tier_id);
CREATE INDEX idx_customer_pricing_tiers_dates ON customer_pricing_tiers(effective_from, effective_to);

CREATE INDEX idx_customer_product_pricing_customer ON customer_product_pricing(customer_id);
CREATE INDEX idx_customer_product_pricing_product ON customer_product_pricing(product_id);
CREATE INDEX idx_customer_product_pricing_dates ON customer_product_pricing(effective_from, effective_to);

CREATE INDEX idx_volume_discounts_product ON volume_discounts(product_id);
CREATE INDEX idx_volume_discounts_quantity ON volume_discounts(min_quantity, max_quantity);

-- Enable RLS
ALTER TABLE pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_product_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE volume_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_pricing_tiers ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Pricing tiers: Everyone can view active tiers
CREATE POLICY "Anyone can view active pricing tiers"
  ON pricing_tiers FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Admins can manage pricing tiers
CREATE POLICY "Admins can manage pricing tiers"
  ON pricing_tiers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'super_admin')
    )
  );

-- Customers can view their own tier assignments
CREATE POLICY "Customers can view own tier assignments"
  ON customer_pricing_tiers FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

-- Admins can manage tier assignments
CREATE POLICY "Admins can manage tier assignments"
  ON customer_pricing_tiers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'super_admin')
    )
  );

-- Customers can view their own custom pricing
CREATE POLICY "Customers can view own custom pricing"
  ON customer_product_pricing FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

-- Admins can manage custom pricing
CREATE POLICY "Admins can manage custom pricing"
  ON customer_product_pricing FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'super_admin')
    )
  );

-- Everyone can view active volume discounts
CREATE POLICY "Anyone can view volume discounts"
  ON volume_discounts FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Admins can manage volume discounts
CREATE POLICY "Admins can manage volume discounts"
  ON volume_discounts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'super_admin')
    )
  );

-- Everyone can view category pricing
CREATE POLICY "Anyone can view category pricing"
  ON category_pricing_tiers FOR SELECT
  TO authenticated
  USING (true);

-- Admins can manage category pricing
CREATE POLICY "Admins can manage category pricing"
  ON category_pricing_tiers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'super_admin')
    )
  );

-- Function to calculate customer price for a product
CREATE OR REPLACE FUNCTION get_customer_price(
  p_customer_id UUID,
  p_product_id UUID,
  p_quantity INTEGER DEFAULT 1,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  base_price DECIMAL(10,2);
  final_price DECIMAL(10,2);
  custom_price DECIMAL(10,2);
  tier_discount DECIMAL(5,2);
  volume_discount DECIMAL(5,2);
  volume_amount DECIMAL(10,2);
BEGIN
  -- Check if advanced pricing is enabled
  IF NOT is_feature_enabled('advanced_pricing') THEN
    -- Return base price if feature is disabled
    SELECT base_price INTO final_price
    FROM products
    WHERE id = p_product_id;
    RETURN final_price;
  END IF;

  -- Get base price
  SELECT base_price INTO base_price
  FROM products
  WHERE id = p_product_id;
  
  IF base_price IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Check for customer-specific pricing (highest priority)
  SELECT custom_price INTO custom_price
  FROM customer_product_pricing
  WHERE customer_id = p_customer_id
    AND product_id = p_product_id
    AND effective_from <= p_date
    AND (effective_to IS NULL OR effective_to >= p_date)
  ORDER BY effective_from DESC
  LIMIT 1;
  
  IF custom_price IS NOT NULL THEN
    final_price := custom_price;
  ELSE
    -- Apply tier discount
    SELECT pt.discount_percentage INTO tier_discount
    FROM customer_pricing_tiers cpt
    JOIN pricing_tiers pt ON pt.id = cpt.tier_id
    WHERE cpt.customer_id = p_customer_id
      AND pt.is_active = true
      AND cpt.effective_from <= p_date
      AND (cpt.effective_to IS NULL OR cpt.effective_to >= p_date)
    ORDER BY pt.priority DESC, cpt.effective_from DESC
    LIMIT 1;
    
    IF tier_discount IS NOT NULL THEN
      final_price := base_price * (1 - tier_discount / 100);
    ELSE
      final_price := base_price;
    END IF;
  END IF;
  
  -- Apply volume discount if applicable
  SELECT 
    COALESCE(discount_percentage, 0),
    COALESCE(discount_amount, 0)
  INTO volume_discount, volume_amount
  FROM volume_discounts
  WHERE product_id = p_product_id
    AND is_active = true
    AND min_quantity <= p_quantity
    AND (max_quantity IS NULL OR max_quantity >= p_quantity)
    AND effective_from <= p_date
    AND (effective_to IS NULL OR effective_to >= p_date)
  ORDER BY min_quantity DESC
  LIMIT 1;
  
  IF volume_discount > 0 THEN
    final_price := final_price * (1 - volume_discount / 100);
  ELSIF volume_amount > 0 THEN
    final_price := final_price - volume_amount;
  END IF;
  
  -- Ensure price doesn't go negative
  IF final_price < 0 THEN
    final_price := 0;
  END IF;
  
  RETURN final_price;
END;
$$;

-- Insert default pricing tiers
INSERT INTO pricing_tiers (name, description, discount_percentage, priority) VALUES
('Standard', 'Standard pricing for all customers', 0, 0),
('Bronze', 'Bronze tier - 5% discount', 5, 1),
('Silver', 'Silver tier - 10% discount', 10, 2),
('Gold', 'Gold tier - 15% discount', 15, 3),
('Platinum', 'Platinum tier - 20% discount', 20, 4),
('VIP', 'VIP tier - 25% discount', 25, 5)
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE pricing_tiers IS 'Customer pricing tiers (Bronze, Silver, Gold, etc.)';
COMMENT ON TABLE customer_pricing_tiers IS 'Customer assignments to pricing tiers';
COMMENT ON TABLE customer_product_pricing IS 'Customer-specific product pricing overrides';
COMMENT ON TABLE volume_discounts IS 'Quantity-based volume discounts';
COMMENT ON FUNCTION get_customer_price IS 'Calculate final price for customer including all discounts';
