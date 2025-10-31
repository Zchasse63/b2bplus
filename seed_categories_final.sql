-- ============================================================================
-- PRODUCT CATEGORIES SEED DATA (FINAL - ALL PROPER UUIDs)
-- ============================================================================

-- Insert top-level categories
INSERT INTO categories (id, name, slug, description, parent_id, sort_order, is_active, created_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Disposable Tableware', 'disposable-tableware', 'Plates, bowls, and serving dishes', NULL, 1, true, NOW()),
  ('22222222-2222-2222-2222-222222222222', 'Drinkware', 'drinkware', 'Cups, glasses, and beverage containers', NULL, 2, true, NOW()),
  ('33333333-3333-3333-3333-333333333333', 'Cutlery & Utensils', 'cutlery-utensils', 'Forks, knives, spoons, and serving utensils', NULL, 3, true, NOW()),
  ('44444444-4444-4444-4444-444444444444', 'Food Service Paper', 'food-service-paper', 'Napkins, towels, and paper products', NULL, 4, true, NOW()),
  ('55555555-5555-5555-5555-555555555555', 'Food Storage & Containers', 'food-storage-containers', 'Containers, bags, and food storage solutions', NULL, 5, true, NOW()),
  ('66666666-6666-6666-6666-666666666666', 'Food Wrap & Foil', 'food-wrap-foil', 'Plastic wrap, aluminum foil, and food wrapping', NULL, 6, true, NOW()),
  ('77777777-7777-7777-7777-777777777777', 'Straws & Stirrers', 'straws-stirrers', 'Drinking straws and beverage stirrers', NULL, 7, true, NOW()),
  ('88888888-8888-8888-8888-888888888888', 'Lids & Covers', 'lids-covers', 'Container lids and cup covers', NULL, 8, true, NOW()),
  ('99999999-9999-9999-9999-999999999999', 'Safety & Sanitation', 'safety-sanitation', 'Gloves, masks, and sanitation products', NULL, 9, true, NOW()),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Bags & Packaging', 'bags-packaging', 'Shopping bags, takeout bags, and packaging', NULL, 10, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert second-level categories (subcategories)
INSERT INTO categories (id, name, slug, description, parent_id, sort_order, is_active, created_at)
VALUES
  -- Disposable Tableware subcategories
  ('11111111-1111-1111-1111-111111111112', 'Paper Plates', 'paper-plates', 'Disposable paper plates in various sizes', '11111111-1111-1111-1111-111111111111', 1, true, NOW()),
  ('11111111-1111-1111-1111-111111111113', 'Foam Plates', 'foam-plates', 'Lightweight foam plates', '11111111-1111-1111-1111-111111111111', 2, true, NOW()),
  ('11111111-1111-1111-1111-111111111114', 'Plastic Plates', 'plastic-plates', 'Durable plastic plates', '11111111-1111-1111-1111-111111111111', 3, true, NOW()),
  ('11111111-1111-1111-1111-111111111115', 'Bowls', 'bowls', 'Disposable bowls for soups and salads', '11111111-1111-1111-1111-111111111111', 4, true, NOW()),
  
  -- Drinkware subcategories
  ('22222222-2222-2222-2222-222222222223', 'Cold Cups', 'cold-cups', 'Cups for cold beverages', '22222222-2222-2222-2222-222222222222', 1, true, NOW()),
  ('22222222-2222-2222-2222-222222222224', 'Hot Cups', 'hot-cups', 'Insulated cups for hot beverages', '22222222-2222-2222-2222-222222222222', 2, true, NOW()),
  ('22222222-2222-2222-2222-222222222225', 'Foam Cups', 'foam-cups', 'Foam cups for hot and cold drinks', '22222222-2222-2222-2222-222222222222', 3, true, NOW()),
  
  -- Cutlery & Utensils subcategories
  ('33333333-3333-3333-3333-333333333334', 'Forks', 'forks', 'Disposable forks in various materials', '33333333-3333-3333-3333-333333333333', 1, true, NOW()),
  ('33333333-3333-3333-3333-333333333335', 'Knives', 'knives', 'Disposable knives', '33333333-3333-3333-3333-333333333333', 2, true, NOW()),
  ('33333333-3333-3333-3333-333333333336', 'Spoons', 'spoons', 'Disposable spoons', '33333333-3333-3333-3333-333333333333', 3, true, NOW()),
  ('33333333-3333-3333-3333-333333333337', 'Cutlery Sets', 'cutlery-sets', 'Pre-packaged cutlery sets', '33333333-3333-3333-3333-333333333333', 4, true, NOW()),
  
  -- Food Service Paper subcategories
  ('44444444-4444-4444-4444-444444444445', 'Beverage Napkins', 'beverage-napkins', 'Small napkins for beverages', '44444444-4444-4444-4444-444444444444', 1, true, NOW()),
  ('44444444-4444-4444-4444-444444444446', 'Dinner Napkins', 'dinner-napkins', 'Large napkins for dining', '44444444-4444-4444-4444-444444444444', 2, true, NOW()),
  ('44444444-4444-4444-4444-444444444447', 'Paper Towels', 'paper-towels', 'Absorbent paper towels', '44444444-4444-4444-4444-444444444444', 3, true, NOW()),
  
  -- Food Storage & Containers subcategories
  ('55555555-5555-5555-5555-555555555556', 'Deli Containers', 'deli-containers', 'Clear containers for deli items', '55555555-5555-5555-5555-555555555555', 1, true, NOW()),
  ('55555555-5555-5555-5555-555555555557', 'Clamshells', 'clamshells', 'Hinged takeout containers', '55555555-5555-5555-5555-555555555555', 2, true, NOW()),
  ('55555555-5555-5555-5555-555555555558', 'Food Trays', 'food-trays', 'Serving and storage trays', '55555555-5555-5555-5555-555555555555', 3, true, NOW()),
  
  -- Straws & Stirrers subcategories
  ('77777777-7777-7777-7777-777777777778', 'Paper Straws', 'paper-straws', 'Eco-friendly paper straws', '77777777-7777-7777-7777-777777777777', 1, true, NOW()),
  ('77777777-7777-7777-7777-777777777779', 'Plastic Straws', 'plastic-straws', 'Standard plastic straws', '77777777-7777-7777-7777-777777777777', 2, true, NOW()),
  ('77777777-7777-7777-7777-77777777777f', 'Jumbo Straws', 'jumbo-straws', 'Extra-wide straws for smoothies', '77777777-7777-7777-7777-777777777777', 3, true, NOW()),
  
  -- Lids & Covers subcategories
  ('88888888-8888-8888-8888-888888888889', 'Dome Lids', 'dome-lids', 'Clear dome lids for cups', '88888888-8888-8888-8888-888888888888', 1, true, NOW()),
  ('88888888-8888-8888-8888-88888888888f', 'Flat Lids', 'flat-lids', 'Flat lids for hot cups', '88888888-8888-8888-8888-888888888888', 2, true, NOW()),
  
  -- Safety & Sanitation subcategories
  ('99999999-9999-9999-9999-99999999999f', 'Gloves', 'gloves', 'Disposable food service gloves', '99999999-9999-9999-9999-999999999999', 1, true, NOW()),
  ('99999999-9999-9999-9999-99999999999e', 'Masks & Face Coverings', 'masks-face-coverings', 'Protective face masks', '99999999-9999-9999-9999-999999999999', 2, true, NOW()),
  
  -- Bags & Packaging subcategories
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'Shopping Bags', 'shopping-bags', 'T-shirt and shopping bags', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, true, NOW()),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'Paper Bags', 'paper-bags', 'Kraft paper bags for takeout', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 2, true, NOW()),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'Food Bags', 'food-bags', 'Specialty bags for food items', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 3, true, NOW())
ON CONFLICT (id) DO NOTHING;
