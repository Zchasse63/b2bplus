-- Migration: Add Missing Columns for E2E Tests
-- Date: November 8, 2025
-- Purpose: Add match_reasoning to sku_mappings and opportunity_score to customer_opportunities

-- ============================================================================
-- 1. Add match_reasoning to sku_mappings table
-- ============================================================================
-- This column stores AI-generated reasoning for why a SKU mapping was suggested

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sku_mappings' AND column_name = 'match_reasoning'
  ) THEN
    ALTER TABLE sku_mappings ADD COLUMN match_reasoning TEXT;
    COMMENT ON COLUMN sku_mappings.match_reasoning IS 'AI-generated explanation for why this SKU mapping was suggested';
  END IF;
END $$;

-- ============================================================================
-- 2. Add opportunity_score to customer_opportunities table
-- ============================================================================
-- This column stores the AI-calculated opportunity score (0-1)
-- Note: confidence_score already exists, but tests expect opportunity_score

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_opportunities' AND column_name = 'opportunity_score'
  ) THEN
    ALTER TABLE customer_opportunities ADD COLUMN opportunity_score DECIMAL(3,2) CHECK (opportunity_score >= 0 AND opportunity_score <= 1);
    COMMENT ON COLUMN customer_opportunities.opportunity_score IS 'AI-calculated opportunity score (0-1)';
  END IF;
END $$;

-- ============================================================================
-- 3. Populate opportunity_score from confidence_score if not already set
-- ============================================================================
-- For existing records, copy confidence_score to opportunity_score
UPDATE customer_opportunities 
SET opportunity_score = confidence_score 
WHERE opportunity_score IS NULL AND confidence_score IS NOT NULL;

