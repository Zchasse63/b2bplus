-- Performance Optimization: Add Indexes for Frequently Queried Columns
-- This migration adds indexes to improve query performance across the application

-- Orders table indexes
CREATE INDEX IF NOT EXISTS idx_orders_organization_id ON orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_submitted_at ON orders(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_org_status ON orders(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_org_date ON orders(organization_id, submitted_at DESC);

-- Order items table indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_product ON order_items(order_id, product_id);

-- Products table indexes
CREATE INDEX IF NOT EXISTS idx_products_organization_id ON products(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_org_sku ON products(organization_id, sku);

-- Customer analytics indexes
CREATE INDEX IF NOT EXISTS idx_customer_analytics_customer_id ON customer_purchase_analytics(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_analytics_status ON customer_purchase_analytics(status);
CREATE INDEX IF NOT EXISTS idx_customer_analytics_revenue ON customer_purchase_analytics(total_revenue DESC);

-- Historical orders indexes
CREATE INDEX IF NOT EXISTS idx_historical_orders_customer_id ON historical_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_historical_orders_date ON historical_orders(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_historical_orders_customer_date ON historical_orders(customer_id, order_date DESC);

-- Email campaigns indexes
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_at ON email_campaigns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_organization_id ON email_campaigns(organization_id);

-- Campaign recipients indexes
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign_id ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON campaign_recipients(status);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign_status ON campaign_recipients(campaign_id, status);

-- Invoices indexes
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_organization_id ON invoices(organization_id);

-- Opportunities indexes
CREATE INDEX IF NOT EXISTS idx_opportunities_customer_id ON customer_opportunities(customer_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON customer_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_type ON customer_opportunities(opportunity_type);
CREATE INDEX IF NOT EXISTS idx_opportunities_score ON customer_opportunities(opportunity_score DESC);

-- Recommendations indexes
CREATE INDEX IF NOT EXISTS idx_recommendations_customer_id ON product_recommendations(customer_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_product_id ON product_recommendations(product_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_type ON product_recommendations(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_recommendations_confidence ON product_recommendations(confidence_score DESC);

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_location_id ON inventory(location_id);
CREATE INDEX IF NOT EXISTS idx_inventory_quantity ON inventory(quantity_available);
CREATE INDEX IF NOT EXISTS idx_inventory_reorder ON inventory(quantity_available, reorder_point);

-- Leads indexes
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(lead_score DESC);

-- Contacts indexes
CREATE INDEX IF NOT EXISTS idx_contacts_organization_id ON contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);

-- Organization members indexes
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_organization_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(role);
CREATE INDEX IF NOT EXISTS idx_org_members_org_user ON organization_members(organization_id, user_id);

-- Feature flags indexes
CREATE INDEX IF NOT EXISTS idx_feature_flags_name ON feature_flags(feature_name);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(enabled);

-- Audit trail indexes
CREATE INDEX IF NOT EXISTS idx_audit_trail_user_id ON audit_trail(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_action ON audit_trail(action);
CREATE INDEX IF NOT EXISTS idx_audit_trail_created_at ON audit_trail(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_entity ON audit_trail(entity_type, entity_id);

-- AI usage logs indexes
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_endpoint ON ai_usage_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON ai_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_model ON ai_usage_logs(model);

-- Pricing tiers indexes
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_product_id ON pricing_tiers(product_id);
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_organization_id ON pricing_tiers(organization_id);
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_quantity ON pricing_tiers(min_quantity);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_orders_org_status_date ON orders(organization_id, status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_org_category_status ON products(organization_id, category, status);
CREATE INDEX IF NOT EXISTS idx_analytics_customer_status_revenue ON customer_purchase_analytics(customer_id, status, total_revenue DESC);

-- Partial indexes for common filters
CREATE INDEX IF NOT EXISTS idx_orders_pending ON orders(organization_id, submitted_at DESC) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_products_active ON products(organization_id, sku) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_campaigns_active ON email_campaigns(organization_id, created_at DESC) WHERE status = 'active';

-- Add index statistics comment
COMMENT ON INDEX idx_orders_organization_id IS 'Frequently used for filtering orders by organization';
COMMENT ON INDEX idx_orders_status IS 'Used for order status filtering and reporting';
COMMENT ON INDEX idx_products_sku IS 'Used for product lookup by SKU';
COMMENT ON INDEX idx_customer_analytics_customer_id IS 'Used for customer analytics queries';
COMMENT ON INDEX idx_email_campaigns_status IS 'Used for campaign status filtering';

