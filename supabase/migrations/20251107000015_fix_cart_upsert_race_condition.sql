-- Migration: Fix race condition in cart item upsert operations
-- This migration creates a database function to atomically upsert cart items
-- with proper quantity incrementing, preventing race conditions

-- Drop function if exists
DROP FUNCTION IF EXISTS upsert_cart_item_atomic;

-- Create function to atomically upsert cart item with quantity increment
CREATE OR REPLACE FUNCTION upsert_cart_item_atomic(
  p_user_id UUID,
  p_product_id UUID,
  p_quantity INTEGER,
  p_organization_id UUID
) RETURNS TABLE(
  success BOOLEAN,
  cart_item_id UUID,
  new_quantity INTEGER,
  was_insert BOOLEAN
) AS $$
DECLARE
  v_cart_item_id UUID;
  v_new_quantity INTEGER;
  v_was_insert BOOLEAN;
BEGIN
  -- Try to insert; if conflict, update quantity
  INSERT INTO cart_items (
    user_id,
    product_id,
    quantity,
    organization_id,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_product_id,
    p_quantity,
    p_organization_id,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id, product_id)
  DO UPDATE SET
    quantity = cart_items.quantity + EXCLUDED.quantity,
    updated_at = NOW()
  RETURNING id, quantity, (xmax = 0) INTO v_cart_item_id, v_new_quantity, v_was_insert;

  -- Return success with details
  RETURN QUERY SELECT
    true,
    v_cart_item_id,
    v_new_quantity,
    v_was_insert;

EXCEPTION
  WHEN OTHERS THEN
    -- Handle any errors
    RETURN QUERY SELECT
      false,
      NULL::UUID,
      NULL::INTEGER,
      NULL::BOOLEAN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION upsert_cart_item_atomic IS
  'Atomically upserts cart item with quantity increment to prevent race conditions. Returns cart_item_id, new_quantity, and was_insert flag.';
