-- Migration: Add function to fix organization memberships for existing users
-- This function uses SECURITY DEFINER to bypass RLS and fix the chicken-and-egg problem

-- Function to fix organization membership for current user
CREATE OR REPLACE FUNCTION fix_my_organization_membership()
RETURNS TEXT AS $$
DECLARE
  my_org_id UUID;
  existing_member_id UUID;
BEGIN
  -- Get user's organization from profile
  SELECT current_organization_id INTO my_org_id
  FROM profiles
  WHERE id = auth.uid();
  
  IF my_org_id IS NULL THEN
    RETURN 'ERROR: No organization found in profile';
  END IF;
  
  -- Check if organization_members record already exists
  SELECT id INTO existing_member_id
  FROM organization_members
  WHERE user_id = auth.uid() 
    AND organization_id = my_org_id;
  
  IF existing_member_id IS NOT NULL THEN
    RETURN 'OK: Organization membership already exists';
  END IF;
  
  -- Create organization_members record
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (my_org_id, auth.uid(), 'owner');
  
  RETURN 'SUCCESS: Organization membership created';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION fix_my_organization_membership() TO authenticated;

-- Add comment
COMMENT ON FUNCTION fix_my_organization_membership() IS 'Fixes organization membership for users created before the handle_new_user trigger was added';
