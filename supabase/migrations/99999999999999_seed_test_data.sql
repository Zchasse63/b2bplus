-- ============================================================================
-- COMPREHENSIVE TEST DATA SEED FILE
-- ============================================================================
-- This migration seeds the database with realistic test data for E2E testing
-- 
-- SAFETY: Only runs in development/test environments
-- IDEMPOTENT: Can be run multiple times safely (uses ON CONFLICT)
--
-- Test Users Created:
-- 1. test@testmail.app (Regular User) - Password: TestPassword123!
-- 2. admin@testmail.app (Admin User) - Password: AdminPassword123!
-- 3. owner@testmail.app (Organization Owner) - Password: OwnerPassword123!
-- 4. viewer@testmail.app (Viewer User) - Password: ViewerPassword123!
--
-- Organizations Created:
-- 1. Acme Restaurant Group (restaurant)
-- 2. Grand Hotel Chain (hotel)
-- 3. City Hospital (hospital)
--
-- ============================================================================

-- ============================================================================
-- ENVIRONMENT SAFETY CHECK
-- ============================================================================
DO $$
BEGIN
  -- Only allow in development/test environments
  -- Production databases should have a 'environment' setting
  IF current_setting('app.environment', true) = 'production' THEN
    RAISE EXCEPTION 'Cannot seed test data in production environment';
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    -- Setting doesn't exist, assume development
    RAISE NOTICE 'No environment setting found, assuming development';
END $$;

-- ============================================================================
-- TEST USERS
-- ============================================================================
-- NOTE: Test users must be created via Supabase Admin API or Dashboard
-- This migration assumes users already exist or will be created separately
-- See TEST-DATA-DOCUMENTATION.md for user creation instructions

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'IMPORTANT: Create test users manually';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Use Supabase Dashboard or Admin API to create:';
  RAISE NOTICE '  test@testmail.app / TestPassword123!';
  RAISE NOTICE '  admin@testmail.app / AdminPassword123!';
  RAISE NOTICE '  owner@testmail.app / OwnerPassword123!';
  RAISE NOTICE '  viewer@testmail.app / ViewerPassword123!';
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- ORGANIZATIONS
-- ============================================================================

-- Insert test organizations
INSERT INTO organizations (id, name, slug, type, tax_id, phone, website)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'Acme Restaurant Group',
    'acme-restaurant',
    'restaurant',
    '12-3456789',
    '+1-555-0100',
    'https://acme-restaurant.example.com'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Grand Hotel Chain',
    'grand-hotel',
    'hotel',
    '98-7654321',
    '+1-555-0200',
    'https://grand-hotel.example.com'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'City Hospital',
    'city-hospital',
    'hospital',
    '45-6789012',
    '+1-555-0300',
    'https://city-hospital.example.com'
  )
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'Created 3 test organizations';
END $$;

-- ============================================================================
-- USER PROFILES
-- ============================================================================

-- Create profiles for test users
INSERT INTO profiles (id, email, full_name, phone, current_organization_id)
SELECT
  u.id,
  u.email,
  u.raw_user_meta_data->>'full_name',
  CASE
    WHEN u.email = 'test@testmail.app' THEN '+1-555-1001'
    WHEN u.email = 'admin@testmail.app' THEN '+1-555-1002'
    WHEN u.email = 'owner@testmail.app' THEN '+1-555-1003'
    WHEN u.email = 'viewer@testmail.app' THEN '+1-555-1004'
  END,
  CASE
    WHEN u.email IN ('test@testmail.app', 'admin@testmail.app', 'owner@testmail.app')
      THEN '11111111-1111-1111-1111-111111111111'
    WHEN u.email = 'viewer@testmail.app'
      THEN '22222222-2222-2222-2222-222222222222'
  END
FROM auth.users u
WHERE u.email IN ('test@testmail.app', 'admin@testmail.app', 'owner@testmail.app', 'viewer@testmail.app')
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    current_organization_id = EXCLUDED.current_organization_id,
    updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'Created profiles for test users';
END $$;

-- ============================================================================
-- ORGANIZATION MEMBERS
-- ============================================================================

-- Assign users to organizations with roles
INSERT INTO organization_members (organization_id, user_id, role)
SELECT
  o.id,
  u.id,
  CASE
    WHEN u.email = 'owner@testmail.app' THEN 'owner'
    WHEN u.email = 'admin@testmail.app' THEN 'admin'
    WHEN u.email = 'test@testmail.app' THEN 'member'
    WHEN u.email = 'viewer@testmail.app' AND o.slug = 'grand-hotel' THEN 'viewer'
  END
FROM organizations o
CROSS JOIN auth.users u
WHERE
  (o.slug = 'acme-restaurant' AND u.email IN ('owner@testmail.app', 'admin@testmail.app', 'test@testmail.app'))
  OR (o.slug = 'grand-hotel' AND u.email = 'viewer@testmail.app')
  OR (o.slug = 'city-hospital' AND u.email = 'admin@testmail.app')
