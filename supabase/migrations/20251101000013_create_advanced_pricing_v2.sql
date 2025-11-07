-- Migration: Advanced pricing system
-- Description: Customer-specific pricing, volume discounts, and pricing tiers

-- Alter existing pricing_tiers table to add new columns
ALTER TABLE pricing_tiers 
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create index on priority
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_priority ON pricing_tiers(priority DESC);

-- Customer tier assignments
CREATE TABLE IF NOT EXISTS customer_pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tier_id UUID REFERENCES pricing_tiers(id) ON DELETE CASCADE,
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(customer_id, tier_id, effective_from)
);

-- Customer-specific product pricing (overrides tier pricing)
CREATE TABLE IF NOT EXISTS customer_product_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  custom_price DECIMAL(10,2) NOT NULL CHECK (custom_price >= 0),
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
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

-- Category-level pricing tiers
CREATE TABLE IF NOT EXISTS category_pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id UUID REFERENCES pricing_tiers(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  additional_discount DECIMAL(5,2) DEFAULT 0 CHECK (additional_discount >= 0 AND additional_discount <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tier_id, category)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customer_pricing_tiers_customer ON customer_pricing_tiers(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_pricing_tiers_tier ON customer_pricing_tiers(tier_id);
CREATE INDEX IF NOT EXISTS idx_customer_pricing_tiers_dates ON customer_pricing_tiers(effective_from, effective_to);

CREATE INDEX IF NOT EXISTS idx_customer_product_pricing_customer ON customer_product_pricing(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_product_pricing_product ON customer_product_pricing(product_id);
CREATE INDEX IF NOT EXISTS idx_customer_product_pricing_dates ON customer_product_pricing(effective_from, effective_to);

CREATE INDEX IF NOT EXISTS idx_volume_discounts_product ON volume_discounts(product_id);
CREATE INDEX IF NOT EXISTS idx_volume_discounts_quantity ON volume_discounts(min_quantity, max_quantity);
CREATE INDEX IF NOT EXISTS idx_volume_discounts_active ON volume_discounts(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_category_pricing_tiers_tier ON category_pricing_tiers(tier_id);
CREATE INDEX IF NOT EXISTS idx_category_pricing_tiers_category ON category_pricing_tiers(category);

-- Enable RLS
ALTER TABLE pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_product_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE volume_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_pricing_tiers ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Pricing tiers: Everyone can view active tiers
DROP POLICY IF EXISTS "Anyone can view active pricing tiers" ON pricing_tiers;
CREATE POLICY "Anyone can view active pricing tiers"
  ON pricing_tiers FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Admins can manage pricing tiers
DROP POLICY IF EXISTS "Admins can manage pricing tiers" ON pricing_tiers;
CREATE POLICY "Admins can manage pricing tiers"
  ON pricing_tiers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
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
      AND organization_members.role IN ('owner', 'admin')
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
      AND organization_members.role IN ('owner', 'admin')
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
      AND organization_members.role IN ('owner', 'admin')
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
      AND organization_members.role IN ('owner', 'admin')
    )
  );

-- Function to get customer's effective price for a product
DROP FUNCTION IF EXISTS get_customer_price(UUID, UUID, INTEGER);
DROP FUNCTION IF EXISTS get_customer_price(UUID, UUID, INTEGER, DATE);
CREATE OR REPLACE FUNCTION get_customer_price(
  p_customer_id UUID,
  p_product_id UUID,
  p_quantity INTEGER DEFAULT 1,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  base_price DECIMAL;
  final_price DECIMAL;
  tier_discount DECIMAL := 0;
  volume_discount DECIMAL := 0;
  custom_price DECIMAL;
BEGIN
  -- Check if advanced pricing is enabled
  IF NOT is_feature_enabled('advanced_pricing') THEN
    SELECT products.base_price INTO final_price
    FROM products
    WHERE products.id = p_product_id;
    RETURN final_price;
  END IF;

  -- Get base price
  SELECT products.base_price INTO base_price
  FROM products
  WHERE products.id = p_product_id;

  IF base_price IS NULL THEN
    RETURN NULL;
  END IF;

  -- Check for customer-specific pricing (highest priority)
  SELECT cpp.custom_price INTO custom_price
  FROM customer_product_pricing cpp
  WHERE cpp.customer_id = p_customer_id
    AND cpp.product_id = p_product_id
    AND cpp.effective_from <= p_date
    AND (cpp.effective_to IS NULL OR cpp.effective_to >= p_date)
  ORDER BY cpp.effective_from DESC
  LIMIT 1;

  IF custom_price IS NOT NULL THEN
    RETURN custom_price;
  END IF;

  -- Get tier discount
  SELECT COALESCE(MAX(pt.discount_percentage), 0) INTO tier_discount
  FROM customer_pricing_tiers cpt
  JOIN pricing_tiers pt ON pt.id = cpt.tier_id
  WHERE cpt.customer_id = p_customer_id
    AND pt.is_active = true
    AND cpt.effective_from <= p_date
    AND (cpt.effective_to IS NULL OR cpt.effective_to >= p_date)
  ORDER BY pt.priority DESC
  LIMIT 1;

  -- Get volume discount
  SELECT COALESCE(
    CASE 
      WHEN vd.discount_percentage IS NOT NULL THEN vd.discount_percentage
      WHEN vd.discount_amount IS NOT NULL THEN (vd.discount_amount / base_price * 100)
      ELSE 0
    END, 0
  ) INTO volume_discount
  FROM volume_discounts vd
  WHERE vd.product_id = p_product_id
    AND vd.is_active = true
    AND vd.min_quantity <= p_quantity
    AND (vd.max_quantity IS NULL OR vd.max_quantity >= p_quantity)
    AND vd.effective_from <= p_date
    AND (vd.effective_to IS NULL OR vd.effective_to >= p_date)
  ORDER BY vd.min_quantity DESC
  LIMIT 1;

  -- Apply discounts (tier + volume, max 100%)
  final_price := base_price * (1 - LEAST(tier_discount + volume_discount, 100) / 100);

  RETURN ROUND(final_price, 2);
END;
$$;

-- Add unique constraint on name if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'pricing_tiers_name_org_key'
  ) THEN
    ALTER TABLE pricing_tiers ADD CONSTRAINT pricing_tiers_name_org_key UNIQUE (name, organization_id);
  END IF;
END $$;

-- Insert default pricing tiers (only if they don't exist)
-- Note: This will only work for the first organization, others need manual setup
INSERT INTO pricing_tiers (organization_id, name, description, discount_percentage, priority, is_active)
SELECT 
  o.id,
  tier.name,
  tier.description,
  tier.discount_percentage,
  tier.priority,
  tier.is_active
FROM organizations o
CROSS JOIN (
  VALUES 
    ('Standard', 'Standard pricing for all customers', 0, 1, true),
    ('Bronze', 'Bronze tier - 5% discount', 5, 2, true),
    ('Silver', 'Silver tier - 10% discount', 10, 3, true),
    ('Gold', 'Gold tier - 15% discount', 15, 4, true),
    ('Platinum', 'Platinum tier - 20% discount', 20, 5, true),
    ('VIP', 'VIP tier - 25% discount', 25, 6, true)
) AS tier(name, description, discount_percentage, priority, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM pricing_tiers pt 
  WHERE pt.organization_id = o.id AND pt.name = tier.name
);

COMMENT ON TABLE pricing_tiers IS 'Customer pricing tiers with discount percentages';
COMMENT ON TABLE customer_pricing_tiers IS 'Assignment of customers to pricing tiers';
COMMENT ON TABLE customer_product_pricing IS 'Customer-specific product pricing overrides';
COMMENT ON TABLE volume_discounts IS 'Quantity-based volume discounts';
COMMENT ON TABLE category_pricing_tiers IS 'Category-level pricing adjustments per tier';
COMMENT ON FUNCTION get_customer_price IS 'Calculate final price for customer including all discounts';
