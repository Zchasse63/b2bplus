-- Migration: Fix products RLS policy for single-supplier model
-- Allow all authenticated users to view all products

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Members can view their organization's products" ON products;

-- Create new policy that allows all authenticated users to view all products
CREATE POLICY "All authenticated users can view products" 
  ON products 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- Keep the admin policy for managing products (only supplier admins can manage)
-- This policy already exists and doesn't need to be changed

-- Add comment
COMMENT ON POLICY "All authenticated users can view products" ON products 
  IS 'Single-supplier model: all customers can view all products from the distributor';
