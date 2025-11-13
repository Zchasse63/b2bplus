-- ============================================================================
-- Comprehensive RLS Policies for All Tables
-- Created: 2025-11-09
-- Purpose: Ensure all tables have proper Row Level Security policies
-- ============================================================================

-- ============================================================================
-- ENABLE RLS ON ALL TABLES (if not already enabled)
-- ============================================================================

ALTER TABLE IF EXISTS organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS shipping_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS advanced_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dormant_inventory_warehouse ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS email_campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS email_campaign_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS automated_email_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS automated_email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS semantic_search_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS recommendation_functions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS analytics_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS historical_usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS crm_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customer_annual_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS chatbot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reorder_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pricing_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS vendor_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS magic_link_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sample_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS rebates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lead_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pricing_history ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTION: Check if user is admin
-- ============================================================================

CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin', 'owner')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION: Check if user is member of organization
-- ============================================================================

CREATE OR REPLACE FUNCTION is_organization_member(org_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id 
    AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================================
-- FEATURE FLAGS - Admin only
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage feature flags" ON feature_flags;
CREATE POLICY "Admins can manage feature flags" ON feature_flags
  FOR ALL TO authenticated
  USING (is_admin());

-- ============================================================================
-- ADVANCED PRICING - Admin only
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage advanced pricing" ON advanced_pricing;
CREATE POLICY "Admins can manage advanced pricing" ON advanced_pricing
  FOR ALL TO authenticated
  USING (is_admin());

-- ============================================================================
-- DORMANT INVENTORY - Admin only
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage dormant inventory" ON dormant_inventory_warehouse;
CREATE POLICY "Admins can manage dormant inventory" ON dormant_inventory_warehouse
  FOR ALL TO authenticated
  USING (is_admin());

-- ============================================================================
-- SEMANTIC SEARCH RECOMMENDATIONS - Public read, admin write
-- ============================================================================

DROP POLICY IF EXISTS "Public can read recommendations" ON semantic_search_recommendations;
CREATE POLICY "Public can read recommendations" ON semantic_search_recommendations
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage recommendations" ON semantic_search_recommendations;
CREATE POLICY "Admins can manage recommendations" ON semantic_search_recommendations
  FOR INSERT, UPDATE, DELETE TO authenticated
  USING (is_admin());

-- ============================================================================
-- ANALYTICS VIEWS - Admin only
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view analytics" ON analytics_views;
CREATE POLICY "Admins can view analytics" ON analytics_views
  FOR SELECT TO authenticated
  USING (is_admin());

-- ============================================================================
-- HISTORICAL USAGE TRACKING - Organization members
-- ============================================================================

DROP POLICY IF EXISTS "Members can view usage tracking" ON historical_usage_tracking;
CREATE POLICY "Members can view usage tracking" ON historical_usage_tracking
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- CRM TABLES - Admin only
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage CRM leads" ON crm_leads;
CREATE POLICY "Admins can manage CRM leads" ON crm_leads
  FOR ALL TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can manage CRM contacts" ON crm_contacts;
CREATE POLICY "Admins can manage CRM contacts" ON crm_contacts
  FOR ALL TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can manage CRM opportunities" ON crm_opportunities;
CREATE POLICY "Admins can manage CRM opportunities" ON crm_opportunities
  FOR ALL TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can manage CRM activities" ON crm_activities;
CREATE POLICY "Admins can manage CRM activities" ON crm_activities
  FOR ALL TO authenticated
  USING (is_admin());

-- ============================================================================
-- SUPPORT TICKETS - Users can view their own, admins can view all
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own tickets" ON support_tickets;
CREATE POLICY "Users can view their own tickets" ON support_tickets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Users can create tickets" ON support_tickets;
CREATE POLICY "Users can create tickets" ON support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- DOCUMENTS - Organization members
-- ============================================================================

DROP POLICY IF EXISTS "Members can view documents" ON documents;
CREATE POLICY "Members can view documents" ON documents
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage documents" ON documents;
CREATE POLICY "Admins can manage documents" ON documents
  FOR INSERT, UPDATE, DELETE TO authenticated
  USING (is_admin());

-- ============================================================================
-- VENDOR INVOICES - Admin only
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage vendor invoices" ON vendor_invoices;
CREATE POLICY "Admins can manage vendor invoices" ON vendor_invoices
  FOR ALL TO authenticated
  USING (is_admin());

-- ============================================================================
-- PURCHASE ORDERS - Admin only
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage purchase orders" ON purchase_orders;
CREATE POLICY "Admins can manage purchase orders" ON purchase_orders
  FOR ALL TO authenticated
  USING (is_admin());

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON feature_flags TO authenticated;
GRANT SELECT ON advanced_pricing TO authenticated;
GRANT SELECT ON dormant_inventory_warehouse TO authenticated;
GRANT SELECT ON semantic_search_recommendations TO authenticated;
GRANT SELECT ON analytics_views TO authenticated;
GRANT SELECT ON historical_usage_tracking TO authenticated;
GRANT SELECT ON crm_leads TO authenticated;
GRANT SELECT ON crm_contacts TO authenticated;
GRANT SELECT ON crm_opportunities TO authenticated;
GRANT SELECT ON crm_activities TO authenticated;
GRANT SELECT ON support_tickets TO authenticated;
GRANT SELECT ON documents TO authenticated;
GRANT SELECT ON vendor_invoices TO authenticated;
GRANT SELECT ON purchase_orders TO authenticated;

