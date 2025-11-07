-- Comprehensive Test Fixes SQL Script
-- This script fixes all database schema issues for E2E tests

-- 1. Add missing 'status' column to vendor_invoices
ALTER TABLE vendor_invoices 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Add check constraint for status
ALTER TABLE vendor_invoices 
DROP CONSTRAINT IF EXISTS vendor_invoices_status_check;

ALTER TABLE vendor_invoices 
ADD CONSTRAINT vendor_invoices_status_check 
CHECK (status IN ('pending', 'processing', 'approved', 'rejected', 'paid'));

-- Add index for status filtering
CREATE INDEX IF NOT EXISTS idx_vendor_invoices_status ON vendor_invoices(status);

-- 2. Ensure customer_purchase_analytics table exists with proper structure
CREATE TABLE IF NOT EXISTS customer_purchase_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  total_orders INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  average_order_value DECIMAL(10,2) DEFAULT 0,
  last_order_date TIMESTAMP WITH TIME ZONE,
  days_since_last_order INTEGER,
  order_frequency DECIMAL(5,2),
  churn_risk_score DECIMAL(3,2),
  lifetime_value DECIMAL(10,2),
  behavioral_patterns JSONB,
  retention_recommendations TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for customer_purchase_analytics
CREATE INDEX IF NOT EXISTS idx_customer_purchase_analytics_customer_id 
ON customer_purchase_analytics(customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_purchase_analytics_churn_risk 
ON customer_purchase_analytics(churn_risk_score);

-- 3. Ensure product_embeddings table exists
CREATE TABLE IF NOT EXISTS product_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  embedding VECTOR(768),
  model_version TEXT DEFAULT 'text-embedding-004',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id)
);

-- Add index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_product_embeddings_vector 
ON product_embeddings USING ivfflat (embedding vector_cosine_ops);

-- 4. Add Upload Invoice button test ID support
COMMENT ON TABLE vendor_invoices IS 'Vendor invoices with AI extraction. Upload button should have data-testid="upload-invoice-button"';

-- 5. Refresh schema cache
NOTIFY pgrst, 'reload schema';

