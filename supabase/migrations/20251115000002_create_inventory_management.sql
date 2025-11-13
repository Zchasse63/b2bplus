-- ============================================================================
-- Inventory Management System
-- Created: 2025-11-15
-- Purpose: Track product inventory, stock levels, and reorder alerts
-- ============================================================================

-- ============================================================================
-- INVENTORY LEVELS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS inventory_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  quantity_available INTEGER NOT NULL DEFAULT 0,
  quantity_reserved INTEGER NOT NULL DEFAULT 0,
  quantity_in_transit INTEGER NOT NULL DEFAULT 0,
  reorder_point INTEGER NOT NULL DEFAULT 10,
  reorder_quantity INTEGER NOT NULL DEFAULT 50,
  warehouse_location VARCHAR(255),
  last_counted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_inventory_levels_product_id ON inventory_levels(product_id);
CREATE INDEX idx_inventory_levels_organization_id ON inventory_levels(organization_id);
CREATE INDEX idx_inventory_levels_quantity_available ON inventory_levels(quantity_available);
CREATE UNIQUE INDEX idx_inventory_levels_product_org ON inventory_levels(product_id, organization_id);

-- ============================================================================
-- INVENTORY TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  transaction_type VARCHAR(50) NOT NULL, -- 'sale', 'return', 'restock', 'adjustment', 'damage', 'lost'
  quantity_change INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  reason VARCHAR(255),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_inventory_transactions_product_id ON inventory_transactions(product_id);
CREATE INDEX idx_inventory_transactions_organization_id ON inventory_transactions(organization_id);
CREATE INDEX idx_inventory_transactions_order_id ON inventory_transactions(order_id);
CREATE INDEX idx_inventory_transactions_type ON inventory_transactions(transaction_type);
CREATE INDEX idx_inventory_transactions_created_at ON inventory_transactions(created_at);

-- ============================================================================
-- REORDER ALERTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS reorder_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL, -- 'low_stock', 'out_of_stock', 'overstock'
  current_quantity INTEGER NOT NULL,
  threshold_quantity INTEGER NOT NULL,
  alert_status VARCHAR(50) DEFAULT 'active', -- 'active', 'acknowledged', 'resolved'
  acknowledged_by UUID REFERENCES profiles(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_reorder_alerts_product_id ON reorder_alerts(product_id);
CREATE INDEX idx_reorder_alerts_organization_id ON reorder_alerts(organization_id);
CREATE INDEX idx_reorder_alerts_status ON reorder_alerts(alert_status);
CREATE INDEX idx_reorder_alerts_type ON reorder_alerts(alert_type);

-- ============================================================================
-- STOCK MOVEMENTS TABLE (for tracking warehouse transfers)
-- ============================================================================

CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  from_location VARCHAR(255) NOT NULL,
  to_location VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  movement_type VARCHAR(50), -- 'transfer', 'consolidation', 'distribution'
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
  initiated_by UUID REFERENCES profiles(id),
  initiated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_status ON stock_movements(status);
CREATE INDEX idx_stock_movements_initiated_at ON stock_movements(initiated_at);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE inventory_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reorder_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES FOR INVENTORY LEVELS
-- ============================================================================

-- Members can view inventory for their organization
CREATE POLICY "Members can view inventory levels" ON inventory_levels
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = inventory_levels.organization_id
      AND user_id = auth.uid()
    )
  );

-- Admins can manage inventory
CREATE POLICY "Admins can manage inventory levels" ON inventory_levels
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = inventory_levels.organization_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = inventory_levels.organization_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- ============================================================================
-- RLS POLICIES FOR INVENTORY TRANSACTIONS
-- ============================================================================

CREATE POLICY "Members can view transactions" ON inventory_transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = inventory_transactions.organization_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert transactions" ON inventory_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = inventory_transactions.organization_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- ============================================================================
-- RLS POLICIES FOR REORDER ALERTS
-- ============================================================================

