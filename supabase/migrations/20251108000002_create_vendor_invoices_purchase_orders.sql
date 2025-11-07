-- Migration: Create vendor invoices and purchase orders for Phase 5
-- Description: AI-powered invoice reconciliation and PO matching system
-- Date: November 8, 2025

-- ============================================================================
-- 1. VENDORS TABLE
-- ============================================================================
-- Stores vendor/supplier information
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Vendor Details
  name TEXT NOT NULL,
  vendor_code TEXT UNIQUE, -- Optional vendor code/ID
  email TEXT,
  phone TEXT,
  website TEXT,
  
  -- Address
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'USA',
  
  -- Payment Terms
  payment_terms TEXT, -- e.g., "Net 30", "Net 60", "Due on Receipt"
  default_payment_method TEXT, -- e.g., "ACH", "Check", "Wire"
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_trusted BOOLEAN DEFAULT false, -- For auto-approval whitelist
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_vendors_name ON vendors(name);
CREATE INDEX idx_vendors_code ON vendors(vendor_code);
CREATE INDEX idx_vendors_active ON vendors(is_active);
CREATE INDEX idx_vendors_trusted ON vendors(is_trusted);

-- ============================================================================
-- 2. PURCHASE ORDERS TABLE
-- ============================================================================
-- Stores purchase orders issued to vendors
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- PO Details
  po_number TEXT NOT NULL UNIQUE, -- e.g., "PO-2025-001"
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  vendor_name TEXT NOT NULL, -- Denormalized for historical accuracy
  
  -- Dates
  po_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'draft',
    'pending',      -- Awaiting delivery
    'partial',      -- Partially received
    'received',     -- Fully received
    'cancelled'
  )),
  
  -- Amounts
  subtotal DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  shipping_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  
  -- Line Items (stored as JSONB for flexibility)
  line_items JSONB NOT NULL DEFAULT '[]',
  -- Structure: [{ sku, product_name, quantity, unit_price, total }]
  
  -- Payment
  payment_terms TEXT,
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN (
    'unpaid',
    'partial',
    'paid'
  )),
  
  -- Metadata
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_purchase_orders_po_number ON purchase_orders(po_number);
CREATE INDEX idx_purchase_orders_vendor ON purchase_orders(vendor_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_date ON purchase_orders(po_date);
CREATE INDEX idx_purchase_orders_payment_status ON purchase_orders(payment_status);

-- ============================================================================
-- 3. VENDOR INVOICES TABLE
-- ============================================================================
-- Stores invoices received from vendors (different from customer invoices)
CREATE TABLE IF NOT EXISTS vendor_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Invoice Details
  invoice_number TEXT NOT NULL, -- Vendor's invoice number
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  vendor_name TEXT NOT NULL, -- Denormalized
  
  -- Dates
  invoice_date DATE NOT NULL,
  due_date DATE,
  
  -- Amounts
  subtotal DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  shipping_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  
  -- Line Items (extracted by AI)
  line_items JSONB NOT NULL DEFAULT '[]',
  -- Structure: [{ sku, product_name, quantity, unit_price, total }]
  
  -- Document Storage
  file_url TEXT NOT NULL, -- URL to PDF in Supabase Storage
  file_name TEXT,
  file_size BIGINT,
  
  -- AI Extraction
  extraction_status TEXT DEFAULT 'pending' CHECK (extraction_status IN (
    'pending',
    'processing',
    'completed',
    'failed'
  )),
  extraction_confidence DECIMAL(3,2), -- 0.00 to 1.00
  extraction_error TEXT,
  extracted_at TIMESTAMPTZ,
  
  -- PO Matching
  matched_po_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  match_status TEXT DEFAULT 'unmatched' CHECK (match_status IN (
    'unmatched',
    'matched',
    'partial_match',
    'no_match'
  )),
  match_confidence DECIMAL(3,2), -- 0.00 to 1.00
  match_notes TEXT,
  matched_at TIMESTAMPTZ,
  
  -- Approval
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN (
    'pending',
    'auto_approved',
    'manually_approved',
    'rejected'
  )),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Payment
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN (
    'unpaid',
    'paid'
  )),
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  payment_reference TEXT,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_vendor_invoices_invoice_number ON vendor_invoices(invoice_number);
CREATE INDEX idx_vendor_invoices_vendor ON vendor_invoices(vendor_id);
CREATE INDEX idx_vendor_invoices_po ON vendor_invoices(matched_po_id);
CREATE INDEX idx_vendor_invoices_match_status ON vendor_invoices(match_status);
CREATE INDEX idx_vendor_invoices_approval_status ON vendor_invoices(approval_status);
CREATE INDEX idx_vendor_invoices_payment_status ON vendor_invoices(payment_status);
CREATE INDEX idx_vendor_invoices_date ON vendor_invoices(invoice_date);

