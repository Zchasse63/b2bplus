-- Performance Optimization: Database Indexes
-- Task 2.2: Database Query Optimization
-- 
-- Add indexes for common queries to improve performance:
-- - Opportunities by customer/status
-- - Forecasts by date/customer
-- - Pricing by status/confidence
-- - Orders by organization/status
-- - Products by organization/category

-- Opportunities indexes
CREATE INDEX IF NOT EXISTS idx_customer_opportunities_customer_status 
ON customer_opportunities(customer_id, status);

CREATE INDEX IF NOT EXISTS idx_customer_opportunities_type_score 
ON customer_opportunities(opportunity_type, opportunity_score DESC);

CREATE INDEX IF NOT EXISTS idx_customer_opportunities_created 
ON customer_opportunities(created_at DESC);

-- Pricing optimization indexes
CREATE INDEX IF NOT EXISTS idx_pricing_suggestions_status_confidence 
ON pricing_optimization_suggestions(status, win_probability DESC);

CREATE INDEX IF NOT EXISTS idx_pricing_suggestions_customer_product 
ON pricing_optimization_suggestions(customer_id, product_id);

CREATE INDEX IF NOT EXISTS idx_pricing_suggestions_created 
ON pricing_optimization_suggestions(created_at DESC);

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_organization_status 
ON orders(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_orders_organization_date 
ON orders(organization_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_customer_date 
ON orders(customer_id, submitted_at DESC);

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_organization_category 
ON products(organization_id, category);

CREATE INDEX IF NOT EXISTS idx_products_organization_active 
ON products(organization_id, is_active);

-- Customer purchase analytics indexes
CREATE INDEX IF NOT EXISTS idx_customer_analytics_customer 
ON customer_purchase_analytics(customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_analytics_product 
ON customer_purchase_analytics(product_id);

CREATE INDEX IF NOT EXISTS idx_customer_analytics_last_purchase 
ON customer_purchase_analytics(last_purchase_date DESC);

-- Vendor invoices indexes
CREATE INDEX IF NOT EXISTS idx_vendor_invoices_status 
ON vendor_invoices(extraction_status);

CREATE INDEX IF NOT EXISTS idx_vendor_invoices_date 
ON vendor_invoices(invoice_date DESC);

-- Chatbot conversations indexes
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_user 
ON chatbot_conversations(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chatbot_messages_conversation 
ON chatbot_messages(conversation_id, created_at ASC);

-- Leads indexes
CREATE INDEX IF NOT EXISTS idx_leads_status 
ON leads(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_leads_email 
ON leads(email);

-- Organization members indexes (for auth checks)
CREATE INDEX IF NOT EXISTS idx_org_members_user_role 
ON organization_members(user_id, role);

-- Composite indexes for common join patterns
CREATE INDEX IF NOT EXISTS idx_orders_customer_org 
ON orders(customer_id, organization_id);

CREATE INDEX IF NOT EXISTS idx_order_items_order_product 
ON order_items(order_id, product_id);

-- Analyze tables to update statistics
ANALYZE customer_opportunities;
ANALYZE pricing_optimization_suggestions;
ANALYZE orders;
ANALYZE products;
ANALYZE customer_purchase_analytics;
ANALYZE vendor_invoices;
ANALYZE chatbot_conversations;
ANALYZE chatbot_messages;
ANALYZE leads;
ANALYZE organization_members;
ANALYZE order_items;

