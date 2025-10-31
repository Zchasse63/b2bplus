-- PART 1: ORGANIZATIONS
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
