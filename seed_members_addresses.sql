-- PART 3: ORGANIZATION MEMBERS
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

-- PART 4: SHIPPING ADDRESSES
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
