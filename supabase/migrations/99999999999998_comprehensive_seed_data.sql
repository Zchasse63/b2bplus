-- ============================================================================
-- B2B+ COMPREHENSIVE SEED DATA
-- ============================================================================
-- This file contains comprehensive test data for all tables in the B2B+ platform
-- Created: October 31, 2025
-- Purpose: Enable realistic UI/UX testing and development
-- ============================================================================

-- ============================================================================
-- PART 1: ORGANIZATIONS
-- ============================================================================

-- Add new organizations (keeping existing ones)
INSERT INTO organizations (id, name, slug, type, tax_id, phone, website, created_at)
VALUES
  -- New School District
  (
    '44444444-4444-4444-4444-444444444444',
    'Metro School District',
    'metro-schools',
    'school',
    '55-1234567',
    '+1-555-0400',
    'https://metro-schools.example.com',
    NOW() - INTERVAL '8 months'
  ),
  -- New Catering Company
  (
    '55555555-5555-5555-5555-555555555555',
    'Elite Catering Co.',
    'elite-catering',
    'restaurant',
    '66-7890123',
    '+1-555-0500',
    'https://elite-catering.example.com',
    NOW() - INTERVAL '6 months'
  ),
  -- New Hotel
  (
    '66666666-6666-6666-6666-666666666666',
    'Luxury Resort & Spa',
    'luxury-resort',
    'hotel',
    '77-8901234',
    '+1-555-0600',
    'https://luxury-resort.example.com',
    NOW() - INTERVAL '10 months'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PART 2: ADDITIONAL USERS (via profiles)
-- ============================================================================
-- Note: These profiles will be created for existing auth.users
-- In a real scenario, you would create auth.users first via Supabase Auth API

-- Additional profiles for testing (assuming auth.users exist)
-- We'll use the existing users and add more organization memberships

-- ============================================================================
-- PART 3: ORGANIZATION MEMBERS
-- ============================================================================

-- Add more organization memberships for existing users
INSERT INTO organization_members (organization_id, user_id, role, created_at)
SELECT
  o.id,
  u.id,
  CASE
    WHEN o.slug = 'metro-schools' AND u.email = 'admin@testmail.app' THEN 'admin'
    WHEN o.slug = 'elite-catering' AND u.email = 'owner@testmail.app' THEN 'admin'
    WHEN o.slug = 'luxury-resort' AND u.email = 'test@testmail.app' THEN 'member'
    WHEN o.slug = 'acme' AND u.email = 'viewer@testmail.app' THEN 'viewer'
  END
FROM organizations o
CROSS JOIN auth.users u
WHERE
  (o.slug = 'metro-schools' AND u.email = 'admin@testmail.app')
  OR (o.slug = 'elite-catering' AND u.email = 'owner@testmail.app')
  OR (o.slug = 'luxury-resort' AND u.email = 'test@testmail.app')
  OR (o.slug = 'acme' AND u.email = 'viewer@testmail.app')
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- ============================================================================
-- PART 4: SHIPPING ADDRESSES
-- ============================================================================

INSERT INTO shipping_addresses (
  id, organization_id, label, contact_name, phone,
  street_address, street_address2, city, state, postal_code,
  country, delivery_instructions, is_default, created_at
)
VALUES
  -- Metro School District addresses
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '44444444-4444-4444-4444-444444444444',
    'Central Kitchen',
    'Maria Rodriguez',
    '+1-555-0401',
    '500 Education Blvd',
    'Building A',
    'New York',
    'NY',
    '10040',
    'US',
    'Deliver to loading dock, weekdays 7am-3pm only',
    true,
    NOW() - INTERVAL '8 months'
  ),
  (
    'dddddddd-dddd-dddd-dddd-ddddddddddde',
    '44444444-4444-4444-4444-444444444444',
    'North Campus',
    'James Wilson',
    '+1-555-0402',
    '1200 School Drive',
    NULL,
    'New York',
    'NY',
    '10041',
    'US',
    'Ring bell at cafeteria entrance',
    false,
    NOW() - INTERVAL '7 months'
  ),
  -- Elite Catering addresses
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '55555555-5555-5555-5555-555555555555',
    'Main Kitchen',
    'Chef Antoine Dubois',
    '+1-555-0501',
    '789 Culinary Lane',
    'Suite 200',
    'New York',
    'NY',
    '10050',
    'US',
    'Use service entrance, call upon arrival',
    true,
    NOW() - INTERVAL '6 months'
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeef',
    '55555555-5555-5555-5555-555555555555',
    'Event Warehouse',
    'Lisa Chen',
    '+1-555-0502',
    '321 Storage Way',
    'Unit 15',
    'New York',
    'NY',
    '10051',
    'US',
    'Large deliveries only, dock available',
    false,
    NOW() - INTERVAL '5 months'
  ),
  -- Luxury Resort addresses
  (
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    '66666666-6666-6666-6666-666666666666',
    'Resort Receiving',
    'Michael Thompson',
    '+1-555-0601',
    '1500 Paradise Drive',
    'Service Building',
    'New York',
    'NY',
    '10060',
    'US',
    'Deliveries 6am-2pm, use rear entrance',
    true,
    NOW() - INTERVAL '10 months'
  ),
  -- Additional address for Acme Restaurant
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaac',
    '11111111-1111-1111-1111-111111111111',
    'Westside Location',
    'Tom Anderson',
    '+1-555-0103',
    '999 West Street',
    'Floor 2',
    'New York',
    'NY',
    '10014',
    'US',
    'Elevator access required',
    false,
    NOW() - INTERVAL '4 months'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PART 5: PRODUCTS - Expanded Catalog
-- ============================================================================

