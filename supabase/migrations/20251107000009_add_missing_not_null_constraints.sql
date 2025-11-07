-- Migration: Add missing NOT NULL constraints for data integrity
-- Description: Ensures critical columns always have values to prevent data quality issues
-- SECURITY & DATA INTEGRITY: Prevents NULL values in columns that should always be populated

-- ==============================================
-- STEP 1: Fix existing NULL values before adding constraints
-- ==============================================

-- Fix profiles: Ensure email is never NULL (use auth.users email as fallback)
UPDATE profiles
SET email = auth.users.email
FROM auth.users
WHERE profiles.id = auth.users.id
  AND profiles.email IS NULL;

-- Fix profiles: Ensure full_name has a value (use email prefix as fallback)
UPDATE profiles
SET full_name = COALESCE(full_name, SPLIT_PART(email, '@', 1))
WHERE full_name IS NULL OR full_name = '';

-- Fix organizations: Ensure name is not empty
UPDATE organizations
SET name = 'Organization ' || id::text
WHERE name IS NULL OR name = '';

-- Fix organizations: Ensure type has a value
UPDATE organizations
SET type = 'distributor'
WHERE type IS NULL;

-- Fix products: Ensure description has a value
UPDATE products
SET description = name
WHERE description IS NULL OR description = '';

-- Fix orders: Ensure shipping_address_id is set (use default address if available)
DO $$
BEGIN
  UPDATE orders o
  SET shipping_address_id = (
    SELECT sa.id
    FROM shipping_addresses sa
    WHERE sa.organization_id = o.organization_id
    ORDER BY sa.is_default DESC, sa.last_used_at DESC NULLS LAST, sa.created_at ASC
    LIMIT 1
  )
  WHERE o.shipping_address_id IS NULL
    AND o.status NOT IN ('cancelled', 'draft');
END $$;

-- ==============================================
-- STEP 2: Add NOT NULL constraints
-- ==============================================

-- Profiles table
-- Email should always be set (comes from auth.users)
ALTER TABLE profiles
  ALTER COLUMN email SET NOT NULL;

-- Full name should always be set for user identification
ALTER TABLE profiles
  ALTER COLUMN full_name SET NOT NULL;

-- Products table
-- Description is important for product details and search
ALTER TABLE products
  ALTER COLUMN description SET NOT NULL;

-- Unit of measure should always be specified
-- (Already NOT NULL in schema, but verify)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products'
      AND column_name = 'unit_of_measure'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE products ALTER COLUMN unit_of_measure SET NOT NULL;
  END IF;
END $$;

-- Shipping addresses table
-- Contact information should always be complete
ALTER TABLE shipping_addresses
  ALTER COLUMN contact_name SET NOT NULL;

ALTER TABLE shipping_addresses
  ALTER COLUMN phone SET NOT NULL;

ALTER TABLE shipping_addresses
  ALTER COLUMN street_address SET NOT NULL;

ALTER TABLE shipping_addresses
  ALTER COLUMN city SET NOT NULL;

ALTER TABLE shipping_addresses
  ALTER COLUMN state SET NOT NULL;

ALTER TABLE shipping_addresses
  ALTER COLUMN postal_code SET NOT NULL;

-- Orders table
-- Shipping address should be set for non-draft orders
-- Note: This is conditional - drafts can have NULL shipping_address_id
-- We'll add a CHECK constraint instead
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_shipping_address_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_shipping_address_check
  CHECK (
    status IN ('draft', 'cancelled') OR shipping_address_id IS NOT NULL
  );

-- Order items table
-- All fields should be NOT NULL (already are, but verify)
DO $$
BEGIN
  -- SKU
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items'
      AND column_name = 'sku'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE order_items ALTER COLUMN sku SET NOT NULL;
  END IF;

  -- Name
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items'
      AND column_name = 'name'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE order_items ALTER COLUMN name SET NOT NULL;
  END IF;

  -- Unit price
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items'
      AND column_name = 'unit_price'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE order_items ALTER COLUMN unit_price SET NOT NULL;
  END IF;

  -- Line total
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items'
      AND column_name = 'line_total'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE order_items ALTER COLUMN line_total SET NOT NULL;
  END IF;
END $$;

-- Organization members table
-- Role should always be set (already NOT NULL, but verify)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organization_members'
      AND column_name = 'role'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE organization_members ALTER COLUMN role SET NOT NULL;
  END IF;
END $$;

-- ==============================================
-- STEP 3: Add CHECK constraints for additional validation
-- ==============================================

-- Ensure email is valid format
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_email_format;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_email_format
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Ensure full_name is not empty
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_full_name_not_empty;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_full_name_not_empty
  CHECK (LENGTH(TRIM(full_name)) > 0);

-- Ensure product description is not empty
ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_description_not_empty;

ALTER TABLE products
  ADD CONSTRAINT products_description_not_empty
  CHECK (LENGTH(TRIM(description)) > 0);

-- Ensure organization name is not empty
ALTER TABLE organizations
  DROP CONSTRAINT IF EXISTS organizations_name_not_empty;

ALTER TABLE organizations
  ADD CONSTRAINT organizations_name_not_empty
  CHECK (LENGTH(TRIM(name)) > 0);

-- ==============================================
-- STEP 4: Add comments for documentation
-- ==============================================

COMMENT ON CONSTRAINT profiles_email_format ON profiles IS
  'Ensures email addresses follow a valid format';

COMMENT ON CONSTRAINT profiles_full_name_not_empty ON profiles IS
  'Ensures users have a displayable name';

COMMENT ON CONSTRAINT products_description_not_empty ON products IS
  'Ensures products have meaningful descriptions for customers';

COMMENT ON CONSTRAINT organizations_name_not_empty ON organizations IS
  'Ensures organizations have identifiable names';

COMMENT ON CONSTRAINT orders_shipping_address_check ON orders IS
  'Ensures non-draft and non-cancelled orders have a shipping address';

-- ==============================================
-- Log Success
-- ==============================================

DO $$
BEGIN
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'NOT NULL Constraints Added Successfully!';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Tables Updated:';
  RAISE NOTICE '- profiles: email, full_name (with format validation)';
  RAISE NOTICE '- products: description (with non-empty check)';
  RAISE NOTICE '- shipping_addresses: all address fields';
  RAISE NOTICE '- organizations: name (with non-empty check)';
  RAISE NOTICE '- orders: conditional shipping_address_id check';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'This improves data integrity and prevents NULL-related bugs';
  RAISE NOTICE '==================================================';
END $$;
