-- Migration: Add Unique Constraints to Prevent Duplicate Data
-- Created: 2025-11-07
-- Description: Adds unique constraints to critical tables to prevent duplicate records
-- and ensure data integrity across the application

-- =============================================================================
-- STEP 1: Check and handle existing duplicates
-- =============================================================================

-- Log any existing duplicate products (SKU + organization)
DO $$
DECLARE
  duplicate_count INT;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT organization_id, sku, COUNT(*) as count
    FROM products
    WHERE organization_id IS NOT NULL AND sku IS NOT NULL
    GROUP BY organization_id, sku
    HAVING COUNT(*) > 1
  ) duplicates;

  IF duplicate_count > 0 THEN
    RAISE NOTICE 'Found % duplicate product SKUs. Keeping the most recent record for each.', duplicate_count;
  END IF;
END $$;

-- Handle duplicate products by keeping the most recent one
-- Add a suffix to duplicates instead of deleting them (safer approach)
WITH duplicates AS (
  SELECT
    id,
    organization_id,
    sku,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY organization_id, sku
      ORDER BY created_at DESC, id DESC
    ) as rn
  FROM products
  WHERE organization_id IS NOT NULL AND sku IS NOT NULL
)
UPDATE products p
SET sku = p.sku || '-duplicate-' || d.rn
FROM duplicates d
WHERE p.id = d.id AND d.rn > 1;

-- Log any existing duplicate profiles (email)
DO $$
DECLARE
  duplicate_count INT;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT email, COUNT(*) as count
    FROM profiles
    WHERE email IS NOT NULL
    GROUP BY email
    HAVING COUNT(*) > 1
  ) duplicates;

  IF duplicate_count > 0 THEN
    RAISE NOTICE 'Found % duplicate profile emails. Keeping the most recent record for each.', duplicate_count;
  END IF;
END $$;

-- Handle duplicate profiles by adding suffix to duplicates
WITH duplicates AS (
  SELECT
    id,
    email,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY email
      ORDER BY created_at DESC, id DESC
    ) as rn
  FROM profiles
  WHERE email IS NOT NULL
)
UPDATE profiles p
SET email = p.email || '.duplicate' || d.rn || '@renamed.local'
FROM duplicates d
WHERE p.id = d.id AND d.rn > 1;

-- Handle duplicate campaigns
WITH duplicates AS (
  SELECT
    id,
    organization_id,
    name,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY organization_id, name
      ORDER BY created_at DESC, id DESC
    ) as rn
  FROM campaigns
  WHERE organization_id IS NOT NULL AND name IS NOT NULL
)
UPDATE campaigns c
SET name = c.name || ' (duplicate ' || d.rn || ')'
FROM duplicates d
WHERE c.id = d.id AND d.rn > 1;

-- Handle duplicate pricing tiers
WITH duplicates AS (
  SELECT
    id,
    organization_id,
    name,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY organization_id, name
      ORDER BY created_at DESC, id DESC
    ) as rn
  FROM pricing_tiers
  WHERE organization_id IS NOT NULL AND name IS NOT NULL
)
UPDATE pricing_tiers pt
SET name = pt.name || ' (duplicate ' || d.rn || ')'
FROM duplicates d
WHERE pt.id = d.id AND d.rn > 1;

-- Handle duplicate leads
WITH duplicates AS (
  SELECT
    id,
    organization_id,
    email,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY organization_id, email
      ORDER BY created_at DESC, id DESC
    ) as rn
  FROM leads
  WHERE organization_id IS NOT NULL AND email IS NOT NULL
)
UPDATE leads l
SET email = l.email || '.duplicate' || d.rn || '@renamed.local'
FROM duplicates d
WHERE l.id = d.id AND d.rn > 1;

-- Handle duplicate email templates
WITH duplicates AS (
  SELECT
    id,
    organization_id,
    name,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY organization_id, name
      ORDER BY created_at DESC, id DESC
    ) as rn
  FROM email_templates
  WHERE organization_id IS NOT NULL AND name IS NOT NULL
)
UPDATE email_templates et
SET name = et.name || ' (duplicate ' || d.rn || ')'
FROM duplicates d
WHERE et.id = d.id AND d.rn > 1;

