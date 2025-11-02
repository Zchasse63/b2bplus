-- Migration: Fix existing test users by creating organization_members records
-- This fixes users created before the handle_new_user trigger was added

-- Insert organization_members records for existing users who don't have them
INSERT INTO organization_members (organization_id, user_id, role)
SELECT 
  p.current_organization_id,
  p.id,
  'owner'
FROM profiles p
WHERE p.current_organization_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM organization_members om 
    WHERE om.user_id = p.id 
    AND om.organization_id = p.current_organization_id
  );

-- Add comment
COMMENT ON TABLE organization_members IS 'Tracks which users belong to which organizations';
