-- Migration: Add cart_id column to cart_items table
-- Description: Fix missing cart_id column that was referenced but never created
-- FIXES: cart_items table schema issue where cart_id column is referenced in
--        20251031000008_create_carts_table.sql but never actually added

-- Step 1: Add cart_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cart_items' AND column_name = 'cart_id'
  ) THEN
    ALTER TABLE cart_items
      ADD COLUMN cart_id UUID REFERENCES carts(id) ON DELETE CASCADE;

    RAISE NOTICE 'Added cart_id column to cart_items table';
  ELSE
    RAISE NOTICE 'cart_id column already exists in cart_items table';
  END IF;
END $$;

-- Step 2: Create carts for users who have cart items without a cart_id
-- This handles the case where cart_items exist before the carts table was created
INSERT INTO carts (id, organization_id, user_id, status, created_at, updated_at)
SELECT
  gen_random_uuid(),
  ci.organization_id,
  ci.user_id,
  'active',
  MIN(ci.created_at),
  MAX(ci.updated_at)
FROM cart_items ci
LEFT JOIN carts c ON c.user_id = ci.user_id
  AND c.organization_id = ci.organization_id
  AND c.status = 'active'
WHERE ci.cart_id IS NULL
  AND c.id IS NULL  -- Only if no active cart exists
GROUP BY ci.organization_id, ci.user_id
ON CONFLICT DO NOTHING;

-- Step 3: Update cart_items to reference the active carts
UPDATE cart_items ci
SET cart_id = (
  SELECT c.id
  FROM carts c
  WHERE c.user_id = ci.user_id
    AND c.organization_id = ci.organization_id
    AND c.status = 'active'
  ORDER BY c.updated_at DESC
  LIMIT 1
)
WHERE ci.cart_id IS NULL;

-- Step 4: Delete any orphaned cart items that couldn't be linked to a cart
-- This shouldn't happen, but clean up just in case
DELETE FROM cart_items
WHERE cart_id IS NULL;

-- Step 5: Make cart_id NOT NULL after all items are linked
ALTER TABLE cart_items
  ALTER COLUMN cart_id SET NOT NULL;

-- Step 6: Create index on cart_id for better query performance
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id
  ON cart_items(cart_id);

-- Step 7: Drop the old unique constraint on (user_id, product_id)
-- Replace with (cart_id, product_id) to allow same product in different carts
ALTER TABLE cart_items
  DROP CONSTRAINT IF EXISTS cart_items_user_id_product_id_key;

-- Step 8: Add new unique constraint on (cart_id, product_id)
-- Ensures user can't have duplicate products in the same cart
ALTER TABLE cart_items
  DROP CONSTRAINT IF EXISTS cart_items_cart_id_product_id_key;

ALTER TABLE cart_items
  ADD CONSTRAINT cart_items_cart_id_product_id_key
  UNIQUE (cart_id, product_id);

-- Step 9: Update RLS policies to use cart_id instead of just user_id
-- Drop old policies
DROP POLICY IF EXISTS "Users can view own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can insert own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can update own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can delete own cart items" ON cart_items;

-- SECURITY: Users can only access cart items in their own carts
CREATE POLICY "Users can view own cart items"
  ON cart_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM carts
      WHERE carts.id = cart_items.cart_id
        AND carts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own cart items"
  ON cart_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM carts
      WHERE carts.id = cart_items.cart_id
        AND carts.user_id = auth.uid()
        AND carts.status = 'active'
    )
  );

CREATE POLICY "Users can update own cart items"
  ON cart_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM carts
      WHERE carts.id = cart_items.cart_id
        AND carts.user_id = auth.uid()
        AND carts.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM carts
      WHERE carts.id = cart_items.cart_id
        AND carts.user_id = auth.uid()
        AND carts.status = 'active'
    )
  );

CREATE POLICY "Users can delete own cart items"
  ON cart_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM carts
      WHERE carts.id = cart_items.cart_id
        AND carts.user_id = auth.uid()
    )
  );

-- Step 10: Add trigger to update cart's updated_at when items change
CREATE OR REPLACE FUNCTION update_cart_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update the cart's updated_at timestamp when items are added/updated/deleted
  IF TG_OP = 'DELETE' THEN
    UPDATE carts SET updated_at = NOW() WHERE id = OLD.cart_id;
    RETURN OLD;
  ELSE
    UPDATE carts SET updated_at = NOW() WHERE id = NEW.cart_id;
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_cart_on_item_change ON cart_items;
CREATE TRIGGER trigger_update_cart_on_item_change
  AFTER INSERT OR UPDATE OR DELETE ON cart_items
  FOR EACH ROW
  EXECUTE FUNCTION update_cart_timestamp();

COMMENT ON COLUMN cart_items.cart_id IS 'References the cart that contains this item';
COMMENT ON CONSTRAINT cart_items_cart_id_product_id_key ON cart_items IS 'Prevents duplicate products in same cart';
COMMENT ON FUNCTION update_cart_timestamp IS 'Updates parent cart timestamp when items change';
