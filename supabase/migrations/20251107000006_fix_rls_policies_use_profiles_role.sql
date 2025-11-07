-- Migration: Fix RLS policies to use profiles.role instead of organization_members.role
-- Description: Many RLS policies incorrectly check organization_members.role for admin access
-- FIXES: RLS policies should use profiles.role or is_admin() helper function
-- SECURITY: This ensures admin access control uses the correct role column

-- ===========================================================================
-- FEATURE FLAGS TABLE
-- ===========================================================================

-- Drop and recreate policies using correct role check
DROP POLICY IF EXISTS "Super admins can manage feature flags" ON feature_flags;
DROP POLICY IF EXISTS "Super admins can create feature flags" ON feature_flags;

CREATE POLICY "Super admins can manage feature flags"
  ON feature_flags FOR ALL
  TO authenticated
  USING (
    -- FIX: Use profiles.role instead of organization_members.role
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- ===========================================================================
-- ADVANCED PRICING TABLES
-- ===========================================================================

-- Pricing tiers - already fixed in 20251107000002
-- This policy was already updated to use profiles.role in that migration

-- Customer pricing tiers
DROP POLICY IF EXISTS "Admins can manage tier assignments" ON customer_pricing_tiers;

CREATE POLICY "Admins can manage tier assignments"
  ON customer_pricing_tiers FOR ALL
  TO authenticated
  USING (
    -- FIX: Use is_admin() helper function
    is_admin()
  );

-- Customer product pricing
DROP POLICY IF EXISTS "Admins can manage custom pricing" ON customer_product_pricing;

CREATE POLICY "Admins can manage custom pricing"
  ON customer_product_pricing FOR ALL
  TO authenticated
  USING (
    is_admin()
  );

-- Volume discounts
DROP POLICY IF EXISTS "Admins can manage volume discounts" ON volume_discounts;

CREATE POLICY "Admins can manage volume discounts"
  ON volume_discounts FOR ALL
  TO authenticated
  USING (
    is_admin()
  );

-- Category pricing tiers
DROP POLICY IF EXISTS "Admins can manage category pricing" ON category_pricing_tiers;

CREATE POLICY "Admins can manage category pricing"
  ON category_pricing_tiers FOR ALL
  TO authenticated
  USING (
    is_admin()
  );

-- ===========================================================================
-- INVENTORY & WAREHOUSE TABLES
-- ===========================================================================

DO $$
BEGIN
  -- Dormant inventory
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dormant_inventory') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can manage dormant inventory" ON dormant_inventory';
    EXECUTE 'CREATE POLICY "Admins can manage dormant inventory"
      ON dormant_inventory FOR ALL
      TO authenticated
      USING (is_admin())';
  END IF;

  -- Inventory movements
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_movements') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can manage inventory movements" ON inventory_movements';
    EXECUTE 'CREATE POLICY "Admins can manage inventory movements"
      ON inventory_movements FOR ALL
      TO authenticated
      USING (is_admin())';
  END IF;

  -- Warehouse locations
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'warehouse_locations') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can manage warehouse locations" ON warehouse_locations';
    EXECUTE 'CREATE POLICY "Admins can manage warehouse locations"
      ON warehouse_locations FOR ALL
      TO authenticated
      USING (is_admin())';
  END IF;

  -- Inventory snapshots
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_snapshots') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can view inventory snapshots" ON inventory_snapshots';
    EXECUTE 'CREATE POLICY "Admins can view inventory snapshots"
      ON inventory_snapshots FOR SELECT
      TO authenticated
      USING (is_admin())';
  END IF;

  -- Reorder rules
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reorder_rules') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can manage reorder rules" ON reorder_rules';
    EXECUTE 'CREATE POLICY "Admins can manage reorder rules"
      ON reorder_rules FOR ALL
      TO authenticated
      USING (is_admin())';
  END IF;

  -- Stock adjustments
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_adjustments') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can manage stock adjustments" ON stock_adjustments';
    EXECUTE 'CREATE POLICY "Admins can manage stock adjustments"
      ON stock_adjustments FOR ALL
      TO authenticated
      USING (is_admin())';
  END IF;
END $$;

-- ===========================================================================
-- EMAIL CAMPAIGNS TABLES
-- ===========================================================================