-- Products for Acme Distributor (the main supplier)
INSERT INTO products (
  id, organization_id, sku, name, description,
  category, subcategory, brand, base_price,
  unit_of_measure, units_per_case, weight_lbs,
  dimensions_inches, in_stock, created_at
)
VALUES
  -- Additional Cups
  (
    'p2222222-2222-2222-2222-222222222201',
    '550e8400-e29b-41d4-a716-446655440000',
    'CUP-8OZ-CLR-2000',
    '8oz Clear Plastic Cups',
    'Small clear plastic cups for beverages',
    'Cups',
    'Cold Cups',
    'ClearServe',
    32.99,
    'case',
    2000,
    8.5,
    '{"length": 16, "width": 12, "height": 8}'::jsonb,
    true,
    NOW() - INTERVAL '11 months'
  ),
  (
    'p2222222-2222-2222-2222-222222222202',
    '550e8400-e29b-41d4-a716-446655440000',
    'CUP-20OZ-CLR-1000',
    '20oz Clear Plastic Cups',
    'Large clear plastic cups for beverages',
    'Cups',
    'Cold Cups',
    'ClearServe',
    48.99,
    'case',
    1000,
    11.0,
    '{"length": 18, "width": 14, "height": 10}'::jsonb,
    true,
    NOW() - INTERVAL '11 months'
  ),
  (
    'p2222222-2222-2222-2222-222222222203',
    '550e8400-e29b-41d4-a716-446655440000',
    'CUP-12OZ-HOT-500',
    '12oz Hot Coffee Cups',
    'Insulated hot coffee cups with sleeves',
    'Cups',
    'Hot Cups',
    'HotServe',
    44.99,
    'case',
    500,
    9.0,
    '{"length": 16, "width": 12, "height": 9}'::jsonb,
    true,
    NOW() - INTERVAL '10 months'
  ),
  -- Additional Plates
  (
    'p2222222-2222-2222-2222-222222222204',
    '550e8400-e29b-41d4-a716-446655440000',
    'PLATE-10IN-WHT-500',
    '10" White Paper Plates',
    'Large white paper plates for main courses',
    'Plates',
    'Paper Plates',
    'EcoServe',
    52.99,
    'case',
    500,
    14.0,
    '{"length": 20, "width": 14, "height": 11}'::jsonb,
    true,
    NOW() - INTERVAL '10 months'
  ),
  (
    'p2222222-2222-2222-2222-222222222205',
    '550e8400-e29b-41d4-a716-446655440000',
    'PLATE-7IN-WHT-1000',
    '7" White Paper Plates',
    'Medium white paper plates for desserts',
    'Plates',
    'Paper Plates',
    'EcoServe',
    38.99,
    'case',
    1000,
    10.0,
    '{"length": 18, "width": 12, "height": 9}'::jsonb,
    true,
    NOW() - INTERVAL '9 months'
  ),
  -- Additional Utensils
  (
    'p2222222-2222-2222-2222-222222222206',
    '550e8400-e29b-41d4-a716-446655440000',
    'SPOON-PLT-WHT-1000',
    'Heavy Weight White Plastic Spoon',
    'Durable white plastic spoons',
    'Utensils',
    'Spoons',
    'UtensilPro',
    34.99,
    'case',
    1000,
    8.0,
    '{"length": 16, "width": 10, "height": 6}'::jsonb,
    true,
    NOW() - INTERVAL '11 months'
  ),
  (
    'p2222222-2222-2222-2222-222222222207',
    '550e8400-e29b-41d4-a716-446655440000',
    'KNIFE-PLT-BLK-1000',
    'Heavy Weight Black Plastic Knife',
    'Premium black plastic knives',
    'Utensils',
    'Knives',
    'UtensilPro',
    36.99,
    'case',
    1000,
    8.5,
    '{"length": 16, "width": 10, "height": 6}'::jsonb,
    true,
    NOW() - INTERVAL '9 months'
  ),
  -- Napkins
  (
    'p2222222-2222-2222-2222-222222222208',
    '550e8400-e29b-41d4-a716-446655440000',
    'NAP-BLK-6000',
    '1-Ply Black Beverage Napkin',
    'Black cocktail napkins',
    'Napkins',
    'Beverage Napkins',
    'NapkinCo',
    44.99,
    'case',
    6000,
    12.0,
    '{"length": 18, "width": 14, "height": 10}'::jsonb,
    true,
    NOW() - INTERVAL '8 months'
  ),
  (
    'p2222222-2222-2222-2222-222222222209',
    '550e8400-e29b-41d4-a716-446655440000',
    'NAP-DINNER-WHT-3000',
    '2-Ply White Dinner Napkin',
    'Premium white dinner napkins',
    'Napkins',
    'Dinner Napkins',
    'NapkinCo',
    54.99,
    'case',
    3000,
    15.0,
    '{"length": 20, "width": 16, "height": 12}'::jsonb,
    true,
    NOW() - INTERVAL '10 months'
  ),
  -- Containers
  (
    'p2222222-2222-2222-2222-222222222210',
    '550e8400-e29b-41d4-a716-446655440000',
    'CONT-16OZ-CLR-240',
    '16oz Clear Deli Container with Lid',
    'Medium clear containers for deli items',
    'Containers',
    'Deli Containers',
    'PackRight',
    89.99,
    'case',
    240,
    10.0,
    '{"length": 18, "width": 14, "height": 10}'::jsonb,
    true,
    NOW() - INTERVAL '9 months'
  ),
  (
    'p2222222-2222-2222-2222-222222222211',
    '550e8400-e29b-41d4-a716-446655440000',
    'CONT-CLAM-6IN-200',
    '6" Clamshell Containers',
    'Small foam clamshell containers',
    'Containers',
    'Clamshells',
    'PackRight',
    48.99,
    'case',
    200,
    12.0,
    '{"length": 18, "width": 14, "height": 10}'::jsonb,
    true,
    NOW() - INTERVAL '8 months'
  ),
  -- Bags
  (
    'p2222222-2222-2222-2222-222222222212',
    '550e8400-e29b-41d4-a716-446655440000',
    'BAG-T-SHIRT-WHT-1000',
    'White T-Shirt Bags',
    'Standard white plastic shopping bags',
    'Bags',
    'Shopping Bags',
    'BagCo',
    28.99,
    'case',
    1000,
    6.0,
    '{"length": 16, "width": 12, "height": 8}'::jsonb,
    true,
    NOW() - INTERVAL '11 months'
  ),
  (
    'p2222222-2222-2222-2222-222222222213',
    '550e8400-e29b-41d4-a716-446655440000',
    'BAG-PAPER-BROWN-500',
    'Brown Paper Bags',
    'Kraft paper bags for takeout',
    'Bags',
    'Paper Bags',
    'BagCo',
    38.99,
    'case',
    500,
    15.0,
    '{"length": 18, "width": 14, "height": 10}'::jsonb,
    true,
    NOW() - INTERVAL '10 months'
  ),
  -- Gloves
  (
    'p2222222-2222-2222-2222-222222222214',
    '550e8400-e29b-41d4-a716-446655440000',
    'GLOVE-VINYL-L-1000',
    'Vinyl Gloves Large',
    'Powder-free vinyl gloves, large',
    'Safety',
    'Gloves',
    'SafetyFirst',
    42.99,
    'case',
    1000,
    5.0,
    '{"length": 12, "width": 10, "height": 6}'::jsonb,
    true,
    NOW() - INTERVAL '9 months'
  ),
  (
    'p2222222-2222-2222-2222-222222222215',
    '550e8400-e29b-41d4-a716-446655440000',
    'GLOVE-NITRILE-M-1000',
    'Nitrile Gloves Medium',
    'Powder-free nitrile gloves, medium',
    'Safety',
    'Gloves',
    'SafetyFirst',
    56.99,
    'case',
    1000,
    5.5,
    '{"length": 12, "width": 10, "height": 6}'::jsonb,
    true,
    NOW() - INTERVAL '8 months'
  ),
  -- Foil and Wrap
  (
    'p2222222-2222-2222-2222-222222222216',
    '550e8400-e29b-41d4-a716-446655440000',
    'WRAP-PLASTIC-12IN-2000FT',
    '12" Plastic Wrap Roll',
    'Commercial plastic wrap, 2000 feet',
    'Wrap',
    'Plastic Wrap',
    'WrapPro',
    68.99,
    'each',
    1,
    18.0,
    '{"length": 14, "width": 4, "height": 4}'::jsonb,
    true,
    NOW() - INTERVAL '10 months'
  ),
  (
    'p2222222-2222-2222-2222-222222222217',
    '550e8400-e29b-41d4-a716-446655440000',
    'FOIL-ROLL-12IN-1000FT',
    '12" Aluminum Foil Roll',
    'Standard aluminum foil, 1000 feet',
    'Wrap',
    'Aluminum Foil',
    'FoilPro',
    58.99,
    'each',
    1,
    15.0,
    '{"length": 14, "width": 4, "height": 4}'::jsonb,
    true,
    NOW() - INTERVAL '9 months'
  ),
  -- Straws
  (
    'p2222222-2222-2222-2222-222222222218',
    '550e8400-e29b-41d4-a716-446655440000',
    'STRAW-PAPER-WHT-5000',
    'White Paper Straws',
    'Eco-friendly white paper straws',
    'Straws',
    'Paper Straws',
    'EcoStraw',
    38.99,
    'case',
    5000,
    6.0,
    '{"length": 14, "width": 10, "height": 6}'::jsonb,
    true,
    NOW() - INTERVAL '7 months'
  ),
  (
    'p2222222-2222-2222-2222-222222222219',
    '550e8400-e29b-41d4-a716-446655440000',
    'STRAW-JUMBO-CLR-5000',
    'Jumbo Clear Plastic Straws',
    'Extra-wide clear plastic straws for smoothies',
    'Straws',
    'Plastic Straws',
    'StrawCo',
    32.99,
    'case',
    5000,
    7.0,
    '{"length": 14, "width": 10, "height": 6}'::jsonb,
    true,
    NOW() - INTERVAL '8 months'
  ),
  -- Lids
  (
    'p2222222-2222-2222-2222-222222222220',
    '550e8400-e29b-41d4-a716-446655440000',
    'LID-12OZ-WHT-1000',
    '12oz White Dome Lid',
    'Dome lids for 12oz cups',
    'Lids',
    'Dome Lids',
    'LidPro',
    38.99,
    'case',
    1000,
    6.0,
    '{"length": 16, "width": 12, "height": 8}'::jsonb,
    true,
    NOW() - INTERVAL '9 months'
  )
