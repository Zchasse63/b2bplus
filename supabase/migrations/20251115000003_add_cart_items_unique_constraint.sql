-- ============================================================================
-- Add Unique Constraint to Cart Items
-- Created: 2025-11-15
-- Purpose: Prevent duplicate items in user carts and handle existing duplicates
-- ============================================================================

-- ============================================================================
-- STEP 1: Handle existing duplicates by merging quantities
-- ============================================================================

-- For each duplicate (user_id, product_id) combination, sum quantities
WITH duplicates AS (
  SELECT
    user_id,
    product_id,
    SUM(quantity) as total_quantity,
    MIN(id) as keep_id,
    array_agg(id ORDER BY created_at DESC) FILTER (WHERE id != MIN(id)) as remove_ids
  FROM cart_items
  GROUP BY user_id, product_id
  HAVING COUNT(*) > 1
)
UPDATE cart_items
SET quantity = duplicates.total_quantity,
    updated_at = now()
FROM duplicates
WHERE cart_items.id = duplicates.keep_id;

-- Delete duplicate rows (keeping the one with minimum ID)
WITH duplicates AS (
  SELECT
    user_id,
    product_id,
    MIN(id) as keep_id
  FROM cart_items
  GROUP BY user_id, product_id
  HAVING COUNT(*) > 1
)
DELETE FROM cart_items
WHERE id NOT IN (
  SELECT keep_id FROM duplicates
)
AND (user_id, product_id) IN (
  SELECT user_id, product_id FROM duplicates
);

-- ============================================================================
-- STEP 2: Add unique constraint
-- ============================================================================

-- Create unique index on (user_id, product_id)
CREATE UNIQUE INDEX idx_cart_items_user_product
ON cart_items(user_id, product_id)
WHERE deleted_at IS NULL;

-- ============================================================================
-- STEP 3: Add helper function for safe cart item operations
-- ============================================================================

CREATE OR REPLACE FUNCTION add_or_update_cart_item(
  p_user_id UUID,
  p_product_id UUID,
  p_quantity INTEGER,
  p_organization_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_cart_item_id UUID;
BEGIN
  -- Try to update existing item
  UPDATE cart_items
  SET
    quantity = quantity + p_quantity,
    updated_at = now()
  WHERE user_id = p_user_id
  AND product_id = p_product_id
  RETURNING id INTO v_cart_item_id;

  -- If no existing item, insert new one
  IF v_cart_item_id IS NULL THEN
    INSERT INTO cart_items (
      user_id,
      product_id,
      quantity,
      organization_id
    )
    VALUES (
      p_user_id,
      p_product_id,
      p_quantity,
      p_organization_id
    )
    RETURNING id INTO v_cart_item_id;
  END IF;

  RETURN v_cart_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 4: Update reorder function to use new constraint
-- ============================================================================

CREATE OR REPLACE FUNCTION reorder_items_to_cart(
  p_user_id UUID,
  p_order_id UUID
)
RETURNS TABLE (
  items_added INTEGER,
  items_skipped INTEGER
) AS $$
DECLARE
  v_item RECORD;
  v_items_added INTEGER := 0;
  v_items_skipped INTEGER := 0;
  v_organization_id UUID;
BEGIN
  -- Get user's organization
  SELECT current_organization_id INTO v_organization_id
  FROM profiles
  WHERE id = p_user_id;

  -- Loop through order items
  FOR v_item IN
    SELECT oi.product_id, oi.quantity
    FROM order_items oi
    WHERE oi.order_id = p_order_id
  LOOP
    -- Check if product exists
    IF EXISTS (SELECT 1 FROM products WHERE id = v_item.product_id) THEN
      PERFORM add_or_update_cart_item(
        p_user_id,
        v_item.product_id,
        v_item.quantity,
        v_organization_id
      );
      v_items_added := v_items_added + 1;
    ELSE
      v_items_skipped := v_items_skipped + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_items_added, v_items_skipped;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 5: Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION add_or_update_cart_item TO authenticated;
GRANT EXECUTE ON FUNCTION reorder_items_to_cart TO authenticated;

-- ============================================================================
-- STEP 6: Add comment documenting the constraint
-- ============================================================================

COMMENT ON INDEX idx_cart_items_user_product IS
'Unique constraint ensuring only one cart item per user per product.
When adding items, use add_or_update_cart_item() function to safely
handle duplicates by updating quantity instead of inserting.';
