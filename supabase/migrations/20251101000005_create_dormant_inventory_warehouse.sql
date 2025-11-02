-- Migration: Create dormant inventory and warehouse tables
-- Description: Foundation for future inventory management and multi-warehouse support
-- Status: DORMANT - Controlled by feature flags (disabled by default)

-- Inventory locations (warehouses, stores, etc.)
CREATE TABLE IF NOT EXISTS inventory_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'USA',
  is_active BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product inventory tracking
CREATE TABLE IF NOT EXISTS product_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  location_id UUID REFERENCES inventory_locations(id) ON DELETE CASCADE,
  quantity_on_hand INTEGER DEFAULT 0 CHECK (quantity_on_hand >= 0),
  quantity_reserved INTEGER DEFAULT 0 CHECK (quantity_reserved >= 0),
  quantity_available INTEGER GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
  reorder_point INTEGER DEFAULT 0,
  reorder_quantity INTEGER DEFAULT 0,
  last_counted_at TIMESTAMP WITH TIME ZONE,
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, location_id)
);

-- Warehouses (specific type of inventory location)
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES inventory_locations(id) ON DELETE CASCADE UNIQUE,
  warehouse_type TEXT CHECK (warehouse_type IN ('main', 'regional', 'distribution', 'retail')),
  manager_name TEXT,
  manager_email TEXT,
  manager_phone TEXT,
  operating_hours TEXT,
  capacity_sqft INTEGER,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory transactions (audit trail)
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  location_id UUID REFERENCES inventory_locations(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'sale', 'adjustment', 'transfer', 'return', 'damage')),
  quantity_change INTEGER NOT NULL,
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory transfers between locations
CREATE TABLE IF NOT EXISTS inventory_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  from_location_id UUID REFERENCES inventory_locations(id) ON DELETE CASCADE,
  to_location_id UUID REFERENCES inventory_locations(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'completed', 'cancelled')),
  requested_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  completed_by UUID REFERENCES profiles(id),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  CHECK (from_location_id != to_location_id)
);

-- Indexes for performance
CREATE INDEX idx_product_inventory_product ON product_inventory(product_id);
CREATE INDEX idx_product_inventory_location ON product_inventory(location_id);
CREATE INDEX idx_product_inventory_available ON product_inventory(quantity_available);

CREATE INDEX idx_warehouses_location ON warehouses(location_id);
CREATE INDEX idx_warehouses_active ON warehouses(is_active) WHERE is_active = true;

CREATE INDEX idx_inventory_transactions_product ON inventory_transactions(product_id);
CREATE INDEX idx_inventory_transactions_location ON inventory_transactions(location_id);
CREATE INDEX idx_inventory_transactions_created ON inventory_transactions(created_at DESC);

CREATE INDEX idx_inventory_transfers_product ON inventory_transfers(product_id);
CREATE INDEX idx_inventory_transfers_status ON inventory_transfers(status);
CREATE INDEX idx_inventory_transfers_from ON inventory_transfers(from_location_id);
CREATE INDEX idx_inventory_transfers_to ON inventory_transfers(to_location_id);

-- Enable RLS
ALTER TABLE inventory_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transfers ENABLE ROW LEVEL SECURITY;

-- RLS Policies (only active when feature is enabled)

-- Inventory locations: Everyone can view active locations
CREATE POLICY "Anyone can view active inventory locations"
  ON inventory_locations FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Admins can manage inventory locations
CREATE POLICY "Admins can manage inventory locations"
  ON inventory_locations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'super_admin')
    )
  );

-- Product inventory: Everyone can view
CREATE POLICY "Anyone can view product inventory"
  ON product_inventory FOR SELECT
  TO authenticated
  USING (true);

-- Admins can manage product inventory
CREATE POLICY "Admins can manage product inventory"
  ON product_inventory FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'super_admin')
    )
  );

-- Warehouses: Everyone can view active warehouses
CREATE POLICY "Anyone can view active warehouses"
  ON warehouses FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Admins can manage warehouses
CREATE POLICY "Admins can manage warehouses"
  ON warehouses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'super_admin')
    )
  );

-- Inventory transactions: Admins only
CREATE POLICY "Admins can view inventory transactions"
  ON inventory_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can create inventory transactions"
  ON inventory_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'super_admin')
    )
  );

-- Inventory transfers: Admins only
CREATE POLICY "Admins can manage inventory transfers"
  ON inventory_transfers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'super_admin')
    )
  );

-- Helper function to get product availability at location
CREATE OR REPLACE FUNCTION get_product_availability(
  p_product_id UUID,
  p_location_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  available_qty INTEGER;
BEGIN
  -- Check if inventory management is enabled
  IF NOT is_feature_enabled('inventory_management') THEN
    -- Return unlimited availability if feature is disabled
    RETURN 999999;
  END IF;

  IF p_location_id IS NULL THEN
    -- Get default location
    SELECT id INTO p_location_id
    FROM inventory_locations
    WHERE is_default = true AND is_active = true
    LIMIT 1;
  END IF;

  -- Get available quantity
  SELECT quantity_available INTO available_qty
  FROM product_inventory
  WHERE product_id = p_product_id
    AND location_id = p_location_id;

  RETURN COALESCE(available_qty, 0);
END;
$$;

-- Helper function to check if product needs reorder
CREATE OR REPLACE FUNCTION check_reorder_needed(
  p_product_id UUID,
  p_location_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_qty INTEGER;
  reorder_pt INTEGER;
BEGIN
  IF NOT is_feature_enabled('inventory_management') THEN
    RETURN false;
  END IF;

  SELECT quantity_on_hand, reorder_point
  INTO current_qty, reorder_pt
  FROM product_inventory
  WHERE product_id = p_product_id
    AND location_id = p_location_id;

  RETURN COALESCE(current_qty, 0) <= COALESCE(reorder_pt, 0);
END;
$$;

-- Trigger to update last_updated_at on inventory changes
CREATE OR REPLACE FUNCTION update_inventory_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.last_updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_inventory_timestamp
  BEFORE UPDATE ON product_inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_timestamp();

-- Insert default location (disabled by default)
INSERT INTO inventory_locations (name, code, is_default, is_active) VALUES
('Main Warehouse', 'MAIN', true, false)
ON CONFLICT (code) DO NOTHING;

COMMENT ON TABLE inventory_locations IS 'Inventory locations (warehouses, stores) - DORMANT feature';
COMMENT ON TABLE product_inventory IS 'Product inventory tracking by location - DORMANT feature';
COMMENT ON TABLE warehouses IS 'Warehouse details - DORMANT feature';
COMMENT ON TABLE inventory_transactions IS 'Inventory transaction audit trail - DORMANT feature';
COMMENT ON TABLE inventory_transfers IS 'Inventory transfers between locations - DORMANT feature';
COMMENT ON FUNCTION get_product_availability IS 'Get product availability at location (returns unlimited if feature disabled)';
COMMENT ON FUNCTION check_reorder_needed IS 'Check if product needs reordering';
