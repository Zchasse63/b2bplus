-- Migration: Enhance Phase 4 Admin AI Tools Tables
-- Description: Add missing columns to customer_opportunities, product_usage_forecasts, and pricing_recommendations tables

-- ============================================================================
-- 1. Enhance Customer Opportunities Table
-- ============================================================================
-- Add missing columns for Phase 4 requirements
-- Note: Most columns already exist, adding only what's missing

-- Add pursued_at if not exists (for tracking when opportunity was pursued)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_opportunities' AND column_name = 'pursued_at'
  ) THEN
    ALTER TABLE customer_opportunities ADD COLUMN pursued_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Add outcome if not exists (won, lost, dismissed)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_opportunities' AND column_name = 'outcome'
  ) THEN
    ALTER TABLE customer_opportunities ADD COLUMN outcome TEXT CHECK (outcome IN ('won', 'lost', 'dismissed'));
  END IF;
END $$;

-- Add outcome_revenue if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_opportunities' AND column_name = 'outcome_revenue'
  ) THEN
    ALTER TABLE customer_opportunities ADD COLUMN outcome_revenue DECIMAL(10,2);
  END IF;
END $$;

-- Add outcome_notes if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_opportunities' AND column_name = 'outcome_notes'
  ) THEN
    ALTER TABLE customer_opportunities ADD COLUMN outcome_notes TEXT;
  END IF;
END $$;

-- Rename opportunity_score to confidence_score for consistency
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_opportunities' AND column_name = 'opportunity_score'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_opportunities' AND column_name = 'confidence_score'
  ) THEN
    ALTER TABLE customer_opportunities RENAME COLUMN opportunity_score TO confidence_score;
  END IF;
END $$;

-- Rename reason to ai_reasoning for clarity
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_opportunities' AND column_name = 'reason'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_opportunities' AND column_name = 'ai_reasoning'
  ) THEN
    ALTER TABLE customer_opportunities RENAME COLUMN reason TO ai_reasoning;
  END IF;
END $$;

-- Rename predicted_revenue to potential_revenue for consistency with Phase 4 spec
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_opportunities' AND column_name = 'predicted_revenue'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_opportunities' AND column_name = 'potential_revenue'
  ) THEN
    ALTER TABLE customer_opportunities RENAME COLUMN predicted_revenue TO potential_revenue;
  END IF;
END $$;

-- Update index name if needed
DROP INDEX IF EXISTS idx_opportunities_score;
CREATE INDEX IF NOT EXISTS idx_opportunities_confidence ON customer_opportunities(confidence_score DESC);

-- ============================================================================
-- 2. Enhance Product Usage Forecasts Table
-- ============================================================================
-- Add accuracy tracking columns

-- Add forecast_date if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_usage_forecasts' AND column_name = 'forecast_date'
  ) THEN
    ALTER TABLE product_usage_forecasts ADD COLUMN forecast_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Add actual_quantity if not exists (for comparing predictions to reality)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_usage_forecasts' AND column_name = 'actual_quantity'
  ) THEN
    ALTER TABLE product_usage_forecasts ADD COLUMN actual_quantity DECIMAL(10,2);
  END IF;
END $$;

-- Add accuracy_score if not exists (0-1, how accurate was the prediction)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_usage_forecasts' AND column_name = 'accuracy_score'
  ) THEN
    ALTER TABLE product_usage_forecasts ADD COLUMN accuracy_score DECIMAL(3,2) CHECK (accuracy_score >= 0 AND accuracy_score <= 1);
  END IF;
END $$;

-- Add index for forecast_date
CREATE INDEX IF NOT EXISTS idx_forecasts_date ON product_usage_forecasts(forecast_date DESC);

-- ============================================================================
-- 3. Enhance Pricing Recommendations Table
-- ============================================================================
-- Add missing columns for approval workflow

-- Add current_price if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pricing_recommendations' AND column_name = 'current_price'
  ) THEN
    ALTER TABLE pricing_recommendations ADD COLUMN current_price DECIMAL(10,2);
  END IF;
END $$;

-- Add expected_impact if not exists (JSONB for salesVolumeChange, revenueChange, marginChange)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pricing_recommendations' AND column_name = 'expected_impact'
  ) THEN
    ALTER TABLE pricing_recommendations ADD COLUMN expected_impact JSONB DEFAULT '{}';
  END IF;
