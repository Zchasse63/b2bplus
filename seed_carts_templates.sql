-- PART 16: SHOPPING CARTS

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

-- PART 17: ORDER TEMPLATES
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
