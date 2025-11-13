-- Add missing new_product_id column to sku_mappings table
-- This column is required for SKU mapping tests
-- Note: This is an alias/duplicate of current_product_id for backward compatibility

ALTER TABLE sku_mappings 
ADD COLUMN IF NOT EXISTS new_product_id UUID REFERENCES products(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_sku_mappings_new_product ON sku_mappings(new_product_id);

-- Copy existing current_product_id values to new_product_id for existing rows
UPDATE sku_mappings 
SET new_product_id = current_product_id 
WHERE new_product_id IS NULL AND current_product_id IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN sku_mappings.new_product_id IS 'Reference to the new/current product (alias of current_product_id for backward compatibility)';

