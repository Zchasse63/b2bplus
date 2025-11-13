-- Add missing created_at column to product_usage_forecasts table
-- This column is required for proper sorting and filtering in the reorder predictions page

ALTER TABLE product_usage_forecasts 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_forecasts_created_at ON product_usage_forecasts(created_at DESC);

-- Update existing rows to have created_at = generated_at
UPDATE product_usage_forecasts 
SET created_at = generated_at 
WHERE created_at IS NULL;

