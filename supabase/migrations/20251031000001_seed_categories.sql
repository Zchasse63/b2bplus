-- ============================================================================
-- PRODUCT CATEGORIES SEED DATA
-- ============================================================================
-- This migration creates a comprehensive product category hierarchy
-- for the B2B+ platform to improve product organization and discovery
-- ============================================================================

-- Insert top-level categories
INSERT INTO categories (id, name, slug, description, parent_id, sort_order, is_active, created_at)
VALUES
  -- Top Level Categories
  (
    'cat-1111-1111-1111-1111-111111111111',
    'Disposable Tableware',
    'disposable-tableware',
    'Plates, bowls, and serving dishes',
    NULL,
    1,
    true,
    NOW()
  ),
  (
    'cat-2222-2222-2222-2222-222222222222',
    'Drinkware',
    'drinkware',
    'Cups, glasses, and beverage containers',
    NULL,
    2,
    true,
    NOW()
  ),
  (
    'cat-3333-3333-3333-3333-333333333333',
    'Cutlery & Utensils',
    'cutlery-utensils',
    'Forks, knives, spoons, and serving utensils',
    NULL,
    3,
    true,
    NOW()
  ),
  (
    'cat-4444-4444-4444-4444-444444444444',
    'Food Service Paper',
    'food-service-paper',
    'Napkins, towels, and paper products',
    NULL,
    4,
    true,
    NOW()
  ),
  (
    'cat-5555-5555-5555-5555-555555555555',
    'Food Storage & Containers',
    'food-storage-containers',
    'Containers, bags, and food storage solutions',
    NULL,
    5,
    true,
    NOW()
  ),
  (
    'cat-6666-6666-6666-6666-666666666666',
    'Food Wrap & Foil',
    'food-wrap-foil',
    'Plastic wrap, aluminum foil, and food wrapping',
    NULL,
    6,
    true,
    NOW()
  ),
  (
    'cat-7777-7777-7777-7777-777777777777',
    'Straws & Stirrers',
    'straws-stirrers',
    'Drinking straws and beverage stirrers',
    NULL,
    7,
    true,
    NOW()
  ),
  (
    'cat-8888-8888-8888-8888-888888888888',
    'Lids & Covers',
    'lids-covers',
    'Container lids and cup covers',
    NULL,
    8,
    true,
    NOW()
  ),
  (
    'cat-9999-9999-9999-9999-999999999999',
    'Safety & Sanitation',
    'safety-sanitation',
    'Gloves, masks, and sanitation products',
    NULL,
    9,
    true,
    NOW()
  ),
  (
    'cat-aaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Bags & Packaging',
    'bags-packaging',
    'Shopping bags, takeout bags, and packaging',
    NULL,
    10,
    true,
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- Insert second-level categories (subcategories)
INSERT INTO categories (id, name, slug, description, parent_id, sort_order, is_active, created_at)
VALUES
  -- Disposable Tableware subcategories
  (
    'cat-1111-1111-1111-1111-111111111112',
    'Paper Plates',
    'paper-plates',
    'Disposable paper plates in various sizes',
    'cat-1111-1111-1111-1111-111111111111',
    1,
    true,
    NOW()
  ),
  (
    'cat-1111-1111-1111-1111-111111111113',
    'Foam Plates',
    'foam-plates',
    'Lightweight foam plates',
    'cat-1111-1111-1111-1111-111111111111',
    2,
    true,
    NOW()
  ),
  (
    'cat-1111-1111-1111-1111-111111111114',
    'Plastic Plates',
    'plastic-plates',
    'Durable plastic plates',
    'cat-1111-1111-1111-1111-111111111111',
    3,
    true,
    NOW()
  ),
  (
    'cat-1111-1111-1111-1111-111111111115',
    'Bowls',
    'bowls',
    'Disposable bowls for soups and salads',
    'cat-1111-1111-1111-1111-111111111111',
    4,
    true,
    NOW()
  ),
  
  -- Drinkware subcategories
  (
    'cat-2222-2222-2222-2222-222222222223',
    'Cold Cups',
    'cold-cups',
    'Cups for cold beverages',
    'cat-2222-2222-2222-2222-222222222222',
    1,
    true,
    NOW()
  ),
  (
    'cat-2222-2222-2222-2222-222222222224',
    'Hot Cups',
    'hot-cups',
    'Insulated cups for hot beverages',
    'cat-2222-2222-2222-2222-222222222222',
    2,
    true,
    NOW()
  ),
  (
    'cat-2222-2222-2222-2222-222222222225',
    'Foam Cups',
    'foam-cups',
    'Foam cups for hot and cold drinks',
    'cat-2222-2222-2222-2222-222222222222',
    3,
    true,
    NOW()
  ),
  
  -- Cutlery & Utensils subcategories
  (
    'cat-3333-3333-3333-3333-333333333334',
    'Forks',
    'forks',
    'Disposable forks in various materials',
    'cat-3333-3333-3333-3333-333333333333',
    1,
    true,
    NOW()
  ),
  (
    'cat-3333-3333-3333-3333-333333333335',
    'Knives',
    'knives',
    'Disposable knives',
    'cat-3333-3333-3333-3333-333333333333',
    2,
    true,
    NOW()
  ),
  (
    'cat-3333-3333-3333-3333-333333333336',
    'Spoons',
    'spoons',
    'Disposable spoons',
    'cat-3333-3333-3333-3333-333333333333',
    3,
    true,
    NOW()
  ),
  (
    'cat-3333-3333-3333-3333-333333333337',
    'Cutlery Sets',
    'cutlery-sets',
    'Pre-packaged cutlery sets',
    'cat-3333-3333-3333-3333-333333333333',
    4,
    true,
    NOW()
  ),
  
  -- Food Service Paper subcategories
  (
    'cat-4444-4444-4444-4444-444444444445',
    'Beverage Napkins',
    'beverage-napkins',
    'Small napkins for beverages',
    'cat-4444-4444-4444-4444-444444444444',
    1,
    true,
    NOW()
  ),
  (
    'cat-4444-4444-4444-4444-444444444446',
    'Dinner Napkins',
    'dinner-napkins',
    'Large napkins for dining',
    'cat-4444-4444-4444-4444-444444444444',
    2,
    true,
    NOW()
  ),
  (
    'cat-4444-4444-4444-4444-444444444447',
    'Paper Towels',
    'paper-towels',
    'Absorbent paper towels',
    'cat-4444-4444-4444-4444-444444444444',
    3,
    true,
    NOW()
  ),
  
  -- Food Storage & Containers subcategories
  (
    'cat-5555-5555-5555-5555-555555555556',
    'Deli Containers',
    'deli-containers',
    'Clear containers for deli items',
    'cat-5555-5555-5555-5555-555555555555',
    1,
    true,
    NOW()
  ),
  (
    'cat-5555-5555-5555-5555-555555555557',
    'Clamshells',
    'clamshells',
    'Hinged takeout containers',
    'cat-5555-5555-5555-5555-555555555555',
    2,
    true,
    NOW()
  ),
  (
    'cat-5555-5555-5555-5555-555555555558',
    'Food Trays',
    'food-trays',
    'Serving and storage trays',
    'cat-5555-5555-5555-5555-555555555555',
    3,
    true,
    NOW()
  ),
  
  -- Straws & Stirrers subcategories
  (
    'cat-7777-7777-7777-7777-777777777778',
    'Paper Straws',
    'paper-straws',
    'Eco-friendly paper straws',
    'cat-7777-7777-7777-7777-777777777777',
    1,
    true,
    NOW()
  ),
  (
    'cat-7777-7777-7777-7777-777777777779',
    'Plastic Straws',
    'plastic-straws',
    'Standard plastic straws',
    'cat-7777-7777-7777-7777-777777777777',
    2,
    true,
    NOW()
  ),
  (
    'cat-7777-7777-7777-7777-77777777777a',
    'Jumbo Straws',
    'jumbo-straws',
    'Extra-wide straws for smoothies',
    'cat-7777-7777-7777-7777-777777777777',
    3,
    true,
    NOW()
  ),
  
  -- Lids & Covers subcategories
  (
    'cat-8888-8888-8888-8888-888888888889',
    'Dome Lids',
    'dome-lids',
    'Clear dome lids for cups',
    'cat-8888-8888-8888-8888-888888888888',
    1,
    true,
    NOW()
  ),
  (
    'cat-8888-8888-8888-8888-88888888888a',
    'Flat Lids',
    'flat-lids',
    'Flat lids for hot cups',
    'cat-8888-8888-8888-8888-888888888888',
    2,
    true,
    NOW()
  ),
  
  -- Safety & Sanitation subcategories
  (
    'cat-9999-9999-9999-9999-99999999999a',
    'Gloves',
    'gloves',
    'Disposable food service gloves',
    'cat-9999-9999-9999-9999-999999999999',
    1,
    true,
    NOW()
  ),
  (
    'cat-9999-9999-9999-9999-99999999999b',
    'Masks & Face Coverings',
    'masks-face-coverings',
    'Protective face masks',
    'cat-9999-9999-9999-9999-999999999999',
    2,
    true,
    NOW()
  ),
  
  -- Bags & Packaging subcategories
  (
    'cat-aaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaab',
    'Shopping Bags',
    'shopping-bags',
    'T-shirt and shopping bags',
    'cat-aaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    1,
    true,
    NOW()
  ),
  (
    'cat-aaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaac',
    'Paper Bags',
    'paper-bags',
    'Kraft paper bags for takeout',
    'cat-aaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    2,
    true,
    NOW()
  ),
  (
    'cat-aaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaad',
    'Food Bags',
    'food-bags',
    'Specialty bags for food items',
    'cat-aaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    3,
    true,
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- Update existing products to assign them to categories
UPDATE products SET category_id = 'cat-2222-2222-2222-2222-222222222223' WHERE category = 'Cups' AND subcategory = 'Cold Cups';
UPDATE products SET category_id = 'cat-2222-2222-2222-2222-222222222224' WHERE category = 'Cups' AND subcategory = 'Hot Cups';
UPDATE products SET category_id = 'cat-1111-1111-1111-1111-111111111112' WHERE category = 'Plates' AND subcategory = 'Paper Plates';
UPDATE products SET category_id = 'cat-3333-3333-3333-3333-333333333334' WHERE category = 'Utensils' AND subcategory = 'Forks';
UPDATE products SET category_id = 'cat-3333-3333-3333-3333-333333333336' WHERE category = 'Utensils' AND subcategory = 'Spoons';
UPDATE products SET category_id = 'cat-3333-3333-3333-3333-333333333335' WHERE category = 'Utensils' AND subcategory = 'Knives';
UPDATE products SET category_id = 'cat-4444-4444-4444-4444-444444444445' WHERE category = 'Napkins' AND subcategory = 'Beverage Napkins';
UPDATE products SET category_id = 'cat-4444-4444-4444-4444-444444444446' WHERE category = 'Napkins' AND subcategory = 'Dinner Napkins';
UPDATE products SET category_id = 'cat-5555-5555-5555-5555-555555555556' WHERE category = 'Containers' AND subcategory = 'Deli Containers';
UPDATE products SET category_id = 'cat-5555-5555-5555-5555-555555555557' WHERE category = 'Containers' AND subcategory = 'Clamshells';
UPDATE products SET category_id = 'cat-aaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaab' WHERE category = 'Bags' AND subcategory = 'Shopping Bags';
UPDATE products SET category_id = 'cat-aaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaac' WHERE category = 'Bags' AND subcategory = 'Paper Bags';
UPDATE products SET category_id = 'cat-9999-9999-9999-9999-99999999999a' WHERE category = 'Safety' AND subcategory = 'Gloves';
UPDATE products SET category_id = 'cat-6666-6666-6666-6666-666666666666' WHERE category = 'Wrap' AND subcategory IN ('Plastic Wrap', 'Aluminum Foil');
UPDATE products SET category_id = 'cat-7777-7777-7777-7777-777777777778' WHERE category = 'Straws' AND subcategory = 'Paper Straws';
UPDATE products SET category_id = 'cat-7777-7777-7777-7777-777777777779' WHERE category = 'Straws' AND subcategory = 'Plastic Straws';
UPDATE products SET category_id = 'cat-8888-8888-8888-8888-888888888889' WHERE category = 'Lids' AND subcategory = 'Dome Lids';
