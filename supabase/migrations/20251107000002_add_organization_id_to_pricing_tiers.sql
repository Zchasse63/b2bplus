-- Migration: Add organization_id to pricing_tiers for multi-tenant isolation
-- Description: Fix missing organization_id column and update RLS policies
-- SECURITY: This fixes multi-tenant data isolation for pricing tiers

-- Step 1: Add organization_id column to pricing_tiers
ALTER TABLE pricing_tiers
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_organization
  ON pricing_tiers(organization_id);

-- Step 3: Backfill organization_id for existing rows
-- Set to first organization if data exists without organization_id
UPDATE pricing_tiers
SET organization_id = (SELECT id FROM organizations ORDER BY created_at LIMIT 1)
WHERE organization_id IS NULL;

-- Step 4: Make organization_id NOT NULL after backfill
-- Only do this if there are organizations in the system
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM organizations LIMIT 1) THEN
    ALTER TABLE pricing_tiers
      ALTER COLUMN organization_id SET NOT NULL;
  END IF;
END $$;

-- Step 5: Drop old unique constraint on name (if exists)
ALTER TABLE pricing_tiers
  DROP CONSTRAINT IF EXISTS pricing_tiers_name_key;

-- Step 6: Add new unique constraint on (name, organization_id)
-- This ensures tier names are unique within each organization
ALTER TABLE pricing_tiers
  DROP CONSTRAINT IF EXISTS pricing_tiers_name_org_key;

ALTER TABLE pricing_tiers
  ADD CONSTRAINT pricing_tiers_name_org_key
  UNIQUE (name, organization_id);

-- Step 7: Update RLS policies for proper multi-tenant isolation

-- Drop old policies
DROP POLICY IF EXISTS "Anyone can view active pricing tiers" ON pricing_tiers;
DROP POLICY IF EXISTS "Admins can manage pricing tiers" ON pricing_tiers;

-- SECURITY: Users can only view pricing tiers for their organization
CREATE POLICY "Users can view organization pricing tiers"
  ON pricing_tiers FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND organization_id IN (
      SELECT organization_id
      FROM profiles
      WHERE id = auth.uid()
    )
  );

-- SECURITY: Only admins can manage pricing tiers for their organization
CREATE POLICY "Admins can manage organization pricing tiers"
  ON pricing_tiers FOR ALL
  TO authenticated
  USING (
    -- User must be admin/super_admin
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
    AND (
      -- For INSERT: allow if user belongs to the organization
      -- For UPDATE/DELETE: pricing tier must belong to user's organization
      organization_id IN (
        SELECT current_organization_id
        FROM profiles
        WHERE id = auth.uid()
      )
    )
  );

-- Step 8: Update get_customer_price function to use organization_id
-- This ensures pricing tiers are scoped to the correct organization
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
  customer_org_id UUID;
BEGIN
  -- Get customer's organization
  SELECT current_organization_id INTO customer_org_id
  FROM profiles
  WHERE id = p_customer_id;

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

  -- SECURITY FIX: Get tier discount only from customer's organization
  SELECT COALESCE(MAX(pt.discount_percentage), 0) INTO tier_discount
  FROM customer_pricing_tiers cpt
  JOIN pricing_tiers pt ON pt.id = cpt.tier_id
  WHERE cpt.customer_id = p_customer_id
    AND pt.is_active = true
    AND pt.organization_id = customer_org_id  -- SECURITY: Ensure tier belongs to customer's org
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

COMMENT ON COLUMN pricing_tiers.organization_id IS 'Organization that owns this pricing tier (multi-tenant isolation)';
COMMENT ON CONSTRAINT pricing_tiers_name_org_key ON pricing_tiers IS 'Tier names must be unique within each organization';
