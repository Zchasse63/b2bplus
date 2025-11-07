-- Add payment_terms column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_terms TEXT;

-- Add check constraint for valid payment terms
ALTER TABLE orders ADD CONSTRAINT orders_payment_terms_check
  CHECK (payment_terms IN ('net_30', 'net_60', 'net_90', 'credit_card', 'prepaid', NULL));

-- Add comment
COMMENT ON COLUMN orders.payment_terms IS 'Payment terms for the order: net_30, net_60, net_90, credit_card, or prepaid';

-- Create index for analytics
CREATE INDEX IF NOT EXISTS idx_orders_payment_terms ON orders(payment_terms) WHERE payment_terms IS NOT NULL;