-- ============================================================================
-- 4. INVOICE RECONCILIATION RESULTS TABLE
-- ============================================================================
-- Stores detailed AI reconciliation results (extends existing table)
-- Note: We already have invoice_reconciliation table from Week 6-8
-- Let's add additional columns for Phase 5 features

-- Add new columns to existing invoice_reconciliation table
ALTER TABLE invoice_reconciliation 
  ADD COLUMN IF NOT EXISTS vendor_invoice_id UUID REFERENCES vendor_invoices(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS auto_approval_eligible BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_approval_reason TEXT,
  ADD COLUMN IF NOT EXISTS discrepancy_details JSONB DEFAULT '{}';

-- Add index
CREATE INDEX IF NOT EXISTS idx_invoice_reconciliation_vendor_invoice 
  ON invoice_reconciliation(vendor_invoice_id);

-- ============================================================================
-- 5. AUTO-APPROVAL RULES TABLE
-- ============================================================================
-- Configurable rules for automatic invoice approval
CREATE TABLE IF NOT EXISTS invoice_auto_approval_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Rule Details
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0, -- Higher priority rules checked first
  
  -- Conditions
  max_amount DECIMAL(10,2), -- Max invoice amount for auto-approval
  min_confidence DECIMAL(3,2) DEFAULT 0.95, -- Min match confidence (0.00-1.00)
  trusted_vendors_only BOOLEAN DEFAULT false, -- Only auto-approve trusted vendors
  require_po_match BOOLEAN DEFAULT true, -- Require PO match for auto-approval
  
  -- Vendor Whitelist/Blacklist
  allowed_vendor_ids UUID[], -- If set, only these vendors
  blocked_vendor_ids UUID[], -- If set, never these vendors
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX idx_invoice_auto_approval_rules_active ON invoice_auto_approval_rules(is_active);
CREATE INDEX idx_invoice_auto_approval_rules_priority ON invoice_auto_approval_rules(priority DESC);

-- ============================================================================
-- 6. RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_auto_approval_rules ENABLE ROW LEVEL SECURITY;

-- Vendors: Admins can view and manage
CREATE POLICY "Admins can view vendors"
  ON vendors FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert vendors"
  ON vendors FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update vendors"
  ON vendors FOR UPDATE
  TO authenticated
  USING (is_admin());

-- Purchase Orders: Admins can view and manage
CREATE POLICY "Admins can view purchase orders"
  ON purchase_orders FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert purchase orders"
  ON purchase_orders FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update purchase orders"
  ON purchase_orders FOR UPDATE
  TO authenticated
  USING (is_admin());

-- Vendor Invoices: Admins can view and manage
CREATE POLICY "Admins can view vendor invoices"
  ON vendor_invoices FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert vendor invoices"
  ON vendor_invoices FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update vendor invoices"
  ON vendor_invoices FOR UPDATE
  TO authenticated
  USING (is_admin());

-- Auto-Approval Rules: Admins can view and manage
CREATE POLICY "Admins can view auto-approval rules"
  ON invoice_auto_approval_rules FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert auto-approval rules"
  ON invoice_auto_approval_rules FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update auto-approval rules"
  ON invoice_auto_approval_rules FOR UPDATE
  TO authenticated
  USING (is_admin());

-- ============================================================================
-- 7. UPDATED_AT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendor_invoices_updated_at
  BEFORE UPDATE ON vendor_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoice_auto_approval_rules_updated_at
  BEFORE UPDATE ON invoice_auto_approval_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. COMMENTS
-- ============================================================================

COMMENT ON TABLE vendors IS 'Vendor/supplier information for purchase orders and invoices';
COMMENT ON TABLE purchase_orders IS 'Purchase orders issued to vendors';
COMMENT ON TABLE vendor_invoices IS 'Invoices received from vendors (AI-processed)';
COMMENT ON TABLE invoice_auto_approval_rules IS 'Configurable rules for automatic invoice approval';

COMMENT ON COLUMN vendor_invoices.extraction_status IS 'Status of AI data extraction from invoice PDF';
COMMENT ON COLUMN vendor_invoices.match_status IS 'Status of AI matching to purchase orders';
COMMENT ON COLUMN vendor_invoices.approval_status IS 'Approval status (auto or manual)';

