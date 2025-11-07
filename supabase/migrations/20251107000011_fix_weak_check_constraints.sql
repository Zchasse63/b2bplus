-- Migration: Fix Weak CHECK Constraints
-- Description: Strengthens database-level validation with comprehensive CHECK constraints
-- SECURITY & DATA INTEGRITY: Prevents invalid data at the database level

-- ==============================================
-- STEP 1: Products Table - Strengthen Constraints
-- ==============================================

-- Ensure prices are valid
ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_base_price_check;

ALTER TABLE products
  ADD CONSTRAINT products_base_price_positive
  CHECK (base_price > 0 AND base_price <= 999999.99);

-- Ensure SKU follows pattern
ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_sku_format;

ALTER TABLE products
  ADD CONSTRAINT products_sku_format
  CHECK (sku ~ '^[A-Z0-9-_]{1,100}$');

-- Ensure units_per_case is reasonable
ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_units_per_case_check;

ALTER TABLE products
  ADD CONSTRAINT products_units_per_case_valid
  CHECK (units_per_case IS NULL OR (units_per_case > 0 AND units_per_case <= 10000));

-- Ensure weight is reasonable
ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_weight_check;

ALTER TABLE products
  ADD CONSTRAINT products_weight_valid
  CHECK (weight_lbs IS NULL OR (weight_lbs > 0 AND weight_lbs <= 50000));

-- Ensure category is not empty
ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_category_check;

ALTER TABLE products
  ADD CONSTRAINT products_category_not_empty
  CHECK (LENGTH(TRIM(category)) > 0 AND LENGTH(category) <= 100);

-- ==============================================
-- STEP 2: Orders Table - Strengthen Constraints
-- ==============================================

-- Ensure financial amounts are valid
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_subtotal_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_subtotal_valid
  CHECK (subtotal >= 0 AND subtotal <= 9999999.99);

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_tax_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_tax_valid
  CHECK (tax >= 0 AND tax <= 9999999.99);

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_shipping_cost_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_shipping_cost_valid
  CHECK (shipping_cost >= 0 AND shipping_cost <= 99999.99);

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_total_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_total_valid
  CHECK (total >= 0 AND total <= 9999999.99);

-- Ensure total equals subtotal + tax + shipping
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_total_calculation;

ALTER TABLE orders
  ADD CONSTRAINT orders_total_equals_sum
  CHECK (ABS(total - (subtotal + tax + shipping_cost)) < 0.01);

-- Ensure order_number follows pattern
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_order_number_format;

ALTER TABLE orders
  ADD CONSTRAINT orders_order_number_format
  CHECK (order_number ~ '^ORD-[0-9]{8}-[0-9]{4}$');

-- ==============================================
-- STEP 3: Order Items Table - Strengthen Constraints
-- ==============================================

-- Ensure quantity is reasonable
ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS order_items_quantity_check;

ALTER TABLE order_items
  ADD CONSTRAINT order_items_quantity_valid
  CHECK (quantity > 0 AND quantity <= 999999);

-- Ensure prices are valid
ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS order_items_unit_price_check;

ALTER TABLE order_items
  ADD CONSTRAINT order_items_unit_price_valid
  CHECK (unit_price >= 0 AND unit_price <= 999999.99);

ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS order_items_line_total_check;

ALTER TABLE order_items
  ADD CONSTRAINT order_items_line_total_valid
  CHECK (line_total >= 0 AND line_total <= 9999999.99);

-- Ensure line total matches quantity * unit_price
ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS order_items_line_total_calculation;

ALTER TABLE order_items
  ADD CONSTRAINT order_items_line_total_equals_quantity_times_price
  CHECK (ABS(line_total - (quantity * unit_price)) < 0.01);

-- ==============================================
-- STEP 4: Cart Items Table - Strengthen Constraints
-- ==============================================

-- Ensure quantity is reasonable
ALTER TABLE cart_items
  DROP CONSTRAINT IF EXISTS cart_items_quantity_check;

ALTER TABLE cart_items
  ADD CONSTRAINT cart_items_quantity_valid
  CHECK (quantity > 0 AND quantity <= 10000);

-- ==============================================
-- STEP 5: Shipping Addresses - Strengthen Constraints
-- ==============================================

-- Ensure postal code format (US only for now)
ALTER TABLE shipping_addresses
  DROP CONSTRAINT IF EXISTS shipping_addresses_postal_code_format;

ALTER TABLE shipping_addresses
  ADD CONSTRAINT shipping_addresses_postal_code_valid
  CHECK (
    (country = 'US' AND postal_code ~ '^\d{5}(-\d{4})?$') OR
    (country != 'US' AND LENGTH(postal_code) > 0)
  );

-- Ensure state format (US only)
ALTER TABLE shipping_addresses
  DROP CONSTRAINT IF EXISTS shipping_addresses_state_format;

ALTER TABLE shipping_addresses
  ADD CONSTRAINT shipping_addresses_state_valid
  CHECK (
    (country = 'US' AND state ~ '^[A-Z]{2}$') OR
    (country != 'US' AND LENGTH(state) > 0)
  );

-- Ensure phone number is not empty
ALTER TABLE shipping_addresses
  DROP CONSTRAINT IF EXISTS shipping_addresses_phone_check;

