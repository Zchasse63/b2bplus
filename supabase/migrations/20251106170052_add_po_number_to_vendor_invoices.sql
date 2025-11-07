-- Add po_number column to vendor_invoices table
ALTER TABLE vendor_invoices
ADD COLUMN IF NOT EXISTS po_number TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_vendor_invoices_po_number ON vendor_invoices(po_number);

-- Add comment
COMMENT ON COLUMN vendor_invoices.po_number IS 'Purchase order number associated with this invoice';
