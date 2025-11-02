-- Migration: Create carts table for cart session management
-- Date: October 31, 2025
-- Purpose: Implement full cart session model (Option B)

-- ============================================================================
-- CREATE CARTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS carts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

-- Index for finding active carts by user
CREATE INDEX IF NOT EXISTS idx_carts_user_status 
ON carts(user_id, status);

-- Index for finding carts by organization
CREATE INDEX IF NOT EXISTS idx_carts_organization 
ON carts(organization_id);

-- Index for finding active carts by user and organization
CREATE INDEX IF NOT EXISTS idx_carts_user_org_status 
ON carts(user_id, organization_id, status);

-- Index for cleanup queries (finding old abandoned carts)
CREATE INDEX IF NOT EXISTS idx_carts_status_updated 
ON carts(status, updated_at);

-- ============================================================================
-- ENABLE RLS
-- ============================================================================

ALTER TABLE carts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Policy: Users can view their own carts
CREATE POLICY "Users can view own carts"
ON carts
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  AND is_organization_member(organization_id)
);

-- Policy: Users can create carts for their organization
CREATE POLICY "Users can create own carts"
ON carts
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND is_organization_member(organization_id)
);

-- Policy: Users can update their own carts
CREATE POLICY "Users can update own carts"
ON carts
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() 
  AND is_organization_member(organization_id)
)
WITH CHECK (
  user_id = auth.uid() 
  AND is_organization_member(organization_id)
);

-- Policy: Users can delete their own carts
CREATE POLICY "Users can delete own carts"
ON carts
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid() 
  AND is_organization_member(organization_id)
);

-- ============================================================================
-- UPDATE CART_ITEMS FOREIGN KEY
-- ============================================================================

-- Add foreign key constraint to cart_items.cart_id
-- First, we need to handle existing NULL values by creating carts for them

-- Create a cart for each user that has cart items without a cart_id
INSERT INTO carts (id, organization_id, user_id, status, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  ci.organization_id,
  ci.user_id,
  'active',
  MIN(ci.created_at),
  MAX(ci.updated_at)
FROM cart_items ci
WHERE ci.cart_id IS NULL
GROUP BY ci.organization_id, ci.user_id
ON CONFLICT DO NOTHING;

-- Update cart_items to reference the newly created carts
UPDATE cart_items ci
SET cart_id = c.id
FROM carts c
WHERE ci.cart_id IS NULL
  AND ci.user_id = c.user_id
  AND ci.organization_id = c.organization_id
  AND c.status = 'active';

-- Now make cart_id NOT NULL and add the foreign key
ALTER TABLE cart_items 
  ALTER COLUMN cart_id SET NOT NULL;

ALTER TABLE cart_items
  ADD CONSTRAINT fk_cart_items_cart
  FOREIGN KEY (cart_id) 
  REFERENCES carts(id) 
  ON DELETE CASCADE;

-- Create index on cart_id for better query performance
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id 
ON cart_items(cart_id);

-- ============================================================================
-- CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to get or create active cart for current user
CREATE OR REPLACE FUNCTION get_or_create_active_cart(p_organization_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cart_id UUID;
  v_user_id UUID;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Try to find existing active cart
  SELECT id INTO v_cart_id
  FROM carts
  WHERE user_id = v_user_id
    AND organization_id = p_organization_id
    AND status = 'active'
  ORDER BY updated_at DESC
  LIMIT 1;
  
  -- If no active cart exists, create one
  IF v_cart_id IS NULL THEN
    INSERT INTO carts (organization_id, user_id, status)
    VALUES (p_organization_id, v_user_id, 'active')
    RETURNING id INTO v_cart_id;
  ELSE
    -- Update the updated_at timestamp
    UPDATE carts
    SET updated_at = NOW()
    WHERE id = v_cart_id;
  END IF;
  
  RETURN v_cart_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_or_create_active_cart(UUID) TO authenticated;

-- Function to mark cart as completed (when order is created)
CREATE OR REPLACE FUNCTION complete_cart(p_cart_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE carts
  SET status = 'completed',
      updated_at = NOW()
  WHERE id = p_cart_id
    AND user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION complete_cart(UUID) TO authenticated;

-- Function to clean up old abandoned carts (can be run periodically)
CREATE OR REPLACE FUNCTION cleanup_abandoned_carts(days_old INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Mark old active carts as abandoned
  UPDATE carts
  SET status = 'abandoned',
      updated_at = NOW()
  WHERE status = 'active'
    AND updated_at < NOW() - (days_old || ' days')::INTERVAL;
  
  -- Delete very old abandoned carts (90+ days)
  DELETE FROM carts
  WHERE status = 'abandoned'
    AND updated_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_abandoned_carts(INTEGER) TO authenticated;

-- ============================================================================
-- UPDATE TRIGGER FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_carts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_carts_updated_at
BEFORE UPDATE ON carts
FOR EACH ROW
EXECUTE FUNCTION update_carts_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE carts IS 'Shopping cart sessions for users';
COMMENT ON COLUMN carts.id IS 'Unique identifier for the cart';
COMMENT ON COLUMN carts.organization_id IS 'Organization this cart belongs to';
COMMENT ON COLUMN carts.user_id IS 'User who owns this cart';
COMMENT ON COLUMN carts.status IS 'Cart status: active, completed, or abandoned';
COMMENT ON COLUMN carts.created_at IS 'When the cart was created';
COMMENT ON COLUMN carts.updated_at IS 'When the cart was last updated';

COMMENT ON FUNCTION get_or_create_active_cart(UUID) IS 'Gets existing active cart or creates new one for current user';
COMMENT ON FUNCTION complete_cart(UUID) IS 'Marks a cart as completed when order is created';
COMMENT ON FUNCTION cleanup_abandoned_carts(INTEGER) IS 'Cleans up old abandoned carts';
