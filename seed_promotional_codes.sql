-- PROMOTIONAL CODES SEED DATA
DO $$
DECLARE
  v_admin_user_id UUID;
BEGIN
  SELECT id INTO v_admin_user_id FROM auth.users WHERE email = 'admin@testmail.app' LIMIT 1;

INSERT INTO promotional_codes (
  id, organization_id, code, description,
  discount_type, discount_value, min_order_value,
  max_uses, uses_count, valid_from, valid_until,
  is_active, applicable_to, created_by, created_at
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
    v_admin_user_id,
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
    v_admin_user_id,
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
    v_admin_user_id,
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
    v_admin_user_id,
    NOW() - INTERVAL '6 months'
  ),
  (
    'promo555-5555-5555-5555-555555555555',
    '550e8400-e29b-41d4-a716-446655440000',
    'NEWCUSTOMER',
    'New customer discount - 15% off',
    'percentage',
    15.0,
    50.0,
    1000,
    234,
    NOW() - INTERVAL '6 months',
    NOW() + INTERVAL '6 months',
    true,
    'all',
    v_admin_user_id,
    NOW() - INTERVAL '6 months'
  ),
  (
    'promo666-6666-6666-6666-666666666666',
    '550e8400-e29b-41d4-a716-446655440000',
    'FREESHIP',
    'Free shipping on orders over $150',
    'free_shipping',
    0.0,
    150.0,
    500,
    67,
    NOW() - INTERVAL '2 months',
    NOW() + INTERVAL '4 months',
    true,
    'all',
    v_admin_user_id,
    NOW() - INTERVAL '2 months'
  ),
  (
    'promo777-7777-7777-7777-777777777777',
    '550e8400-e29b-41d4-a716-446655440000',
    'HOLIDAY30',
    'Holiday special - 30% off',
    'percentage',
    30.0,
    200.0,
    100,
    0,
    NOW() + INTERVAL '1 month',
    NOW() + INTERVAL '2 months',
    true,
    'all',
    v_admin_user_id,
    NOW() - INTERVAL '1 week'
  ),
  (
    'promo888-8888-8888-8888-888888888888',
    '550e8400-e29b-41d4-a716-446655440000',
    'VIP50',
    'VIP customers - $50 off orders over $300',
    'fixed_amount',
    50.0,
    300.0,
    50,
    12,
    NOW() - INTERVAL '4 months',
    NOW() + INTERVAL '8 months',
    true,
    'all',
    v_admin_user_id,
    NOW() - INTERVAL '4 months'
  )
ON CONFLICT (id) DO NOTHING;

END $$;