ON CONFLICT (id) DO NOTHING;

-- Update search vectors for new products
UPDATE products SET search_vector = 
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(category, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(brand, '')), 'C')
WHERE search_vector IS NULL;


-- ============================================================================
-- PART 6: PRICING TIERS
-- ============================================================================

INSERT INTO pricing_tiers (
  id, organization_id, product_id, tier_name,
  min_quantity, max_quantity, unit_price,
  priority, is_active, created_at
)
SELECT
  gen_random_uuid(),
  '550e8400-e29b-41d4-a716-446655440000', -- Acme Distributor
  p.id,
  CASE tier
    WHEN 1 THEN 'Standard'
    WHEN 2 THEN 'Bronze'
    WHEN 3 THEN 'Silver'
    WHEN 4 THEN 'Gold'
    WHEN 5 THEN 'Platinum'
  END,
  CASE tier
    WHEN 1 THEN 1
    WHEN 2 THEN 10
    WHEN 3 THEN 25
    WHEN 4 THEN 50
    WHEN 5 THEN 100
  END,
  CASE tier
    WHEN 1 THEN 9
    WHEN 2 THEN 24
    WHEN 3 THEN 49
    WHEN 4 THEN 99
    WHEN 5 THEN NULL
  END,
  CASE tier
    WHEN 1 THEN p.base_price
    WHEN 2 THEN p.base_price * 0.95
    WHEN 3 THEN p.base_price * 0.90
    WHEN 4 THEN p.base_price * 0.85
    WHEN 5 THEN p.base_price * 0.80
  END,
  tier,
  true,
  NOW() - INTERVAL '10 months'
FROM products p
CROSS JOIN generate_series(1, 5) AS tier
WHERE p.organization_id = '550e8400-e29b-41d4-a716-446655440000'
LIMIT 100;

-- ============================================================================
-- PART 7: VOLUME PRICING
-- ============================================================================

INSERT INTO volume_pricing (
  id, organization_id, product_id,
  min_quantity, discount_percentage,
  is_active, created_at
)
SELECT
  gen_random_uuid(),
  '550e8400-e29b-41d4-a716-446655440000',
  p.id,
  CASE vol
    WHEN 1 THEN 50
    WHEN 2 THEN 100
    WHEN 3 THEN 250
  END,
  CASE vol
    WHEN 1 THEN 5.0
    WHEN 2 THEN 10.0
    WHEN 3 THEN 15.0
  END,
  true,
  NOW() - INTERVAL '9 months'
FROM products p
CROSS JOIN generate_series(1, 3) AS vol
WHERE p.organization_id = '550e8400-e29b-41d4-a716-446655440000'
LIMIT 60;

-- ============================================================================
-- PART 8: CUSTOMER PRODUCT PRICES (Custom Pricing)
-- ============================================================================

INSERT INTO customer_product_prices (
  id, organization_id, customer_organization_id,
  product_id, custom_price, is_active, created_at
)
SELECT
  gen_random_uuid(),
  '550e8400-e29b-41d4-a716-446655440000', -- Acme Distributor
  cust.id, -- Customer organization
  p.id,
  p.base_price * 0.92, -- 8% discount for preferred customers
  true,
  NOW() - INTERVAL '8 months'
FROM products p
CROSS JOIN (
  SELECT id FROM organizations 
  WHERE id IN (
    '11111111-1111-1111-1111-111111111111', -- Acme Restaurant
    '22222222-2222-2222-2222-222222222222'  -- Grand Hotel
  )
) AS cust
WHERE p.organization_id = '550e8400-e29b-41d4-a716-446655440000'
  AND p.sku IN (
    'CUP-16OZ-WHT-1000',
    'PLATE-9IN-WHT-500',
    'FORK-PLT-WHT-1000',
    'NAP-WHT-6000',
    'CONT-32OZ-CLR-240'
  );

-- ============================================================================
-- PART 9: CONTRACTS
-- ============================================================================

