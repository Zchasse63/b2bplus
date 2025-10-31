-- PART 22: APPROVAL WORKFLOWS
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

-- PART 23: ORDER APPROVALS
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

-- PART 24: CONSENT RECORDS (Additional)
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

-- PART 25: CUSTOMER PREFERENCES
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

-- PART 26: AUDIT LOGS
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

-- PART 27: ORGANIZATION BRANDING
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

-- PART 28: PROMO CODE USAGE
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
