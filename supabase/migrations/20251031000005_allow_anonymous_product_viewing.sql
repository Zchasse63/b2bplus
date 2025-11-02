-- Migration: Allow anonymous users to view products (but not pricing)
-- This enables product browsing without authentication

-- Drop the existing policy that requires authentication
DROP POLICY IF EXISTS "All authenticated users can view products" ON products;

-- Create new policy that allows everyone (including anonymous) to view products
CREATE POLICY "Everyone can view products" 
  ON products 
  FOR SELECT 
  USING (true);

-- Note: Pricing will be hidden in the application layer for non-authenticated users
-- The RLS policy allows viewing the product data, but the UI will conditionally display pricing

-- Add comment
COMMENT ON POLICY "Everyone can view products" ON products 
  IS 'Allow anonymous browsing of products. Pricing is hidden in UI for non-authenticated users.';
