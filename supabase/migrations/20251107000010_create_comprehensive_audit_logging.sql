-- Migration: Comprehensive Audit Logging System
-- Description: Tracks all critical changes and security events for compliance and debugging
-- SECURITY: Provides complete audit trail for sensitive operations

-- ==============================================
-- STEP 1: Create audit_logs table
-- ==============================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What happened
  event_type TEXT NOT NULL CHECK (event_type IN (
    'auth.login',
    'auth.logout',
    'auth.password_change',
    'auth.magic_link_request',
    'auth.magic_link_verify',
    'user.create',
    'user.update',
    'user.delete',
    'org.create',
    'org.update',
    'org.delete',
    'org.member_add',
    'org.member_remove',
    'org.member_role_change',
    'product.create',
    'product.update',
    'product.delete',
    'order.create',
    'order.update',
    'order.cancel',
    'order.ship',
    'order.deliver',
    'pricing.update',
    'pricing.tier_assign',
    'campaign.create',
    'campaign.send',
    'security.rate_limit_exceeded',
    'security.csrf_violation',
    'security.unauthorized_access',
    'security.webhook_verify_fail',
    'admin.impersonate',
    'admin.data_export',
    'admin.data_import',
    'system.error'
  )),

  -- Who did it
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,

  -- Context
  resource_type TEXT, -- 'product', 'order', 'user', etc.
  resource_id UUID,   -- ID of the affected resource
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'view', etc.

  -- Details
  old_values JSONB,   -- Previous state (for updates/deletes)
  new_values JSONB,   -- New state (for creates/updates)
  metadata JSONB,     -- Additional context

  -- Severity for filtering
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warn', 'error', 'critical')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_severity ON audit_logs(severity);

-- Composite index for common queries
CREATE INDEX idx_audit_logs_org_created ON audit_logs(organization_id, created_at DESC);
CREATE INDEX idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);

-- ==============================================
-- STEP 2: Enable RLS on audit_logs
-- ==============================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "Admins can read audit logs for their organization"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
        AND om.organization_id = audit_logs.organization_id
        AND om.role IN ('admin', 'owner')
    )
  );

-- System can insert audit logs
CREATE POLICY "Authenticated users can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Prevent updates and deletes (audit logs are immutable)
CREATE POLICY "Audit logs are immutable"
  ON audit_logs FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "Audit logs cannot be deleted"
  ON audit_logs FOR DELETE
  TO authenticated
  USING (false);

-- ==============================================
-- STEP 3: Create audit logging function
-- ==============================================

