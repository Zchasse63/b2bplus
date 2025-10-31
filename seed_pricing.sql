-- PART 6: PRICING TIERS
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

-- PART 7: VOLUME PRICING
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

-- PART 8: CUSTOMER PRODUCT PRICES (Custom Pricing)
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

-- PART 9: CONTRACTS
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

-- PART 10: CONTRACT PRICES
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

-- PART 11: PRICE LOCKS
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
