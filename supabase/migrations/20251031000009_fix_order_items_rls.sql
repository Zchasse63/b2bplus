-- Fix order_items RLS policy to allow inserting items when creating orders

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can manage items in their draft orders" ON order_items;

-- Create separate policies for different operations
CREATE POLICY "Users can insert order items for their orders" ON order_items
  FOR INSERT WITH CHECK (
    order_id IN (
      SELECT id FROM orders 
      WHERE user_id = auth.uid() 
        AND is_organization_member(organization_id)
    )
  );

CREATE POLICY "Users can update items in their draft orders" ON order_items
  FOR UPDATE USING (
    order_id IN (
      SELECT id FROM orders 
      WHERE user_id = auth.uid() AND status = 'draft'
    )
  );

CREATE POLICY "Users can delete items in their draft orders" ON order_items
  FOR DELETE USING (
    order_id IN (
      SELECT id FROM orders 
      WHERE user_id = auth.uid() AND status = 'draft'
    )
  );
