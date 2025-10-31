-- Create invoices table
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Invoice Details
  issue_date TIMESTAMP NOT NULL DEFAULT NOW(),
  due_date TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'unpaid', -- unpaid, paid, overdue, cancelled
  
  -- Amounts (stored for historical accuracy)
  subtotal DECIMAL(10, 2) NOT NULL,
  tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  shipping_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,
  
  -- Payment Info
  paid_at TIMESTAMP,
  payment_method VARCHAR(50),
  payment_reference VARCHAR(100),
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_invoices_order_id ON invoices(order_id);
CREATE INDEX idx_invoices_organization_id ON invoices(organization_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view invoices for their organization"
  ON invoices FOR SELECT
  USING (
    organization_id IN (
      SELECT current_organization_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can insert invoices"
  ON invoices FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update invoices for their organization"
  ON invoices FOR UPDATE
  USING (
    organization_id IN (
      SELECT current_organization_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoices_updated_at();

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS VARCHAR(50) AS $$
DECLARE
  year_month VARCHAR(7);
  last_number VARCHAR(50);
  sequence_num INTEGER;
  new_invoice_number VARCHAR(50);
BEGIN
  -- Get current year-month in format YYYY-MM
  year_month := TO_CHAR(NOW(), 'YYYY-MM');
  
  -- Get the last invoice number for this month
  SELECT invoice_number INTO last_number
  FROM invoices
  WHERE invoice_number LIKE 'INV-' || year_month || '-%'
  ORDER BY invoice_number DESC
  LIMIT 1;
  
  -- Extract sequence number or start at 1
  IF last_number IS NULL THEN
    sequence_num := 1;
  ELSE
    sequence_num := CAST(SUBSTRING(last_number FROM 14) AS INTEGER) + 1;
  END IF;
  
  -- Generate new invoice number
  new_invoice_number := 'INV-' || year_month || '-' || LPAD(sequence_num::TEXT, 5, '0');
  
  RETURN new_invoice_number;
END;
$$ LANGUAGE plpgsql;
