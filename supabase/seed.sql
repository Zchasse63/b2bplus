-- Create test organizations
INSERT INTO organizations (id, name, slug, type)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'Acme Distributor', 'acme', 'distributor'),
  ('550e8400-e29b-41d4-a716-446655440001', 'Best Restaurant Group', 'best-restaurant', 'restaurant');

-- Create test products for Acme Distributor
INSERT INTO products (organization_id, sku, name, description, category, subcategory, brand, base_price, unit_of_measure, units_per_case, weight_lbs, dimensions_inches, in_stock, image_url)
VALUES
  (
    '550e8400-e29b-41d4-a716-446655440000',
    'CUP-16OZ-WHT-1000',
    '16oz White Paper Hot Cup',
    'Premium quality 16oz white paper hot cups, perfect for coffee and tea service. Double-walled insulation keeps drinks hot.',
    'Cups',
    'Hot Cups',
    'Solo',
    89.99,
    'case',
    1000,
    12.5,
    '{"length": 18, "width": 12, "height": 10}',
    true,
    'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440000',
    'LID-16OZ-BLK-1000',
    '16oz Black Dome Lid',
    'Black dome lid for 16oz cups with sip hole. Compatible with most 16oz hot cups.',
    'Lids',
    'Hot Lids',
    'Solo',
    45.99,
    'case',
    1000,
    8.0,
    '{"length": 16, "width": 10, "height": 8}',
    true,
    'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440000',
    'FORK-PLT-WHT-1000',
    'Heavy Weight White Plastic Fork',
    'Durable heavy-weight plastic forks. Perfect for catering and takeout. BPA-free.',
    'Utensils',
    'Forks',
    'Dart',
    34.99,
    'case',
    1000,
    6.5,
    '{"length": 12, "width": 10, "height": 4}',
    true,
    'https://images.pexels.com/photos/2762247/pexels-photo-2762247.jpeg'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440000',
    'PLATE-9IN-WHT-500',
    '9 Inch White Paper Plate',
    'Sturdy 9 inch paper plates. Grease-resistant coating. Perfect for hot and cold foods.',
    'Plates',
    'Paper Plates',
    'Hefty',
    64.99,
    'case',
    500,
    15.0,
    '{"length": 20, "width": 20, "height": 12}',
    true,
    'https://images.pexels.com/photos/4393426/pexels-photo-4393426.jpeg'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440000',
    'CONT-32OZ-CLR-240',
    '32oz Clear Deli Container with Lid',
    'Crystal clear 32oz deli containers with secure snap-on lids. Microwave and freezer safe.',
    'Containers',
    'Deli Containers',
    'Pactiv',
    119.99,
    'case',
    240,
    18.0,
    '{"length": 24, "width": 18, "height": 14}',
    true,
    'https://images.pexels.com/photos/4393668/pexels-photo-4393668.jpeg'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440000',
    'NAP-WHT-6000',
    '1-Ply White Beverage Napkin',
    'Standard 1-ply white beverage napkins. 9.5" x 9.5" size. Quarter-fold.',
    'Napkins',
    'Beverage Napkins',
    'Hoffmaster',
    42.99,
    'case',
    6000,
    10.0,
    '{"length": 16, "width": 12, "height": 10}',
    true,
    'https://images.pexels.com/photos/4397900/pexels-photo-4397900.jpeg'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440000',
    'STRAW-BLK-10000',
    '7.75" Black Unwrapped Straw',
    'Standard 7.75 inch black plastic straws. Individually unwrapped. Ideal for high-volume operations.',
    'Straws',
    'Plastic Straws',
    'Aardvark',
    28.99,
    'case',
    10000,
    8.0,
    '{"length": 18, "width": 10, "height": 8}',
    true,
    'https://images.pexels.com/photos/2531188/pexels-photo-2531188.jpeg'
  );

-- Create a test shipping address
INSERT INTO shipping_addresses (organization_id, label, contact_name, phone, street_address, city, state, postal_code, is_default)
VALUES
  (
    '550e8400-e29b-41d4-a716-446655440001',
    'Main Kitchen',
    'John Doe',
    '555-0123',
    '123 Main Street',
    'San Francisco',
    'CA',
    '94102',
    true
  );

