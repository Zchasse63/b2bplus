-- Migration: Add tables for AI Companion ecosystem
-- This migration creates tables needed for the new Vercel AI SDK + Grok implementation

-- =====================================================
-- 1. AI COMPANION TRACKING
-- =====================================================

-- Track AI companion conversations and usage
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  messages INTEGER NOT NULL DEFAULT 0,
  tool_calls INTEGER NOT NULL DEFAULT 0,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  model TEXT NOT NULL DEFAULT 'grok-4.1-fast',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_created ON ai_conversations(created_at);

-- =====================================================
-- 2. DOCUMENT PROCESSING
-- =====================================================

-- Track uploaded documents for AI processing
CREATE TABLE IF NOT EXISTS document_uploads (
  id TEXT PRIMARY KEY, -- File path as ID
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- csv, xlsx, pdf
  document_type TEXT NOT NULL DEFAULT 'unknown', -- invoice, purchase_order, price_list, product_catalog
  headers TEXT[], -- Column headers from the file
  row_count INTEGER,
  status TEXT NOT NULL DEFAULT 'uploaded', -- uploaded, analyzed, imported, imported_with_errors, failed
  raw_data JSONB, -- First 100 rows for preview
  analysis JSONB, -- AI analysis results
  import_result JSONB, -- Import results
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_uploads_user ON document_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_document_uploads_status ON document_uploads(status);
CREATE INDEX IF NOT EXISTS idx_document_uploads_type ON document_uploads(document_type);

-- =====================================================
-- 3. USER PROFILE EXTENSIONS
-- =====================================================

-- Notification preferences
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  order_updates BOOLEAN NOT NULL DEFAULT true,
  promotions BOOLEAN NOT NULL DEFAULT true,
  newsletter BOOLEAN NOT NULL DEFAULT false,
  price_alerts BOOLEAN NOT NULL DEFAULT true,
  back_in_stock BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User addresses (if not exists - might be using shipping_addresses)
CREATE TABLE IF NOT EXISTS addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('shipping', 'billing')),
  name TEXT NOT NULL, -- Label like "Office", "Warehouse"
  street1 TEXT NOT NULL,
  street2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'US',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_type ON addresses(type);

-- Payment methods (tokenized - no actual card data)
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('card', 'bank', 'credit_line')),
  brand TEXT, -- visa, mastercard, amex
  last_four TEXT NOT NULL,
  expiry_month INTEGER,
  expiry_year INTEGER,
  is_default BOOLEAN NOT NULL DEFAULT false,
  stripe_payment_method_id TEXT, -- External reference
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON payment_methods(user_id);

-- Product view tracking
CREATE TABLE IF NOT EXISTS product_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_views_user ON product_views(user_id);
CREATE INDEX IF NOT EXISTS idx_product_views_product ON product_views(product_id);
CREATE INDEX IF NOT EXISTS idx_product_views_time ON product_views(viewed_at);

-- User notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- info, warning, success, error, admin_message
  read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);

-- =====================================================
-- 4. CUSTOMER MANAGEMENT (Admin)
-- =====================================================

-- Customer notes for CRM
CREATE TABLE IF NOT EXISTS customer_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general', -- general, support, sales, billing
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_notes_customer ON customer_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_category ON customer_notes(category);

-- Note: customer_pricing_tiers already exists in 20251101000004_create_advanced_pricing.sql

-- =====================================================
-- 5. INVOICE & PAYMENT EXTENSIONS
-- =====================================================

-- Invoice line items (if not exists)
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  description TEXT,
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  extended_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

-- Payment records
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL, -- check, wire, ach, credit_card, other
  reference TEXT, -- Check number, transaction ID
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);

-- =====================================================
-- 6. REGIONAL PRICING
-- =====================================================

-- Regional pricing for products
CREATE TABLE IF NOT EXISTS regional_pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  region TEXT NOT NULL, -- Region identifier
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, region)
);

CREATE INDEX IF NOT EXISTS idx_regional_pricing_product ON regional_pricing(product_id);
CREATE INDEX IF NOT EXISTS idx_regional_pricing_region ON regional_pricing(region);