DO $$
BEGIN
  -- Email campaigns
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_campaigns') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can view all campaigns" ON email_campaigns';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can create campaigns" ON email_campaigns';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can update campaigns" ON email_campaigns';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can delete campaigns" ON email_campaigns';

    EXECUTE 'CREATE POLICY "Admins can manage campaigns"
      ON email_campaigns FOR ALL
      TO authenticated
      USING (is_admin())';
  END IF;

  -- Email campaign recipients
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_campaign_recipients') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can view campaign recipients" ON email_campaign_recipients';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can manage recipients" ON email_campaign_recipients';

    EXECUTE 'CREATE POLICY "Admins can manage campaign recipients"
      ON email_campaign_recipients FOR ALL
      TO authenticated
      USING (is_admin())';
  END IF;

  -- Email templates
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_templates') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can manage email templates" ON email_templates';

    EXECUTE 'CREATE POLICY "Admins can manage email templates"
      ON email_templates FOR ALL
      TO authenticated
      USING (is_admin())';
  END IF;

  -- Email campaign clicks
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_campaign_clicks') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can view campaign clicks" ON email_campaign_clicks';

    EXECUTE 'CREATE POLICY "Admins can view campaign clicks"
      ON email_campaign_clicks FOR SELECT
      TO authenticated
      USING (is_admin())';
  END IF;
END $$;

-- ===========================================================================
-- SEMANTIC SEARCH & RECOMMENDATIONS
-- ===========================================================================

DO $$
BEGIN
  -- Search queries log
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'search_queries') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can view all search queries" ON search_queries';

    EXECUTE 'CREATE POLICY "Admins can view all search queries"
      ON search_queries FOR SELECT
      TO authenticated
      USING (is_admin())';
  END IF;

  -- Product recommendations
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_recommendations') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can manage recommendations" ON product_recommendations';

    EXECUTE 'CREATE POLICY "Admins can manage recommendations"
      ON product_recommendations FOR ALL
      TO authenticated
      USING (is_admin())';
  END IF;
END $$;

-- ===========================================================================
-- CRM TABLES
-- ===========================================================================

DO $$
BEGIN
  -- Leads
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can manage all leads" ON leads';

    EXECUTE 'CREATE POLICY "Admins can manage all leads"
      ON leads FOR ALL
      TO authenticated
      USING (is_admin())';
  END IF;

  -- Lead activities
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lead_activities') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can view all activities" ON lead_activities';

    EXECUTE 'CREATE POLICY "Admins can view all activities"
      ON lead_activities FOR SELECT
      TO authenticated
      USING (is_admin())';
  END IF;

  -- Opportunities
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'opportunities') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can manage all opportunities" ON opportunities';

    EXECUTE 'CREATE POLICY "Admins can manage all opportunities"
      ON opportunities FOR ALL
      TO authenticated
      USING (is_admin())';
  END IF;

  -- Lead notes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lead_notes') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can manage all notes" ON lead_notes';

    EXECUTE 'CREATE POLICY "Admins can manage all notes"
      ON lead_notes FOR ALL
      TO authenticated
      USING (is_admin())';
  END IF;

  -- Sales pipeline
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_pipeline') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can manage pipeline" ON sales_pipeline';

    EXECUTE 'CREATE POLICY "Admins can manage pipeline"
      ON sales_pipeline FOR ALL
      TO authenticated
      USING (is_admin())';
  END IF;
END $$;

-- ===========================================================================
-- INVOICES
-- ===========================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can manage all invoices" ON invoices';

    EXECUTE 'CREATE POLICY "Admins can manage all invoices"
      ON invoices FOR ALL
      TO authenticated
      USING (is_admin())';
  END IF;
END $$;

-- ===========================================================================
-- VERIFICATION & DOCUMENTATION
-- ===========================================================================

-- Add comment documenting the role systems
COMMENT ON COLUMN organization_members.role IS
  'Organization-level role (owner, admin, member, viewer) - controls permissions within an organization';

COMMENT ON COLUMN profiles.role IS
  'System-level role (customer, admin, super_admin) - controls global admin access to the platform';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'RLS Policy Role References Updated Successfully!';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'All RLS policies now use profiles.role or is_admin()';
  RAISE NOTICE 'instead of incorrectly checking organization_members.role';
  RAISE NOTICE '==================================================';
END $$;
