-- Migration: Add organization approval system
-- Purpose: Prevent unauthorized users from accessing platform data
-- Phase 1, Task 1.3: Registration Approval System

-- Add approval columns to organizations table
ALTER TABLE organizations 
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add check constraint for approval_status
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'approval_status_check'
  ) THEN
    ALTER TABLE organizations 
      ADD CONSTRAINT approval_status_check 
      CHECK (approval_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- Create index for faster queries on approval_status
CREATE INDEX IF NOT EXISTS idx_organizations_approval_status 
  ON organizations(approval_status);

-- Update existing organizations to 'approved' (grandfather existing users)
-- This ensures current users can continue working without interruption
UPDATE organizations 
SET approval_status = 'approved', 
    approved_at = NOW()
WHERE approval_status IS NULL OR approval_status = 'pending';

-- Update RLS policy: Users can only access approved organizations
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;

-- Create new policy that includes approval check
CREATE POLICY "Users can view their approved organizations"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (
    -- User must be a member of the organization
    id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
    -- AND organization must be approved
    AND approval_status = 'approved'
  );

-- Super admins can view all organizations (including pending/rejected)
CREATE POLICY "Super admins can view all organizations"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Owners can still update their organization (even if pending)
-- This allows them to fix issues during approval process
CREATE POLICY "Owners can update their organization"
  ON organizations
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role = 'owner'
    )
  );

-- Super admins can update any organization (for approval workflow)
CREATE POLICY "Super admins can update any organization"
  ON organizations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Add comment
COMMENT ON COLUMN organizations.approval_status IS 'Organization approval status: pending, approved, or rejected';
COMMENT ON COLUMN organizations.approved_by IS 'User ID of admin who approved/rejected the organization';
COMMENT ON COLUMN organizations.approved_at IS 'Timestamp when organization was approved';
COMMENT ON COLUMN organizations.rejection_reason IS 'Reason for rejection (if applicable)';