INSERT INTO contracts (
  id, organization_id, customer_organization_id,
  contract_number, name, description,
  start_date, end_date, status,
  discount_percentage, created_at
)
VALUES
  (
    'c1111111-1111-1111-1111-111111111111',
    '550e8400-e29b-41d4-a716-446655440000',
    '22222222-2222-2222-2222-222222222222', -- Grand Hotel
    'CNT-2025-001',
    'Grand Hotel Annual Contract',
    'Annual supply contract with volume discounts',
    NOW() - INTERVAL '6 months',
    NOW() + INTERVAL '6 months',
    'active',
    12.0,
    NOW() - INTERVAL '6 months'
  ),
  (
    'c2222222-2222-2222-2222-222222222222',
    '550e8400-e29b-41d4-a716-446655440000',
    '33333333-3333-3333-3333-333333333333', -- City Hospital
    'CNT-2025-002',
    'City Hospital Supply Agreement',
    'Medical facility supply agreement',
    NOW() - INTERVAL '4 months',
    NOW() + INTERVAL '8 months',
    'active',
    10.0,
    NOW() - INTERVAL '4 months'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PART 10: CONTRACT PRICES
-- ============================================================================

INSERT INTO contract_prices (
  id, contract_id, product_id,
  contract_price, is_active, created_at
)
SELECT
  gen_random_uuid(),
  c.id,
  p.id,
  p.base_price * (1 - c.discount_percentage / 100),
  true,
  c.created_at
FROM contracts c
CROSS JOIN products p
WHERE p.organization_id = '550e8400-e29b-41d4-a716-446655440000'
  AND p.sku IN (
    'CUP-16OZ-WHT-1000',
    'PLATE-9IN-WHT-500',
    'FORK-PLT-WHT-1000',
    'NAP-WHT-6000',
    'CONT-32OZ-CLR-240',
    'LID-16OZ-BLK-1000',
    'STRAW-BLK-10000',
    'GLOVE-VINYL-L-1000'
  );

-- ============================================================================
-- PART 11: PRICE LOCKS
-- ============================================================================

INSERT INTO price_locks (
  id, organization_id, customer_organization_id,
  product_id, locked_price, locked_until,
  reason, is_active, created_at
)
SELECT
  gen_random_uuid(),
  '550e8400-e29b-41d4-a716-446655440000',
  '11111111-1111-1111-1111-111111111111', -- Acme Restaurant
  p.id,
  p.base_price * 0.88,
  NOW() + INTERVAL '3 months',
  'Promotional price lock for Q1 2026',
  true,
  NOW() - INTERVAL '1 month'
FROM products p
WHERE p.organization_id = '550e8400-e29b-41d4-a716-446655440000'
  AND p.sku IN ('CUP-16OZ-WHT-1000', 'PLATE-9IN-WHT-500', 'FORK-PLT-WHT-1000')
LIMIT 3;

-- ============================================================================
-- PART 12: PROMOTIONAL CODES
-- ============================================================================

INSERT INTO promotional_codes (
  id, organization_id, code, description,
  discount_type, discount_value, min_order_value,
  max_uses, uses_count, valid_from, valid_until,
  is_active, applicable_to, created_at
)
VALUES
  (
    'promo111-1111-1111-1111-111111111111',
    '550e8400-e29b-41d4-a716-446655440000',
    'SAVE10',
    '10% off orders over $100',
    'percentage',
    10.0,
    100.0,
    100,
    15,
    NOW() - INTERVAL '2 months',
    NOW() + INTERVAL '1 month',
    true,
    'all',
    NOW() - INTERVAL '2 months'
  ),
  (
    'promo222-2222-2222-2222-222222222222',
    '550e8400-e29b-41d4-a716-446655440000',
    'WELCOME25',
    '$25 off first order over $200',
    'fixed_amount',
    25.0,
    200.0,
    50,
    8,
    NOW() - INTERVAL '3 months',
    NOW() + INTERVAL '2 months',
    true,
    'all',
    NOW() - INTERVAL '3 months'
  ),
  (
    'promo333-3333-3333-3333-333333333333',
    '550e8400-e29b-41d4-a716-446655440000',
    'BULK20',
    '20% off bulk orders over $500',
    'percentage',
    20.0,
    500.0,
    25,
    5,
    NOW() - INTERVAL '1 month',
    NOW() + INTERVAL '3 months',
    true,
    'all',
    NOW() - INTERVAL '1 month'
  ),
  (
    'promo444-4444-4444-4444-444444444444',
    '550e8400-e29b-41d4-a716-446655440000',
    'EXPIRED5',
    '5% off any order (EXPIRED)',
    'percentage',
    5.0,
    0.0,
    200,
    87,
    NOW() - INTERVAL '6 months',
    NOW() - INTERVAL '1 month',
    false,
    'all',
    NOW() - INTERVAL '6 months'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PART 13: CONTAINER TYPES (Additional)
-- ============================================================================

INSERT INTO container_types (
  id, name, length_inches, width_inches,
  height_inches, max_weight_lbs, volume_cubic_ft,
  is_default, created_at
)
VALUES
  (
    'cont-typ-5555-5555-5555-555555555555',
    'Small Box',
    12.0,
    10.0,
    8.0,
    25.0,
    0.67,
    false,
    NOW() - INTERVAL '11 months'
  ),
  (
    'cont-typ-6666-6666-6666-666666666666',
    'Large Box',
    24.0,
    20.0,
    18.0,
    75.0,
    6.0,
    false,
    NOW() - INTERVAL '11 months'
  ),
  (
    'cont-typ-7777-7777-7777-777777777777',
    'Pallet',
    48.0,
    40.0,
    48.0,
    2000.0,
    53.33,
    false,
    NOW() - INTERVAL '11 months'
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- PART 14: HISTORICAL ORDERS
-- ============================================================================

-- Helper: Get user IDs for order creation
DO $$
DECLARE
  v_test_user_id UUID;
  v_admin_user_id UUID;
  v_owner_user_id UUID;
BEGIN
  SELECT id INTO v_test_user_id FROM auth.users WHERE email = 'test@testmail.app' LIMIT 1;
  SELECT id INTO v_admin_user_id FROM auth.users WHERE email = 'admin@testmail.app' LIMIT 1;
  SELECT id INTO v_owner_user_id FROM auth.users WHERE email = 'owner@testmail.app' LIMIT 1;

  -- Acme Restaurant Orders (Delivered)
  INSERT INTO orders (
    id, organization_id, user_id, order_number, po_number,
    status, subtotal, tax, shipping_cost, total,
    shipping_address_id, shipping_tracking_number, shipping_carrier,
    notes, submitted_at, shipped_at, delivered_at, created_at
  )
  VALUES
    (
      'ord11111-1111-1111-1111-111111111111',
      '11111111-1111-1111-1111-111111111111',
      v_test_user_id,
      'ORD-20250901-0001',
      'PO-2025-001',
      'delivered',
      1250.50,
      112.55,
      25.00,
      1388.05,
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'TRK1234567890',
      'FedEx',
      'Regular monthly order',
      NOW() - INTERVAL '60 days',
      NOW() - INTERVAL '58 days',
      NOW() - INTERVAL '56 days',
      NOW() - INTERVAL '60 days'
    ),
    (
      'ord11111-1111-1111-1111-111111111112',
      '11111111-1111-1111-1111-111111111111',
      v_admin_user_id,
      'ORD-20250815-0001',
      'PO-2025-002',
      'delivered',
      2340.75,
      210.67,
      35.00,
      2586.42,
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'TRK2345678901',
      'UPS',
      'Large event order',
      NOW() - INTERVAL '75 days',
      NOW() - INTERVAL '73 days',
      NOW() - INTERVAL '71 days',
      NOW() - INTERVAL '75 days'
    ),
    (
      'ord11111-1111-1111-1111-111111111113',
      '11111111-1111-1111-1111-111111111111',
      v_test_user_id,
      'ORD-20250801-0001',
      'PO-2025-003',
      'delivered',
      890.25,
      80.12,
      20.00,
      990.37,
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab',
      'TRK3456789012',
      'FedEx',
      'Downtown location restock',
      NOW() - INTERVAL '90 days',
      NOW() - INTERVAL '88 days',
      NOW() - INTERVAL '86 days',
      NOW() - INTERVAL '90 days'
    ),
    -- Acme Restaurant Orders (Shipped)
    (
      'ord11111-1111-1111-1111-111111111114',
      '11111111-1111-1111-1111-111111111111',
      v_owner_user_id,
      'ORD-20251020-0001',
      'PO-2025-004',
      'shipped',
      1567.80,
      141.10,
      30.00,
      1738.90,
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'TRK4567890123',
      'UPS',
      'Weekly restock',
      NOW() - INTERVAL '11 days',
      NOW() - INTERVAL '9 days',
      NULL,
      NOW() - INTERVAL '11 days'
    ),
    -- Acme Restaurant Orders (Processing)
    (
      'ord11111-1111-1111-1111-111111111115',
      '11111111-1111-1111-1111-111111111111',
      v_test_user_id,
      'ORD-20251028-0001',
      'PO-2025-005',
      'processing',
      945.60,
      85.10,
      25.00,
      1055.70,
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      NULL,
      NULL,
      'Rush order for weekend event',
      NOW() - INTERVAL '3 days',
      NULL,
      NULL,
      NOW() - INTERVAL '3 days'
    ),
    -- Grand Hotel Orders
    (
      'ord22222-2222-2222-2222-222222222221',
      '22222222-2222-2222-2222-222222222222',
      v_admin_user_id,
      'ORD-20250910-0001',
      'GH-PO-2025-001',
      'delivered',
      3450.00,
      310.50,
      50.00,
      3810.50,
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      'TRK5678901234',
      'FedEx',
      'Monthly hotel supplies',
      NOW() - INTERVAL '50 days',
      NOW() - INTERVAL '48 days',
      NOW() - INTERVAL '46 days',
      NOW() - INTERVAL '50 days'
    ),
    (
      'ord22222-2222-2222-2222-222222222222',
      '22222222-2222-2222-2222-222222222222',
      v_admin_user_id,
      'ORD-20251015-0001',
      'GH-PO-2025-002',
      'shipped',
      2890.50,
      260.15,
      45.00,
      3195.65,
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      'TRK6789012345',
      'UPS',
      'Conference supplies',
      NOW() - INTERVAL '16 days',
      NOW() - INTERVAL '14 days',
      NULL,
      NOW() - INTERVAL '16 days'
    ),
    -- City Hospital Orders
    (
      'ord33333-3333-3333-3333-333333333331',
      '33333333-3333-3333-3333-333333333333',
      v_admin_user_id,
      'ORD-20250920-0001',
      'CH-PO-2025-001',
      'delivered',
      1890.00,
      170.10,
      35.00,
      2095.10,
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      'TRK7890123456',
      'FedEx',
      'Cafeteria supplies',
      NOW() - INTERVAL '40 days',
      NOW() - INTERVAL '38 days',
      NOW() - INTERVAL '36 days',
      NOW() - INTERVAL '40 days'
    ),
    (
      'ord33333-3333-3333-3333-333333333332',
      '33333333-3333-3333-3333-333333333333',
      v_admin_user_id,
      'ORD-20251025-0001',
      'CH-PO-2025-002',
      'processing',
      2150.75,
      193.57,
      40.00,
      2384.32,
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      NULL,
      NULL,
      'Monthly cafeteria restock',
      NOW() - INTERVAL '6 days',
      NULL,
      NULL,
      NOW() - INTERVAL '6 days'
    );

END $$;

-- ============================================================================
-- PART 15: ORDER ITEMS
-- ============================================================================

-- Order items for the orders created above
INSERT INTO order_items (
  id, order_id, product_id, sku, name,
  quantity, unit_price, line_total, created_at
)
SELECT
  gen_random_uuid(),
  o.id,
  p.id,
  p.sku,
  p.name,
  CASE 
    WHEN random() < 0.3 THEN floor(random() * 5 + 1)::int
    WHEN random() < 0.7 THEN floor(random() * 10 + 5)::int
    ELSE floor(random() * 20 + 10)::int
  END,
  p.base_price * 0.92, -- Apply customer discount
  (CASE 
    WHEN random() < 0.3 THEN floor(random() * 5 + 1)::int
    WHEN random() < 0.7 THEN floor(random() * 10 + 5)::int
    ELSE floor(random() * 20 + 10)::int
  END) * (p.base_price * 0.92),
  o.created_at
FROM orders o
CROSS JOIN LATERAL (
  SELECT * FROM products p
  WHERE p.organization_id = '550e8400-e29b-41d4-a716-446655440000'
  ORDER BY random()
  LIMIT floor(random() * 5 + 2)::int
) p
WHERE o.id IN (
  'ord11111-1111-1111-1111-111111111111',
  'ord11111-1111-1111-1111-111111111112',
  'ord11111-1111-1111-1111-111111111113',
  'ord11111-1111-1111-1111-111111111114',
  'ord11111-1111-1111-1111-111111111115',
  'ord22222-2222-2222-2222-222222222221',
  'ord22222-2222-2222-2222-222222222222',
  'ord33333-3333-3333-3333-333333333331',
  'ord33333-3333-3333-3333-333333333332'
);

-- ============================================================================
-- PART 16: SHOPPING CARTS
-- ============================================================================

-- Create cart sessions
INSERT INTO carts (
  id, organization_id, user_id,
  status, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  om.organization_id,
  om.user_id,
  'active',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '1 hour'
FROM organization_members om
WHERE om.role IN ('member', 'admin')
LIMIT 5
ON CONFLICT DO NOTHING;

-- Add items to carts
INSERT INTO cart_items (
  id, organization_id, user_id, product_id, cart_id,
  quantity, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  c.organization_id,
  c.user_id,
  p.id,
  c.id,
  floor(random() * 10 + 1)::int,
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '30 minutes'
FROM carts c
CROSS JOIN LATERAL (
  SELECT * FROM products p
  WHERE p.organization_id = '550e8400-e29b-41d4-a716-446655440000'
  ORDER BY random()
  LIMIT floor(random() * 4 + 1)::int
) p
WHERE c.status = 'active';

-- ============================================================================
-- PART 17: ORDER TEMPLATES
-- ============================================================================

DO $$
DECLARE
  v_test_user_id UUID;
  v_admin_user_id UUID;
BEGIN
  SELECT id INTO v_test_user_id FROM auth.users WHERE email = 'test@testmail.app' LIMIT 1;
  SELECT id INTO v_admin_user_id FROM auth.users WHERE email = 'admin@testmail.app' LIMIT 1;

  INSERT INTO order_templates (
    id, organization_id, user_id, name, description,
    is_shared, use_count, last_used_at, created_at
  )
  VALUES
    (
      'tmpl1111-1111-1111-1111-111111111111',
      '11111111-1111-1111-1111-111111111111',
      v_test_user_id,
      'Weekly Restock',
      'Standard weekly restock order for main kitchen',
      true,
      15,
      NOW() - INTERVAL '3 days',
      NOW() - INTERVAL '3 months'
    ),
    (
      'tmpl1111-1111-1111-1111-111111111112',
      '11111111-1111-1111-1111-111111111111',
      v_admin_user_id,
      'Event Supplies',
      'Large event catering supplies',
      true,
      8,
      NOW() - INTERVAL '2 weeks',
      NOW() - INTERVAL '4 months'
    ),
    (
      'tmpl2222-2222-2222-2222-222222222221',
      '22222222-2222-2222-2222-222222222222',
      v_admin_user_id,
      'Hotel Monthly Order',
      'Standard monthly hotel supplies order',
      false,
      12,
      NOW() - INTERVAL '1 week',
      NOW() - INTERVAL '5 months'
    ),
    (
      'tmpl3333-3333-3333-3333-333333333331',
      '33333333-3333-3333-3333-333333333333',
      v_admin_user_id,
      'Cafeteria Restock',
      'Hospital cafeteria monthly restock',
      false,
      10,
      NOW() - INTERVAL '6 days',
      NOW() - INTERVAL '4 months'
    );

END $$;

-- ============================================================================
-- PART 18: CONTAINER SESSIONS
-- ============================================================================

DO $$
DECLARE
  v_test_user_id UUID;
  v_admin_user_id UUID;
BEGIN
  SELECT id INTO v_test_user_id FROM auth.users WHERE email = 'test@testmail.app' LIMIT 1;
  SELECT id INTO v_admin_user_id FROM auth.users WHERE email = 'admin@testmail.app' LIMIT 1;

  INSERT INTO container_sessions (
    id, organization_id, user_id, container_type_id,
    session_data, efficiency_score, total_volume_used,
    total_weight, created_at
  )
  SELECT
    gen_random_uuid(),
    '11111111-1111-1111-1111-111111111111',
    CASE WHEN random() < 0.5 THEN v_test_user_id ELSE v_admin_user_id END,
    ct.id,
    jsonb_build_object(
      'items', jsonb_build_array(
        jsonb_build_object('sku', 'PLATE-9IN-WHT-500', 'quantity', 5),
        jsonb_build_object('sku', 'CUP-16OZ-WHT-1000', 'quantity', 3),
        jsonb_build_object('sku', 'FORK-PLT-WHT-1000', 'quantity', 4)
      ),
      'packed', true
    ),
    random() * 30 + 70, -- 70-100% efficiency
    random() * ct.volume_cubic_ft * 0.9,
    random() * ct.max_weight_lbs * 0.8,
    NOW() - (random() * INTERVAL '60 days')
  FROM container_types ct
  CROSS JOIN generate_series(1, 3)
  WHERE ct.name IN ('Standard Box', 'Medium Box', 'Large Box');

END $$;


-- ============================================================================
-- PART 19: CAMPAIGNS
-- ============================================================================

DO $$
DECLARE
  v_admin_user_id UUID;
BEGIN
  SELECT id INTO v_admin_user_id FROM auth.users WHERE email = 'admin@testmail.app' LIMIT 1;

  INSERT INTO campaigns (
    id, organization_id, created_by, name, description,
    campaign_type, status, channel, scheduled_at,
    sent_at, total_recipients, successful_sends,
    failed_sends, open_rate, click_rate, created_at
  )
  VALUES
    (
      'camp1111-1111-1111-1111-111111111111',
      '550e8400-e29b-41d4-a716-446655440000',
      v_admin_user_id,
      'Fall Promotion 2025',
      'Fall seasonal promotion with 15% discount',
      'promotional',
      'completed',
      'email',
      NOW() - INTERVAL '30 days',
      NOW() - INTERVAL '30 days',
      150,
      148,
      2,
      42.5,
      18.3,
      NOW() - INTERVAL '35 days'
    ),
    (
      'camp2222-2222-2222-2222-222222222222',
      '550e8400-e29b-41d4-a716-446655440000',
      v_admin_user_id,
      'Back in Stock Alert',
      'Popular items back in stock notification',
      'back_in_stock',
      'completed',
      'email',
      NOW() - INTERVAL '15 days',
      NOW() - INTERVAL '15 days',
      85,
      85,
      0,
      65.2,
      34.7,
      NOW() - INTERVAL '16 days'
    ),
    (
      'camp3333-3333-3333-3333-333333333333',
      '550e8400-e29b-41d4-a716-446655440000',
      v_admin_user_id,
      'Cart Abandonment Reminder',
      'Reminder for abandoned shopping carts',
      'cart_abandonment',
      'completed',
      'email',
      NOW() - INTERVAL '7 days',
      NOW() - INTERVAL '7 days',
      45,
      45,
      0,
      55.6,
      28.9,
      NOW() - INTERVAL '8 days'
    ),
    (
      'camp4444-4444-4444-4444-444444444444',
      '550e8400-e29b-41d4-a716-446655440000',
      v_admin_user_id,
      'Holiday Special 2025',
      'End of year holiday promotion',
      'promotional',
      'scheduled',
      'email',
      NOW() + INTERVAL '30 days',
      NULL,
      0,
      0,
      0,
      NULL,
      NULL,
      NOW() - INTERVAL '5 days'
    );

END $$;

-- ============================================================================
-- PART 20: CAMPAIGN TEMPLATES
-- ============================================================================

DO $$
DECLARE
  v_admin_user_id UUID;
BEGIN
  SELECT id INTO v_admin_user_id FROM auth.users WHERE email = 'admin@testmail.app' LIMIT 1;

  INSERT INTO campaign_templates (
    id, organization_id, created_by, name, description,
    campaign_type, subject_line, email_content,
    variables, use_count, last_used_at, created_at
  )
  VALUES
    (
      'ctmpl111-1111-1111-1111-111111111111',
      '550e8400-e29b-41d4-a716-446655440000',
      v_admin_user_id,
      'Promotional Email Template',
      'Standard promotional email template',
      'promotional',
      'Special Offer: {{discount_percentage}}% Off!',
      '<h1>Special Offer Just for You!</h1><p>Get {{discount_percentage}}% off your next order.</p>',
      ARRAY['discount_percentage', 'promo_code', 'expiry_date'],
      8,
      NOW() - INTERVAL '30 days',
      NOW() - INTERVAL '6 months'
    ),
    (
      'ctmpl222-2222-2222-2222-222222222222',
      '550e8400-e29b-41d4-a716-446655440000',
      v_admin_user_id,
      'Back in Stock Template',
      'Product availability notification',
      'back_in_stock',
      '{{product_name}} is Back in Stock!',
      '<h1>Good News!</h1><p>{{product_name}} is now available.</p>',
      ARRAY['product_name', 'product_sku', 'product_url'],
      5,
      NOW() - INTERVAL '15 days',
      NOW() - INTERVAL '5 months'
    );

END $$;

-- ============================================================================
-- PART 21: NOTIFICATIONS QUEUE
-- ============================================================================

DO $$
DECLARE
  v_test_user_id UUID;
  v_admin_user_id UUID;
BEGIN
  SELECT id INTO v_test_user_id FROM auth.users WHERE email = 'test@testmail.app' LIMIT 1;
  SELECT id INTO v_admin_user_id FROM auth.users WHERE email = 'admin@testmail.app' LIMIT 1;

  INSERT INTO notifications_queue (
    id, user_id, type, channel, subject, body,
    recipient_email, recipient_phone, order_id,
    status, sent_at, created_at
  )
  VALUES
    -- Email notifications
    (
      gen_random_uuid(),
      v_test_user_id,
      'order_confirmation',
      'email',
      'Order Confirmation - ORD-20251028-0001',
      'Your order has been confirmed and is being processed.',
      'test@testmail.app',
      NULL,
      'ord11111-1111-1111-1111-111111111115',
      'sent',
      NOW() - INTERVAL '3 days',
      NOW() - INTERVAL '3 days'
    ),
    (
      gen_random_uuid(),
      v_test_user_id,
      'order_shipped',
      'email',
      'Order Shipped - ORD-20251020-0001',
      'Your order has been shipped. Tracking: TRK4567890123',
      'test@testmail.app',
      NULL,
      'ord11111-1111-1111-1111-111111111114',
      'sent',
      NOW() - INTERVAL '9 days',
      NOW() - INTERVAL '9 days'
    ),
    -- SMS notifications
    (
      gen_random_uuid(),
      v_admin_user_id,
      'order_delivered',
      'sms',
      NULL,
      'Your order ORD-20250910-0001 has been delivered.',
      NULL,
      '+1-555-1002',
      'ord22222-2222-2222-2222-222222222221',
      'sent',
      NOW() - INTERVAL '46 days',
      NOW() - INTERVAL '46 days'
    ),
    -- Pending notifications
    (
      gen_random_uuid(),
      v_test_user_id,
      'price_drop',
      'email',
      'Price Drop Alert',
      'Products in your cart are now on sale!',
      'test@testmail.app',
      NULL,
      NULL,
      'pending',
      NULL,
      NOW() - INTERVAL '2 hours'
    );

END $$;

-- ============================================================================
-- PART 22: APPROVAL WORKFLOWS
-- ============================================================================

INSERT INTO approval_workflows (
  id, organization_id, name, description,
  min_order_value, required_approvers, approval_steps,
  is_active, created_at
)
VALUES
  (
    'apwf1111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222', -- Grand Hotel
    'Large Order Approval',
    'Approval required for orders over $2000',
    2000.0,
    1,
    jsonb_build_array(
      jsonb_build_object('step', 1, 'role', 'admin', 'description', 'Admin approval required')
    ),
    true,
    NOW() - INTERVAL '6 months'
  ),
  (
    'apwf2222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333', -- City Hospital
    'Budget Approval Workflow',
    'Multi-step approval for hospital purchases',
    1500.0,
    2,
    jsonb_build_array(
      jsonb_build_object('step', 1, 'role', 'admin', 'description', 'Department head approval'),
      jsonb_build_object('step', 2, 'role', 'owner', 'description', 'Finance approval')
    ),
    true,
    NOW() - INTERVAL '4 months'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PART 23: ORDER APPROVALS
-- ============================================================================

DO $$
DECLARE
  v_admin_user_id UUID;
BEGIN
  SELECT id INTO v_admin_user_id FROM auth.users WHERE email = 'admin@testmail.app' LIMIT 1;

  INSERT INTO order_approvals (
    id, order_id, workflow_id, current_step,
    status, requested_at, created_at
  )
  VALUES
    (
      'appr1111-1111-1111-1111-111111111111',
      'ord22222-2222-2222-2222-222222222222',
      'apwf1111-1111-1111-1111-111111111111',
      1,
      'approved',
      NOW() - INTERVAL '16 days',
      NOW() - INTERVAL '16 days'
    ),
    (
      'appr2222-2222-2222-2222-222222222222',
      'ord33333-3333-3333-3333-333333333332',
      'apwf2222-2222-2222-2222-222222222222',
      1,
      'pending',
      NOW() - INTERVAL '6 days',
      NOW() - INTERVAL '6 days'
    );

  -- Approval history
  INSERT INTO approval_history (
    id, approval_id, approver_id, action,
    comments, step_number, created_at
  )
  VALUES
    (
      gen_random_uuid(),
      'appr1111-1111-1111-1111-111111111111',
      v_admin_user_id,
      'approved',
      'Approved for conference supplies',
      1,
      NOW() - INTERVAL '15 days'
    );

END $$;

-- ============================================================================
-- PART 24: CONSENT RECORDS (Additional)
-- ============================================================================

INSERT INTO consent_records (
  user_id, consent_type, granted, ip_address, granted_at
)
SELECT
  u.id,
  consent_type,
  true,
  '127.0.0.1'::inet,
  NOW() - INTERVAL '6 months'
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

-- ============================================================================
-- PART 25: CUSTOMER PREFERENCES
-- ============================================================================

DO $$
DECLARE
  v_test_user_id UUID;
  v_admin_user_id UUID;
BEGIN
  SELECT id INTO v_test_user_id FROM auth.users WHERE email = 'test@testmail.app' LIMIT 1;
  SELECT id INTO v_admin_user_id FROM auth.users WHERE email = 'admin@testmail.app' LIMIT 1;

  INSERT INTO customer_preferences (
    id, user_id, organization_id, preference_key,
    preference_value, category, created_at
  )
  VALUES
    (
      gen_random_uuid(),
      v_test_user_id,
      '11111111-1111-1111-1111-111111111111',
      'email_notifications',
      'true',
      'notifications',
      NOW() - INTERVAL '6 months'
    ),
    (
      gen_random_uuid(),
      v_test_user_id,
      '11111111-1111-1111-1111-111111111111',
      'sms_notifications',
      'false',
      'notifications',
      NOW() - INTERVAL '6 months'
    ),
    (
      gen_random_uuid(),
      v_admin_user_id,
      '22222222-2222-2222-2222-222222222222',
      'default_shipping_address',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      'shipping',
      NOW() - INTERVAL '5 months'
    ),
    (
      gen_random_uuid(),
      v_admin_user_id,
      '22222222-2222-2222-2222-222222222222',
      'order_approval_threshold',
      '2000',
      'ordering',
      NOW() - INTERVAL '4 months'
    );

END $$;

-- ============================================================================
-- PART 26: AUDIT LOGS
-- ============================================================================

DO $$
DECLARE
  v_test_user_id UUID;
  v_admin_user_id UUID;
  v_owner_user_id UUID;
BEGIN
  SELECT id INTO v_test_user_id FROM auth.users WHERE email = 'test@testmail.app' LIMIT 1;
  SELECT id INTO v_admin_user_id FROM auth.users WHERE email = 'admin@testmail.app' LIMIT 1;
  SELECT id INTO v_owner_user_id FROM auth.users WHERE email = 'owner@testmail.app' LIMIT 1;

  INSERT INTO audit_logs (
    id, user_id, organization_id, action,
    entity_type, entity_id, changes, ip_address, created_at
  )
  VALUES
    -- Order creation logs
    (
      gen_random_uuid(),
      v_test_user_id,
      '11111111-1111-1111-1111-111111111111',
      'create',
      'order',
      'ord11111-1111-1111-1111-111111111115',
      jsonb_build_object('status', 'submitted', 'total', 1055.70),
      '192.168.1.100',
      NOW() - INTERVAL '3 days'
    ),
    -- Product updates
    (
      gen_random_uuid(),
      v_admin_user_id,
      '550e8400-e29b-41d4-a716-446655440000',
      'update',
      'product',
      'p2222222-2222-2222-2222-222222222201',
      jsonb_build_object('base_price', jsonb_build_object('old', 34.99, 'new', 32.99)),
      '192.168.1.101',
      NOW() - INTERVAL '10 days'
    ),
    -- User login logs
    (
      gen_random_uuid(),
      v_test_user_id,
      '11111111-1111-1111-1111-111111111111',
      'login',
      'user',
      v_test_user_id::text,
      jsonb_build_object('method', 'email_password'),
      '192.168.1.100',
      NOW() - INTERVAL '1 day'
    ),
    (
      gen_random_uuid(),
      v_admin_user_id,
      '22222222-2222-2222-2222-222222222222',
      'login',
      'user',
      v_admin_user_id::text,
      jsonb_build_object('method', 'email_password'),
      '192.168.1.102',
      NOW() - INTERVAL '2 hours'
    );

END $$;

-- ============================================================================
-- PART 27: ORGANIZATION BRANDING
-- ============================================================================

INSERT INTO organization_branding (
  id, organization_id, logo_url, primary_color,
  secondary_color, custom_css, created_at
)
VALUES
  (
    gen_random_uuid(),
    '11111111-1111-1111-1111-111111111111',
    'https://example.com/logos/acme-restaurant.png',
    '#FF6B35',
    '#004E89',
    '.header { background-color: #FF6B35; }',
    NOW() - INTERVAL '8 months'
  ),
  (
    gen_random_uuid(),
    '22222222-2222-2222-2222-222222222222',
    'https://example.com/logos/grand-hotel.png',
    '#1A535C',
    '#FFE66D',
    '.header { background-color: #1A535C; }',
    NOW() - INTERVAL '6 months'
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 28: PROMO CODE USAGE
-- ============================================================================

DO $$
DECLARE
  v_test_user_id UUID;
  v_admin_user_id UUID;
BEGIN
  SELECT id INTO v_test_user_id FROM auth.users WHERE email = 'test@testmail.app' LIMIT 1;
  SELECT id INTO v_admin_user_id FROM auth.users WHERE email = 'admin@testmail.app' LIMIT 1;

  INSERT INTO promo_code_usage (
    id, promo_code_id, user_id, order_id,
    discount_amount, used_at
  )
  VALUES
    (
      gen_random_uuid(),
      'promo111-1111-1111-1111-111111111111',
      v_test_user_id,
      'ord11111-1111-1111-1111-111111111111',
      125.05,
      NOW() - INTERVAL '60 days'
    ),
    (
      gen_random_uuid(),
      'promo222-2222-2222-2222-222222222222',
      v_admin_user_id,
      'ord22222-2222-2222-2222-222222222221',
      25.00,
      NOW() - INTERVAL '50 days'
    ),
    (
      gen_random_uuid(),
      'promo111-1111-1111-1111-111111111111',
      v_test_user_id,
      'ord11111-1111-1111-1111-111111111113',
      89.03,
      NOW() - INTERVAL '90 days'
    );

END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================

DO $$
DECLARE
  v_org_count INTEGER;
  v_product_count INTEGER;
  v_order_count INTEGER;
  v_cart_count INTEGER;
  v_pricing_tier_count INTEGER;
  v_promo_code_count INTEGER;
  v_campaign_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_org_count FROM organizations;
  SELECT COUNT(*) INTO v_product_count FROM products;
  SELECT COUNT(*) INTO v_order_count FROM orders;
  SELECT COUNT(*) INTO v_cart_count FROM cart_items;
  SELECT COUNT(*) INTO v_pricing_tier_count FROM pricing_tiers;
  SELECT COUNT(*) INTO v_promo_code_count FROM promotional_codes;
  SELECT COUNT(*) INTO v_campaign_count FROM campaigns;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'COMPREHENSIVE SEED DATA COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Organizations: %', v_org_count;
  RAISE NOTICE 'Products: %', v_product_count;
  RAISE NOTICE 'Orders: %', v_order_count;
  RAISE NOTICE 'Cart Items: %', v_cart_count;
  RAISE NOTICE 'Pricing Tiers: %', v_pricing_tier_count;
  RAISE NOTICE 'Promotional Codes: %', v_promo_code_count;
  RAISE NOTICE 'Campaigns: %', v_campaign_count;
  RAISE NOTICE '========================================';
END $$;