END $$;

-- Add risks if not exists (array of risk descriptions)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pricing_recommendations' AND column_name = 'risks'
  ) THEN
    ALTER TABLE pricing_recommendations ADD COLUMN risks TEXT[];
  END IF;
END $$;

-- Add reviewed_by if not exists (admin user who reviewed)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pricing_recommendations' AND column_name = 'reviewed_by'
  ) THEN
    ALTER TABLE pricing_recommendations ADD COLUMN reviewed_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Add reviewed_at if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pricing_recommendations' AND column_name = 'reviewed_at'
  ) THEN
    ALTER TABLE pricing_recommendations ADD COLUMN reviewed_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Add rejection_reason if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pricing_recommendations' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE pricing_recommendations ADD COLUMN rejection_reason TEXT;
  END IF;
END $$;

-- ============================================================================
-- 4. Create Tasks Table
-- ============================================================================
-- For tracking opportunity follow-up tasks

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  opportunity_id UUID REFERENCES customer_opportunities(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for tasks
CREATE INDEX IF NOT EXISTS idx_tasks_opportunity ON tasks(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- Enable RLS on tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can manage all tasks
CREATE POLICY "Admins can manage all tasks"
  ON tasks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- ============================================================================
-- 5. Create Pricing History Table
-- ============================================================================
-- Audit trail for all pricing changes

CREATE TABLE IF NOT EXISTS pricing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  old_price DECIMAL(10,2) NOT NULL,
  new_price DECIMAL(10,2) NOT NULL,
  price_change_percent DECIMAL(5,2),
  changed_by UUID REFERENCES auth.users(id),
  change_reason TEXT,
  recommendation_id UUID REFERENCES pricing_recommendations(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for pricing_history
CREATE INDEX IF NOT EXISTS idx_pricing_history_product ON pricing_history(product_id);
CREATE INDEX IF NOT EXISTS idx_pricing_history_created ON pricing_history(created_at DESC);

-- Enable RLS on pricing_history
ALTER TABLE pricing_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can view pricing history
CREATE POLICY "Admins can view pricing history"
  ON pricing_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- RLS Policy: System can insert pricing history
CREATE POLICY "System can insert pricing history"
  ON pricing_history
  FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- 6. Add Comments
-- ============================================================================

COMMENT ON COLUMN customer_opportunities.pursued_at IS 'When the opportunity was first pursued by sales team';
COMMENT ON COLUMN customer_opportunities.outcome IS 'Final outcome: won, lost, or dismissed';
COMMENT ON COLUMN customer_opportunities.outcome_revenue IS 'Actual revenue generated if won';
COMMENT ON COLUMN customer_opportunities.outcome_notes IS 'Notes about the outcome';
COMMENT ON COLUMN customer_opportunities.confidence_score IS 'AI confidence score (0-1) for this opportunity';
COMMENT ON COLUMN customer_opportunities.ai_reasoning IS 'AI-generated explanation for why this is an opportunity';
COMMENT ON COLUMN customer_opportunities.potential_revenue IS 'Predicted revenue if opportunity is won';

COMMENT ON COLUMN product_usage_forecasts.forecast_date IS 'Date this forecast was generated';
COMMENT ON COLUMN product_usage_forecasts.actual_quantity IS 'Actual quantity ordered (filled in after forecast period)';
COMMENT ON COLUMN product_usage_forecasts.accuracy_score IS 'How accurate the forecast was (0-1)';

COMMENT ON COLUMN pricing_recommendations.current_price IS 'Current product price at time of recommendation';
COMMENT ON COLUMN pricing_recommendations.expected_impact IS 'Expected impact on sales volume, revenue, and margin';
COMMENT ON COLUMN pricing_recommendations.risks IS 'Array of potential risks with this price change';
COMMENT ON COLUMN pricing_recommendations.reviewed_by IS 'Admin user who reviewed this recommendation';
COMMENT ON COLUMN pricing_recommendations.reviewed_at IS 'When this recommendation was reviewed';
COMMENT ON COLUMN pricing_recommendations.rejection_reason IS 'Reason for rejection if status is rejected';

COMMENT ON TABLE tasks IS 'Follow-up tasks for sales opportunities';
COMMENT ON TABLE pricing_history IS 'Audit trail of all product pricing changes';