-- Handle duplicate feature flags
WITH duplicates AS (
  SELECT
    id,
    feature_name,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY feature_name
      ORDER BY created_at DESC, id DESC
    ) as rn
  FROM feature_flags
  WHERE feature_name IS NOT NULL
)
UPDATE feature_flags ff
SET feature_name = ff.feature_name || '_duplicate_' || d.rn
FROM duplicates d
WHERE ff.id = d.id AND d.rn > 1;

-- =============================================================================
-- STEP 2: Add unique constraints
-- =============================================================================

-- Products: SKU must be unique per organization
-- This prevents multiple products with the same SKU in the same organization
ALTER TABLE products
ADD CONSTRAINT products_sku_org_unique
UNIQUE (organization_id, sku);

COMMENT ON CONSTRAINT products_sku_org_unique ON products IS
'Ensures each SKU is unique within an organization. Prevents duplicate product entries.';

-- Profiles: Email must be unique
-- This ensures one profile per email address across the entire system
ALTER TABLE profiles
ADD CONSTRAINT profiles_email_unique
UNIQUE (email);

COMMENT ON CONSTRAINT profiles_email_unique ON profiles IS
'Ensures each email address is unique across all profiles. Prevents duplicate user accounts.';

-- Campaigns: Name must be unique per organization
-- This prevents confusion from having multiple campaigns with the same name
ALTER TABLE campaigns
ADD CONSTRAINT campaigns_name_org_unique
UNIQUE (organization_id, name);

COMMENT ON CONSTRAINT campaigns_name_org_unique ON campaigns IS
'Ensures campaign names are unique within an organization. Prevents naming conflicts.';

-- Pricing tiers: Name must be unique per organization
-- This prevents confusion in pricing tier selection
ALTER TABLE pricing_tiers
ADD CONSTRAINT pricing_tiers_name_org_unique
UNIQUE (organization_id, name);

COMMENT ON CONSTRAINT pricing_tiers_name_org_unique ON pricing_tiers IS
'Ensures pricing tier names are unique within an organization. Prevents tier confusion.';

-- Leads: Email must be unique per organization
-- This prevents duplicate lead entries for the same contact
ALTER TABLE leads
ADD CONSTRAINT leads_email_org_unique
UNIQUE (organization_id, email);

COMMENT ON CONSTRAINT leads_email_org_unique ON leads IS
'Ensures lead emails are unique within an organization. Prevents duplicate lead records.';

-- Email templates: Name must be unique per organization
-- This prevents confusion when selecting email templates
ALTER TABLE email_templates
ADD CONSTRAINT email_templates_name_org_unique
UNIQUE (organization_id, name);

COMMENT ON CONSTRAINT email_templates_name_org_unique ON email_templates IS
'Ensures email template names are unique within an organization. Prevents template confusion.';

-- Feature flags: Feature name must be globally unique
-- This ensures feature flags are uniquely identifiable across the system
ALTER TABLE feature_flags
ADD CONSTRAINT feature_flags_name_unique
UNIQUE (feature_name);

COMMENT ON CONSTRAINT feature_flags_name_unique ON feature_flags IS
'Ensures feature flag names are globally unique. Prevents feature flag conflicts.';

-- =============================================================================
-- STEP 3: Create indexes for better query performance
-- =============================================================================

-- These indexes improve lookup performance for the unique constraint checks
CREATE INDEX IF NOT EXISTS idx_products_org_sku ON products(organization_id, sku)
WHERE organization_id IS NOT NULL AND sku IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email)
WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_campaigns_org_name ON campaigns(organization_id, name)
WHERE organization_id IS NOT NULL AND name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pricing_tiers_org_name ON pricing_tiers(organization_id, name)
WHERE organization_id IS NOT NULL AND name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_org_email ON leads(organization_id, email)
WHERE organization_id IS NOT NULL AND email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_templates_org_name ON email_templates(organization_id, name)
WHERE organization_id IS NOT NULL AND name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_feature_flags_name ON feature_flags(feature_name)
WHERE feature_name IS NOT NULL;