ALTER TABLE shipping_addresses
  ADD CONSTRAINT shipping_addresses_phone_valid
  CHECK (LENGTH(TRIM(phone)) >= 10);

-- ==============================================
-- STEP 6: Pricing Tables - Strengthen Constraints
-- ==============================================

-- Pricing tiers
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pricing_tiers') THEN
    ALTER TABLE pricing_tiers
      DROP CONSTRAINT IF EXISTS pricing_tiers_discount_check;

    ALTER TABLE pricing_tiers
      ADD CONSTRAINT pricing_tiers_discount_valid
      CHECK (discount_percentage >= 0 AND discount_percentage <= 100);

    ALTER TABLE pricing_tiers
      DROP CONSTRAINT IF EXISTS pricing_tiers_min_order_check;

    ALTER TABLE pricing_tiers
      ADD CONSTRAINT pricing_tiers_min_order_valid
      CHECK (minimum_order_value IS NULL OR (minimum_order_value >= 0 AND minimum_order_value <= 9999999.99));
  END IF;
END $$;

-- Customer product pricing
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_product_pricing') THEN
    ALTER TABLE customer_product_pricing
      DROP CONSTRAINT IF EXISTS customer_product_pricing_price_check;

    ALTER TABLE customer_product_pricing
      ADD CONSTRAINT customer_product_pricing_price_valid
      CHECK (custom_price > 0 AND custom_price <= 999999.99);
  END IF;
END $$;

-- Volume discounts
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'volume_discounts') THEN
    ALTER TABLE volume_discounts
      DROP CONSTRAINT IF EXISTS volume_discounts_quantity_check;

    ALTER TABLE volume_discounts
      ADD CONSTRAINT volume_discounts_quantity_valid
      CHECK (min_quantity > 0 AND min_quantity <= 999999);

    ALTER TABLE volume_discounts
      DROP CONSTRAINT IF EXISTS volume_discounts_discount_check;

    ALTER TABLE volume_discounts
      ADD CONSTRAINT volume_discounts_discount_valid
      CHECK (discount_percentage > 0 AND discount_percentage <= 100);
  END IF;
END $$;

-- ==============================================
-- STEP 7: Campaigns Table - Strengthen Constraints
-- ==============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaigns') THEN
    -- Ensure subject is not empty
    ALTER TABLE campaigns
      DROP CONSTRAINT IF EXISTS campaigns_subject_check;

    ALTER TABLE campaigns
      ADD CONSTRAINT campaigns_subject_not_empty
      CHECK (LENGTH(TRIM(subject)) > 0 AND LENGTH(subject) <= 255);

    -- Ensure body is not empty
    ALTER TABLE campaigns
      DROP CONSTRAINT IF EXISTS campaigns_body_check;

    ALTER TABLE campaigns
      ADD CONSTRAINT campaigns_body_not_empty
      CHECK (LENGTH(TRIM(body)) > 0 AND LENGTH(body) <= 50000);

    -- Ensure recipient counts are valid
    ALTER TABLE campaigns
      DROP CONSTRAINT IF EXISTS campaigns_counts_check;

    ALTER TABLE campaigns
      ADD CONSTRAINT campaigns_counts_valid
      CHECK (
        total_recipients >= 0 AND
        successful_sends >= 0 AND
        failed_sends >= 0 AND
        successful_sends + failed_sends <= total_recipients
      );
  END IF;
END $$;

-- ==============================================
-- STEP 8: Organization Constraints
-- ==============================================

-- Ensure slug follows URL-safe pattern
ALTER TABLE organizations
  DROP CONSTRAINT IF EXISTS organizations_slug_format;

ALTER TABLE organizations
  ADD CONSTRAINT organizations_slug_format
  CHECK (slug ~ '^[a-z0-9-]{1,100}$');

-- Ensure phone number format if provided
ALTER TABLE organizations
  DROP CONSTRAINT IF EXISTS organizations_phone_format;

ALTER TABLE organizations
  ADD CONSTRAINT organizations_phone_valid
  CHECK (phone IS NULL OR LENGTH(TRIM(phone)) >= 10);

-- ==============================================
-- STEP 9: Profiles Constraints
-- ==============================================

-- Ensure phone number format if provided
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_phone_format;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_phone_valid
  CHECK (phone IS NULL OR LENGTH(TRIM(phone)) >= 10);

-- ==============================================
-- Log Success
-- ==============================================

DO $$
BEGIN
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Weak CHECK Constraints Fixed Successfully!';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Tables Updated:';
  RAISE NOTICE '- products: price, SKU, units, weight, category validation';
  RAISE NOTICE '- orders: financial amounts, total calculation validation';
  RAISE NOTICE '- order_items: quantity, prices, line total calculation';
  RAISE NOTICE '- cart_items: quantity limits';
  RAISE NOTICE '- shipping_addresses: postal code, state, phone validation';
  RAISE NOTICE '- pricing_tiers: discount percentage, min order value';
  RAISE NOTICE '- volume_discounts: quantity and discount validation';
  RAISE NOTICE '- campaigns: subject, body, recipient counts validation';
  RAISE NOTICE '- organizations: slug format, phone validation';
  RAISE NOTICE '- profiles: phone validation';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Data integrity significantly improved!';
  RAISE NOTICE '==================================================';
END $$;
