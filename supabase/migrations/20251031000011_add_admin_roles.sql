-- Migration: Add admin roles and permissions
-- This adds a role column to profiles and creates admin-specific RLS policies

-- Add role column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'super_admin'));

-- Create index on role for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Update existing profiles to have 'customer' role (if not already set)
UPDATE profiles 
SET role = 'customer' 
WHERE role IS NULL;

-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;

-- Add RLS policies for products table (admin can manage all products)
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can insert products" ON products;
DROP POLICY IF EXISTS "Admins can update products" ON products;
DROP POLICY IF EXISTS "Admins can delete products" ON products;

-- Create new admin policies
CREATE POLICY "Admins can insert products" ON products
  FOR INSERT TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can update products" ON products
  FOR UPDATE TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can delete products" ON products
  FOR DELETE TO authenticated
  USING (is_admin());

-- Create admin activity log table
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES profiles(id) NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'import'
  entity_type VARCHAR(50) NOT NULL, -- 'product', 'user', 'order', etc.
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_admin_id ON admin_activity_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_created_at ON admin_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_entity ON admin_activity_log(entity_type, entity_id);

-- Enable RLS on admin_activity_log
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin_activity_log
CREATE POLICY "Admins can view all activity logs" ON admin_activity_log
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert activity logs" ON admin_activity_log
  FOR INSERT TO authenticated
  WITH CHECK (is_admin() AND admin_id = auth.uid());

-- Function to log admin activity
CREATE OR REPLACE FUNCTION log_admin_activity(
  p_action VARCHAR(50),
  p_entity_type VARCHAR(50),
  p_entity_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  -- Only allow if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can log activity';
  END IF;

  INSERT INTO admin_activity_log (admin_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_details)
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION log_admin_activity(VARCHAR, VARCHAR, UUID, JSONB) TO authenticated;

-- Create a function to promote a user to admin (only super_admin can do this)
CREATE OR REPLACE FUNCTION promote_to_admin(p_user_id UUID, p_role VARCHAR(20))
RETURNS BOOLEAN AS $$
BEGIN
  -- Only super_admin can promote users
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can promote users';
  END IF;

  -- Validate role
  IF p_role NOT IN ('customer', 'admin', 'super_admin') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  -- Update user role
  UPDATE profiles
  SET role = p_role
  WHERE id = p_user_id;

  -- Log the activity
  PERFORM log_admin_activity(
    'promote_user',
    'user',
    p_user_id,
    jsonb_build_object('new_role', p_role, 'promoted_by', auth.uid())
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION promote_to_admin(UUID, VARCHAR) TO authenticated;

-- Comment on the migration
COMMENT ON COLUMN profiles.role IS 'User role: customer, admin, or super_admin';
COMMENT ON FUNCTION is_admin() IS 'Check if current user is an admin or super_admin';
COMMENT ON FUNCTION is_super_admin() IS 'Check if current user is a super_admin';
COMMENT ON TABLE admin_activity_log IS 'Audit log for all admin actions';