-- =====================================================
-- 7. CAMPAIGN METRICS
-- =====================================================

-- Campaign performance metrics
CREATE TABLE IF NOT EXISTS campaign_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE UNIQUE,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  revenue DECIMAL(10,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 8. SUPPORT TICKETS (if not exists)
-- =====================================================

-- Support ticket extensions for AI companion
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS context JSONB;

-- =====================================================
-- 9. INVOICE EXTENSIONS
-- =====================================================

-- Add missing columns to invoices if needed
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- =====================================================
-- 10. EMAIL QUEUE
-- =====================================================

CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  to_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  to_email TEXT, -- Either user_id or email
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  template TEXT NOT NULL DEFAULT 'default',
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE SET NULL,
  metadata JSONB,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed
  sent_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_user ON email_queue(to_user_id);

-- =====================================================
-- 11. RLS POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE regional_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- AI Conversations: Users can view their own
CREATE POLICY ai_conversations_user_select ON ai_conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY ai_conversations_user_insert ON ai_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Document uploads: Users can manage their own, admins can see all
CREATE POLICY document_uploads_user_all ON document_uploads
  FOR ALL USING (auth.uid() = user_id);

-- Notification settings: Users manage their own
CREATE POLICY notification_settings_user_all ON notification_settings
  FOR ALL USING (auth.uid() = user_id);

-- Addresses: Users manage their own
CREATE POLICY addresses_user_all ON addresses
  FOR ALL USING (auth.uid() = user_id);

-- Payment methods: Users manage their own
CREATE POLICY payment_methods_user_all ON payment_methods
  FOR ALL USING (auth.uid() = user_id);

-- Product views: Users can view/insert their own
CREATE POLICY product_views_user_select ON product_views
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY product_views_user_insert ON product_views
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Notifications: Users manage their own
CREATE POLICY notifications_user_all ON notifications
  FOR ALL USING (auth.uid() = user_id);

-- Customer notes: Admins only
CREATE POLICY customer_notes_admin_all ON customer_notes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Invoice items: Users can view their own invoices' items
CREATE POLICY invoice_items_user_select ON invoice_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.customer_id = auth.uid()
    )
  );

CREATE POLICY invoice_items_admin_all ON invoice_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Payments: Similar to invoice items
CREATE POLICY payments_user_select ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = payments.invoice_id
      AND invoices.customer_id = auth.uid()
    )
  );

CREATE POLICY payments_admin_all ON payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Regional pricing: Public read, admin write
CREATE POLICY regional_pricing_public_select ON regional_pricing
  FOR SELECT USING (true);

CREATE POLICY regional_pricing_admin_write ON regional_pricing
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Campaign metrics: Admin only
CREATE POLICY campaign_metrics_admin_all ON campaign_metrics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Email queue: Admin only
CREATE POLICY email_queue_admin_all ON email_queue
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- 12. STORAGE BUCKET FOR DOCUMENTS
-- =====================================================

-- Create documents storage bucket (run this in Supabase dashboard if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Storage policy for documents bucket
-- CREATE POLICY documents_user_upload ON storage.objects
--   FOR INSERT WITH CHECK (
--     bucket_id = 'documents' AND
--     auth.uid()::text = (storage.foldername(name))[1]
--   );

-- CREATE POLICY documents_user_select ON storage.objects
--   FOR SELECT USING (
--     bucket_id = 'documents' AND
--     auth.uid()::text = (storage.foldername(name))[1]
--   );

-- =====================================================
-- 13. VIEWS FOR COMPATIBILITY
-- =====================================================

-- Create campaigns view as alias for email_campaigns
CREATE OR REPLACE VIEW campaigns AS SELECT * FROM email_campaigns;

-- Grant permissions on the view
GRANT SELECT ON campaigns TO authenticated;
GRANT SELECT ON campaigns TO anon;

COMMENT ON TABLE ai_conversations IS 'Tracks AI companion usage for analytics';
COMMENT ON TABLE document_uploads IS 'Tracks documents uploaded for AI processing';
COMMENT ON TABLE notification_settings IS 'User notification preferences';
COMMENT ON TABLE regional_pricing IS 'Product pricing by geographic region';
