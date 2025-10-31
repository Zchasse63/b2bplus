-- PART 14: HISTORICAL ORDERS
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

-- PART 15: ORDER ITEMS
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
