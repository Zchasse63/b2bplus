# Apply Admin Roles Migration

## Step 1: Go to Supabase SQL Editor

https://supabase.com/dashboard/project/ksprdklquoskvjqsicvv/sql/new

## Step 2: Copy and Execute the SQL

The migration file is located at:
`/home/ubuntu/b2bplus/supabase/migrations/20251031000011_add_admin_roles.sql`

Or copy this SQL directly:

```sql
-- Migration: Add admin roles and permissions

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
DROP POLICY IF EXISTS "Admins can insert products" ON products;
DROP POLICY IF EXISTS "Admins can update products" ON products;
DROP POLICY IF EXISTS "Admins can delete products" ON products;

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
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_admin_id ON admin_activity_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_created_at ON admin_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_entity ON admin_activity_log(entity_type, entity_id);

-- Enable RLS
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

-- Function to promote users (only super_admin)
CREATE OR REPLACE FUNCTION promote_to_admin(p_user_id UUID, p_role VARCHAR(20))
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can promote users';
  END IF;

  IF p_role NOT IN ('customer', 'admin', 'super_admin') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  UPDATE profiles
  SET role = p_role
  WHERE id = p_user_id;

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
```

## Step 3: Promote Your User to Admin

After applying the migration, you need to promote your test user to admin role.

Run this SQL (replace the email with your test user's email):

```sql
-- Promote user to super_admin
UPDATE profiles
SET role = 'super_admin'
WHERE email = 'test@testmail.app';

-- Verify
SELECT id, email, role FROM profiles WHERE email = 'test@testmail.app';
```

## Step 4: Verify

You should see:
- `role` column added to `profiles` table
- New functions: `is_admin()`, `is_super_admin()`, `log_admin_activity()`, `promote_to_admin()`
- New table: `admin_activity_log`
- New RLS policies on `products` table

## What This Migration Does

1. **Adds role column** to profiles table (customer, admin, super_admin)
2. **Creates helper functions** to check user roles
3. **Adds RLS policies** so admins can manage products
4. **Creates activity log** to track all admin actions
5. **Adds promotion function** for super_admins to promote other users

## Next Steps

After applying this migration, the admin dashboard UI will be able to:
- Check if user is admin
- Show/hide admin menu items
- Protect admin routes
- Log all admin activities
- Manage products (CRUD operations)