CREATE POLICY "Members can view alerts" ON reorder_alerts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = reorder_alerts.organization_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage alerts" ON reorder_alerts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = reorder_alerts.organization_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = reorder_alerts.organization_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- ============================================================================
-- RLS POLICIES FOR STOCK MOVEMENTS
-- ============================================================================

CREATE POLICY "Members can view movements" ON stock_movements
  FOR SELECT
  TO authenticated
  USING (true); -- Allow all authenticated users to view

CREATE POLICY "Admins can manage movements" ON stock_movements
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner', 'super_admin')
    )
  );

-- ============================================================================
-- HELPER FUNCTION: Update inventory on order
-- ============================================================================

CREATE OR REPLACE FUNCTION update_inventory_on_order(
  p_order_id UUID,
  p_product_id UUID,
  p_quantity INTEGER,
  p_organization_id UUID
)
RETURNS boolean AS $$
DECLARE
  v_available INTEGER;
BEGIN
  -- Check if sufficient inventory available
  SELECT quantity_available INTO v_available
  FROM inventory_levels
  WHERE product_id = p_product_id
  AND organization_id = p_organization_id;

  IF v_available IS NULL OR v_available < p_quantity THEN
    RETURN false; -- Not enough inventory
  END IF;

  -- Update inventory levels
  UPDATE inventory_levels
  SET
    quantity_available = quantity_available - p_quantity,
    quantity_reserved = quantity_reserved + p_quantity,
    updated_at = now()
  WHERE product_id = p_product_id
  AND organization_id = p_organization_id;

  -- Create transaction record
  INSERT INTO inventory_transactions (
    product_id,
    organization_id,
    order_id,
    transaction_type,
    quantity_change,
    previous_quantity,
    new_quantity,
    reason
  )
  SELECT
    p_product_id,
    p_organization_id,
    p_order_id,
    'sale',
    -p_quantity,
    v_available,
    v_available - p_quantity,
    'Order placed'
  FROM inventory_levels
  WHERE product_id = p_product_id
  AND organization_id = p_organization_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION: Check and create reorder alerts
-- ============================================================================

CREATE OR REPLACE FUNCTION check_reorder_alerts()
RETURNS void AS $$
DECLARE
  v_inventory RECORD;
BEGIN
  -- Check for low stock
  FOR v_inventory IN
    SELECT
      il.id,
      il.product_id,
      il.organization_id,
      il.quantity_available,
      il.reorder_point
    FROM inventory_levels il
    WHERE il.quantity_available <= il.reorder_point
  LOOP
    -- Check if alert already exists
    INSERT INTO reorder_alerts (
      product_id,
      organization_id,
      alert_type,
      current_quantity,
      threshold_quantity
    )
    SELECT
      v_inventory.product_id,
      v_inventory.organization_id,
      CASE
        WHEN v_inventory.quantity_available = 0 THEN 'out_of_stock'
        ELSE 'low_stock'
      END,
      v_inventory.quantity_available,
      v_inventory.reorder_point
    WHERE NOT EXISTS (
      SELECT 1 FROM reorder_alerts ra
      WHERE ra.product_id = v_inventory.product_id
      AND ra.organization_id = v_inventory.organization_id
      AND ra.alert_status = 'active'
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER: Check reorder alerts after inventory update
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_check_reorder_alerts()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM check_reorder_alerts();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inventory_levels_reorder_check
  AFTER UPDATE ON inventory_levels
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_reorder_alerts();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON inventory_levels TO authenticated;
GRANT SELECT ON inventory_transactions TO authenticated;
GRANT SELECT ON reorder_alerts TO authenticated;
GRANT SELECT ON stock_movements TO authenticated;
GRANT EXECUTE ON FUNCTION update_inventory_on_order TO authenticated;
GRANT EXECUTE ON FUNCTION check_reorder_alerts TO authenticated;