-- =============================================================================
-- ROLLBACK INSTRUCTIONS
-- =============================================================================

-- To rollback this migration, run the following commands:
/*

-- Drop unique constraints
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_sku_org_unique;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_email_unique;
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_name_org_unique;
ALTER TABLE pricing_tiers DROP CONSTRAINT IF EXISTS pricing_tiers_name_org_unique;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_email_org_unique;
ALTER TABLE email_templates DROP CONSTRAINT IF EXISTS email_templates_name_org_unique;
ALTER TABLE feature_flags DROP CONSTRAINT IF EXISTS feature_flags_name_unique;

-- Drop indexes
DROP INDEX IF EXISTS idx_products_org_sku;
DROP INDEX IF EXISTS idx_profiles_email;
DROP INDEX IF EXISTS idx_campaigns_org_name;
DROP INDEX IF EXISTS idx_pricing_tiers_org_name;
DROP INDEX IF EXISTS idx_leads_org_email;
DROP INDEX IF EXISTS idx_email_templates_org_name;
DROP INDEX IF EXISTS idx_feature_flags_name;

*/

-- =============================================================================
-- VALIDATION QUERIES
-- =============================================================================

-- Run these queries after migration to verify constraints are working:
/*

-- Test products constraint
SELECT
  organization_id,
  sku,
  COUNT(*) as count
FROM products
WHERE organization_id IS NOT NULL AND sku IS NOT NULL
GROUP BY organization_id, sku
HAVING COUNT(*) > 1;
-- Should return 0 rows

-- Test profiles constraint
SELECT
  email,
  COUNT(*) as count
FROM profiles
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1;
-- Should return 0 rows

-- Test campaigns constraint
SELECT
  organization_id,
  name,
  COUNT(*) as count
FROM campaigns
WHERE organization_id IS NOT NULL AND name IS NOT NULL
GROUP BY organization_id, name
HAVING COUNT(*) > 1;
-- Should return 0 rows

-- Test pricing_tiers constraint
SELECT
  organization_id,
  name,
  COUNT(*) as count
FROM pricing_tiers
WHERE organization_id IS NOT NULL AND name IS NOT NULL
GROUP BY organization_id, name
HAVING COUNT(*) > 1;
-- Should return 0 rows

-- Test leads constraint
SELECT
  organization_id,
  email,
  COUNT(*) as count
FROM leads
WHERE organization_id IS NOT NULL AND email IS NOT NULL
GROUP BY organization_id, email
HAVING COUNT(*) > 1;
-- Should return 0 rows

-- Test email_templates constraint
SELECT
  organization_id,
  name,
  COUNT(*) as count
FROM email_templates
WHERE organization_id IS NOT NULL AND name IS NOT NULL
GROUP BY organization_id, name
HAVING COUNT(*) > 1;
-- Should return 0 rows

-- Test feature_flags constraint
SELECT
  feature_name,
  COUNT(*) as count
FROM feature_flags
WHERE feature_name IS NOT NULL
GROUP BY feature_name
HAVING COUNT(*) > 1;
-- Should return 0 rows

*/

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '✓ Migration completed successfully!';
  RAISE NOTICE '✓ Unique constraints added to 7 tables';
  RAISE NOTICE '✓ Supporting indexes created for optimal performance';
  RAISE NOTICE '✓ Existing duplicates handled gracefully';
  RAISE NOTICE '';
  RAISE NOTICE 'The following constraints are now active:';
  RAISE NOTICE '  - products: (organization_id, sku) must be unique';
  RAISE NOTICE '  - profiles: (email) must be unique';
  RAISE NOTICE '  - campaigns: (organization_id, name) must be unique';
  RAISE NOTICE '  - pricing_tiers: (organization_id, name) must be unique';
  RAISE NOTICE '  - leads: (organization_id, email) must be unique';
  RAISE NOTICE '  - email_templates: (organization_id, name) must be unique';
  RAISE NOTICE '  - feature_flags: (feature_name) must be unique';
END $$;