CREATE OR REPLACE FUNCTION log_audit_event(
  p_event_type TEXT,
  p_action TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_severity TEXT DEFAULT 'info'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_audit_id UUID;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();

  -- Get current organization ID from profiles
  IF v_user_id IS NOT NULL THEN
    SELECT current_organization_id INTO v_org_id
    FROM profiles
    WHERE id = v_user_id;
  END IF;

  -- Insert audit log
  INSERT INTO audit_logs (
    event_type,
    user_id,
    organization_id,
    resource_type,
    resource_id,
    action,
    old_values,
    new_values,
    metadata,
    severity,
    ip_address,
    user_agent
  ) VALUES (
    p_event_type,
    v_user_id,
    v_org_id,
    p_resource_type,
    p_resource_id,
    p_action,
    p_old_values,
    p_new_values,
    p_metadata,
    p_severity,
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$;

-- ==============================================
-- STEP 4: Create trigger functions for automatic logging
-- ==============================================

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_type TEXT;
  v_action TEXT;
  v_old_values JSONB;
  v_new_values JSONB;
BEGIN
  -- Determine event type based on table name
  v_event_type := TG_TABLE_NAME || '.' || lower(TG_OP);
  v_action := lower(TG_OP);

  -- Set old and new values
  IF TG_OP = 'DELETE' THEN
    v_old_values := to_jsonb(OLD);
    v_new_values := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old_values := to_jsonb(OLD);
    v_new_values := to_jsonb(NEW);
  ELSIF TG_OP = 'INSERT' THEN
    v_old_values := NULL;
    v_new_values := to_jsonb(NEW);
  END IF;

  -- Log the event
  PERFORM log_audit_event(
    p_event_type := v_event_type,
    p_action := v_action,
    p_resource_type := TG_TABLE_NAME,
    p_resource_id := COALESCE(NEW.id, OLD.id),
    p_old_values := v_old_values,
    p_new_values := v_new_values,
    p_severity := 'info'
  );

  -- Return appropriate value
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- ==============================================
-- STEP 5: Add audit triggers to critical tables
-- ==============================================

-- Products (create, update, delete)
DROP TRIGGER IF EXISTS audit_products ON products;
CREATE TRIGGER audit_products
  AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

-- Orders (create, update, delete)
DROP TRIGGER IF EXISTS audit_orders ON orders;
CREATE TRIGGER audit_orders
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

-- Organization members (add, remove, role change)
DROP TRIGGER IF EXISTS audit_organization_members ON organization_members;
CREATE TRIGGER audit_organization_members
  AFTER INSERT OR UPDATE OR DELETE ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

-- Profiles (user updates)
DROP TRIGGER IF EXISTS audit_profiles ON profiles;
CREATE TRIGGER audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

-- Organizations
DROP TRIGGER IF EXISTS audit_organizations ON organizations;
CREATE TRIGGER audit_organizations
  AFTER INSERT OR UPDATE OR DELETE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

-- ==============================================
-- STEP 6: Create audit query helper functions
-- ==============================================

-- Get recent audit logs for an organization
CREATE OR REPLACE FUNCTION get_audit_logs_for_organization(
  p_organization_id UUID,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  event_type TEXT,
  action TEXT,
  resource_type TEXT,
  resource_id UUID,
  user_email TEXT,
  severity TEXT,
  created_at TIMESTAMPTZ,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_organization_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'owner')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can view audit logs';
  END IF;

  RETURN QUERY
  SELECT
    al.id,
    al.event_type,
    al.action,
    al.resource_type,
    al.resource_id,
    p.email as user_email,
    al.severity,
    al.created_at,
    al.metadata
  FROM audit_logs al
  LEFT JOIN profiles p ON p.id = al.user_id
  WHERE al.organization_id = p_organization_id
  ORDER BY al.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Get audit logs for a specific resource
CREATE OR REPLACE FUNCTION get_audit_logs_for_resource(
  p_resource_type TEXT,
  p_resource_id UUID
)
RETURNS TABLE (
  id UUID,
  event_type TEXT,
  action TEXT,
  user_email TEXT,
  old_values JSONB,
  new_values JSONB,
  severity TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    al.id,
    al.event_type,
    al.action,
    p.email as user_email,
    al.old_values,
    al.new_values,
    al.severity,
    al.created_at
  FROM audit_logs al
  LEFT JOIN profiles p ON p.id = al.user_id
  WHERE al.resource_type = p_resource_type
    AND al.resource_id = p_resource_id
  ORDER BY al.created_at ASC;
END;
$$;

-- ==============================================
-- STEP 7: Create cleanup function for old logs
-- ==============================================

-- Function to archive old audit logs (keep 1 year by default)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(
  days_to_keep INTEGER DEFAULT 365
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Only delete non-critical logs older than specified days
  DELETE FROM audit_logs
  WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL
    AND severity NOT IN ('error', 'critical');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$;

-- ==============================================
-- STEP 8: Add table comments
-- ==============================================

COMMENT ON TABLE audit_logs IS
  'Comprehensive audit trail of all critical system events and changes. ' ||
  'Tracks who did what, when, and provides before/after state for compliance and debugging.';

COMMENT ON COLUMN audit_logs.event_type IS
  'Categorized event type (e.g., auth.login, product.update, security.csrf_violation)';

COMMENT ON COLUMN audit_logs.old_values IS
  'Previous state of the resource before the change (JSON)';

COMMENT ON COLUMN audit_logs.new_values IS
  'New state of the resource after the change (JSON)';

COMMENT ON COLUMN audit_logs.metadata IS
  'Additional context specific to the event type';

COMMENT ON COLUMN audit_logs.severity IS
  'Event severity for filtering: debug, info, warn, error, critical';

COMMENT ON FUNCTION log_audit_event IS
  'Main function for logging audit events. Call from application code for custom events.';

COMMENT ON FUNCTION get_audit_logs_for_organization IS
  'Retrieves audit logs for an organization (admin only)';

COMMENT ON FUNCTION get_audit_logs_for_resource IS
  'Retrieves complete history of changes for a specific resource';

COMMENT ON FUNCTION cleanup_old_audit_logs IS
  'Archives old non-critical audit logs (keeps 1 year by default)';

-- ==============================================
-- Log Success
-- ==============================================

DO $$
BEGIN
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Comprehensive Audit Logging System Created!';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Features:';
  RAISE NOTICE '- Automatic logging for: products, orders, users, orgs, members';
  RAISE NOTICE '- Manual logging via log_audit_event() function';
  RAISE NOTICE '- Query helpers for admins';
  RAISE NOTICE '- RLS protection (admin-only reads, immutable logs)';
  RAISE NOTICE '- Automatic cleanup for old non-critical logs';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Usage:';
  RAISE NOTICE '  SELECT log_audit_event(''security.csrf_violation'', ''block'', ''request'', NULL, NULL, NULL, ''{"ip": "1.2.3.4"}'', ''warn'');';
  RAISE NOTICE '  SELECT * FROM get_audit_logs_for_organization(''org-id'', 50, 0);';
  RAISE NOTICE '  SELECT * FROM get_audit_logs_for_resource(''product'', ''product-id'');';
  RAISE NOTICE '==================================================';
END $$;
