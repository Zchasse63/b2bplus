-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if user is member of organization
CREATE OR REPLACE FUNCTION is_organization_member(org_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id 
    AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function: Get user's current organization
CREATE OR REPLACE FUNCTION get_user_organization() RETURNS UUID AS $$
  SELECT current_organization_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Organizations policies
CREATE POLICY "Users can view their organizations" ON organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Owners can update their organization" ON organizations
  FOR UPDATE USING (
    id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Organization members policies
CREATE POLICY "Users can view members of their organizations" ON organization_members
  FOR SELECT USING (is_organization_member(organization_id));

CREATE POLICY "Owners and admins can manage members" ON organization_members
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Products policies
CREATE POLICY "Members can view their organization's products" ON products
  FOR SELECT USING (is_organization_member(organization_id));

CREATE POLICY "Admins can manage products" ON products
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Shipping addresses policies
CREATE POLICY "Members can view their organization's addresses" ON shipping_addresses
  FOR SELECT USING (is_organization_member(organization_id));

CREATE POLICY "Members can insert addresses" ON shipping_addresses
  FOR INSERT WITH CHECK (is_organization_member(organization_id));

CREATE POLICY "Members can update their organization's addresses" ON shipping_addresses
  FOR UPDATE USING (is_organization_member(organization_id));

-- Orders policies
CREATE POLICY "Members can view their organization's orders" ON orders
  FOR SELECT USING (is_organization_member(organization_id));

CREATE POLICY "Members can create orders" ON orders
  FOR INSERT WITH CHECK (
    is_organization_member(organization_id) AND
    user_id = auth.uid()
  );

CREATE POLICY "Members can update their own orders" ON orders
  FOR UPDATE USING (
    is_organization_member(organization_id) AND
    user_id = auth.uid() AND
    status = 'draft'
  );

-- Order items policies (inherit from orders)
CREATE POLICY "Users can view order items for their orders" ON order_items
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders 
      WHERE is_organization_member(organization_id)
    )
  );

CREATE POLICY "Users can manage items in their draft orders" ON order_items
  FOR ALL USING (
    order_id IN (
      SELECT id FROM orders 
      WHERE user_id = auth.uid() AND status = 'draft'
    )
  );

-- Cart items policies
CREATE POLICY "Users can view their own cart" ON cart_items
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own cart" ON cart_items
  FOR ALL USING (
    user_id = auth.uid() AND
    is_organization_member(organization_id)
  );

