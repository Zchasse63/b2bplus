-- PART 21: NOTIFICATIONS QUEUE
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