ON CONFLICT (organization_id, user_id) DO UPDATE
SET role = EXCLUDED.role;

DO $$
BEGIN
  RAISE NOTICE 'Assigned users to organizations';
END $$;

-- ============================================================================
-- SHIPPING ADDRESSES
-- ============================================================================

-- Create shipping addresses for organizations
INSERT INTO shipping_addresses (
  id,
  organization_id,
  label,
  contact_name,
  phone,
  street_address,
  street_address2,
  city,
  state,
  postal_code,
  country,
  delivery_instructions,
  is_default
)
VALUES
  -- Acme Restaurant addresses
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'Main Kitchen',
    'John Smith',
    '+1-555-0101',
    '123 Main Street',
    'Suite 100',
    'New York',
    'NY',
    '10001',
    'US',
    'Deliver to back entrance',
    true
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab',
    '11111111-1111-1111-1111-111111111111',
    'Downtown Location',
    'Jane Doe',
    '+1-555-0102',
    '456 Broadway',
    NULL,
    'New York',
    'NY',
    '10013',
    'US',
    'Ring doorbell',
    false
  ),
  -- Grand Hotel address
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '22222222-2222-2222-2222-222222222222',
    'Hotel Receiving',
    'Bob Johnson',
    '+1-555-0201',
    '789 Park Avenue',
    'Loading Dock B',
    'New York',
    'NY',
    '10021',
    'US',
    'Call 30 minutes before delivery',
    true
  ),
  -- City Hospital address
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '33333333-3333-3333-3333-333333333333',
    'Hospital Cafeteria',
    'Dr. Sarah Williams',
    '+1-555-0301',
    '321 Hospital Drive',
    'Building C',
    'New York',
    'NY',
    '10032',
    'US',
    'Deliver to cafeteria loading dock',
    true
  )
ON CONFLICT (id) DO UPDATE
SET label = EXCLUDED.label,
    contact_name = EXCLUDED.contact_name,
    phone = EXCLUDED.phone;

DO $$
BEGIN
  RAISE NOTICE 'Created shipping addresses';
END $$;

-- ============================================================================
-- PRODUCTS
-- ============================================================================

