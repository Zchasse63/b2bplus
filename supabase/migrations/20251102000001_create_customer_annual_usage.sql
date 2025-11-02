-- Create table for storing annual usage data from BailyUsage.xlsx
CREATE TABLE IF NOT EXISTS customer_annual_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_number TEXT,
  item_description TEXT,
  usage_2022 DECIMAL(12,2),
  usage_2023 DECIMAL(12,2),
  usage_2024 DECIMAL(12,2),
  category TEXT,
  source TEXT DEFAULT 'bailey_usage_import',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_customer_usage_org ON customer_annual_usage(organization_id);
CREATE INDEX idx_customer_usage_item ON customer_annual_usage(item_number);
CREATE INDEX idx_customer_usage_2023 ON customer_annual_usage(usage_2023 DESC NULLS LAST);
CREATE INDEX idx_customer_usage_2024 ON customer_annual_usage(usage_2024 DESC NULLS LAST);

-- Add comment
COMMENT ON TABLE customer_annual_usage IS 'Stores annual product usage data for customers, imported from historical Excel files';
