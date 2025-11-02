-- Migration: Create feature flags system
-- Description: Centralized feature flag management for toggling features on/off

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_name TEXT UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT false,
  description TEXT,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for fast lookups
CREATE INDEX idx_feature_flags_name ON feature_flags(feature_name);
CREATE INDEX idx_feature_flags_enabled ON feature_flags(enabled) WHERE enabled = true;

-- Enable RLS
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Everyone can read feature flags
CREATE POLICY "Anyone can view feature flags"
  ON feature_flags
  FOR SELECT
  TO authenticated
  USING (true);

-- Only super_admins can modify feature flags
CREATE POLICY "Super admins can manage feature flags"
  ON feature_flags
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
      AND organization_members.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
      AND organization_members.role = 'super_admin'
    )
  );

-- Insert default feature flags
INSERT INTO feature_flags (feature_name, enabled, description, config) VALUES
('advanced_pricing', true, 'Customer-specific pricing tiers and volume discounts', '{"priority": 2}'),
('ai_excel_import', true, 'AI-powered Excel import with smart column mapping', '{"priority": 2}'),
('email_campaigns', true, 'Email marketing campaigns with Resend integration', '{"priority": 2}'),
('semantic_search', true, 'OpenAI-powered semantic product search', '{"priority": 2}'),
('smart_recommendations', true, 'AI-driven product recommendations', '{"priority": 2}'),
('inventory_management', false, 'Track inventory across locations (dormant)', '{"priority": 3, "dormant": true}'),
('multi_warehouse', false, 'Support for multiple warehouse locations (dormant)', '{"priority": 3, "dormant": true}'),
('customer_image_upload', true, 'AI-powered product recognition from customer photos', '{"priority": 3}')
ON CONFLICT (feature_name) DO NOTHING;

-- Helper function to check if feature is enabled
CREATE OR REPLACE FUNCTION is_feature_enabled(feature TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_enabled BOOLEAN;
BEGIN
  SELECT enabled INTO is_enabled
  FROM feature_flags
  WHERE feature_name = feature;
  
  RETURN COALESCE(is_enabled, false);
END;
$$;

-- Helper function to get feature config
CREATE OR REPLACE FUNCTION get_feature_config(feature TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  feature_config JSONB;
BEGIN
  SELECT config INTO feature_config
  FROM feature_flags
  WHERE feature_name = feature;
  
  RETURN COALESCE(feature_config, '{}'::jsonb);
END;
$$;

COMMENT ON TABLE feature_flags IS 'Centralized feature flag management for toggling features on/off';
COMMENT ON FUNCTION is_feature_enabled IS 'Check if a feature is enabled by name';
COMMENT ON FUNCTION get_feature_config IS 'Get feature configuration JSON by name';