-- Insert test products for Acme Restaurant
INSERT INTO products (
  id,
  organization_id,
  sku,
  name,
  description,
  category,
  subcategory,
  brand,
  base_price,
  unit_of_measure,
  units_per_case,
  weight_lbs,
  dimensions_inches,
  in_stock,
  image_url
)
VALUES
  -- Disposable Plates
  (
    'p1111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'PLATE-9IN-WHT-500',
    '9" White Paper Plates',
    'Heavy-duty 9-inch white paper plates, perfect for main courses',
    'Disposables',
    'Plates',
    'EcoServe',
    45.99,
    'case',
    500,
    12.5,
    '{"length": 18, "width": 12, "height": 10}'::jsonb,
    true,
    'https://example.com/images/plate-9in-white.jpg'
  ),
  (
    'p1111111-1111-1111-1111-111111111112',
    '11111111-1111-1111-1111-111111111111',
    'PLATE-6IN-WHT-1000',
    '6" White Paper Plates',
    'Dessert-sized 6-inch white paper plates',
    'Disposables',
    'Plates',
    'EcoServe',
    32.99,
    'case',
    1000,
    10.0,
    '{"length": 15, "width": 10, "height": 8}'::jsonb,
    true,
    'https://example.com/images/plate-6in-white.jpg'
  ),
  -- Cups
  (
    'p1111111-1111-1111-1111-111111111113',
    '11111111-1111-1111-1111-111111111111',
    'CUP-12OZ-CLR-1000',
    '12oz Clear Plastic Cups',
    'Crystal-clear 12oz plastic cups for cold beverages',
    'Disposables',
    'Cups',
    'ClearView',
    38.99,
    'case',
    1000,
    8.5,
    '{"length": 16, "width": 12, "height": 14}'::jsonb,
    true,
    'https://example.com/images/cup-12oz-clear.jpg'
  ),
  (
    'p1111111-1111-1111-1111-111111111114',
    '11111111-1111-1111-1111-111111111111',
    'CUP-16OZ-HOT-500',
    '16oz Hot Coffee Cups',
    'Insulated 16oz cups for hot beverages with lids',
    'Disposables',
    'Cups',
    'HotServe',
    52.99,
    'case',
    500,
    11.0,
    '{"length": 18, "width": 14, "height": 16}'::jsonb,
    true,
    'https://example.com/images/cup-16oz-hot.jpg'
  ),
  -- Cutlery
  (
    'p1111111-1111-1111-1111-111111111115',
    '11111111-1111-1111-1111-111111111111',
    'FORK-PLSTC-WHT-1000',
    'White Plastic Forks',
    'Heavy-duty white plastic forks',
    'Disposables',
    'Cutlery',
    'EcoServe',
    28.99,
    'case',
    1000,
    6.5,
    '{"length": 14, "width": 10, "height": 6}'::jsonb,
    true,
    'https://example.com/images/fork-plastic-white.jpg'
  ),
  (
    'p1111111-1111-1111-1111-111111111116',
    '11111111-1111-1111-1111-111111111111',
    'KNIFE-PLSTC-WHT-1000',
    'White Plastic Knives',
    'Heavy-duty white plastic knives',
    'Disposables',
    'Cutlery',
    'EcoServe',
    28.99,
    'case',
    1000,
    6.5,
    '{"length": 14, "width": 10, "height": 6}'::jsonb,
    true,
    'https://example.com/images/knife-plastic-white.jpg'
  ),
  -- Napkins
  (
    'p1111111-1111-1111-1111-111111111117',
    '11111111-1111-1111-1111-111111111111',
    'NAPKIN-DINNER-WHT-3000',
    'White Dinner Napkins',
    '2-ply white dinner napkins, 15" x 17"',
    'Disposables',
    'Napkins',
    'SoftTouch',
    42.99,
    'case',
    3000,
    15.0,
    '{"length": 20, "width": 16, "height": 12}'::jsonb,
    true,
    'https://example.com/images/napkin-dinner-white.jpg'
  ),
  -- Takeout Containers
  (
    'p1111111-1111-1111-1111-111111111118',
    '11111111-1111-1111-1111-111111111111',
    'CONT-CLAM-9IN-150',
    '9" Clamshell Containers',
    'Hinged 9-inch foam clamshell containers for takeout',
    'Disposables',
    'Containers',
    'PackRight',
    65.99,
    'case',
    150,
    18.0,
    '{"length": 22, "width": 18, "height": 14}'::jsonb,
    true,
    'https://example.com/images/container-clamshell-9in.jpg'
  ),
  (
    'p1111111-1111-1111-1111-111111111119',
    '11111111-1111-1111-1111-111111111111',
    'CONT-RECT-32OZ-240',
    '32oz Rectangular Containers',
    'Microwavable 32oz rectangular containers with lids',
    'Disposables',
    'Containers',
    'PackRight',
    58.99,
    'case',
    240,
    14.5,
    '{"length": 20, "width": 16, "height": 12}'::jsonb,
    true,
    'https://example.com/images/container-rect-32oz.jpg'
  ),
  -- Aluminum Foil
  (
    'p1111111-1111-1111-1111-111111111120',
    '11111111-1111-1111-1111-111111111111',
    'FOIL-ROLL-18IN-500FT',
    '18" Aluminum Foil Roll',
    'Heavy-duty 18-inch aluminum foil, 500 feet per roll',
    'Disposables',
    'Foil & Wrap',
    'FoilPro',
    89.99,
    'each',
    1,
    25.0,
    '{"length": 20, "width": 4, "height": 4}'::jsonb,
    true,
    'https://example.com/images/foil-roll-18in.jpg'
  )
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    base_price = EXCLUDED.base_price,
    in_stock = EXCLUDED.in_stock,
    updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'Created 10 test products';
END $$;

-- ============================================================================
-- CONSENT RECORDS
-- ============================================================================

-- Create consent records for test users
INSERT INTO consent_records (user_id, consent_type, granted, ip_address, granted_at)
SELECT
  u.id,
  consent_type,
  true,
  '127.0.0.1'::inet,
  NOW()
FROM auth.users u
CROSS JOIN (
  VALUES
    ('terms_of_service'),
    ('privacy_policy'),
    ('data_processing'),
    ('marketing'),
    ('analytics')
) AS consents(consent_type)
WHERE u.email IN ('test@testmail.app', 'admin@testmail.app', 'owner@testmail.app', 'viewer@testmail.app')
ON CONFLICT DO NOTHING;

DO $$
BEGIN
  RAISE NOTICE 'Created consent records for test users';
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================

DO $$
DECLARE
  v_user_count INTEGER;
  v_org_count INTEGER;
  v_product_count INTEGER;
  v_address_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_user_count FROM auth.users WHERE email LIKE '%@example.com';
  SELECT COUNT(*) INTO v_org_count FROM organizations;
  SELECT COUNT(*) INTO v_product_count FROM products;
  SELECT COUNT(*) INTO v_address_count FROM shipping_addresses;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST DATA SEED COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Users created: %', v_user_count;
  RAISE NOTICE 'Organizations created: %', v_org_count;
  RAISE NOTICE 'Products created: %', v_product_count;
  RAISE NOTICE 'Shipping addresses created: %', v_address_count;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Test User Credentials:';
  RAISE NOTICE '  test@testmail.app / TestPassword123!';
  RAISE NOTICE '  admin@testmail.app / AdminPassword123!';
  RAISE NOTICE '  owner@testmail.app / OwnerPassword123!';
  RAISE NOTICE '  viewer@testmail.app / ViewerPassword123!';
  RAISE NOTICE '========================================';
END $$;

