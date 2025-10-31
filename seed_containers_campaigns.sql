-- PART 18: CONTAINER SESSIONS
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

-- PART 19: CAMPAIGNS
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

-- PART 20: CAMPAIGN TEMPLATES
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
