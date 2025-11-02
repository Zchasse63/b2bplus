-- =====================================================
-- MANUAL CRM MIGRATION SCRIPT
-- Apply this in Supabase SQL Editor
-- =====================================================

-- 1. Regions table (already created)
-- 2. Buying Groups table (already created)
-- 3. Leads table (already created)

-- 4. Lead Activities Table
CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('note', 'email_sent', 'email_opened', 'email_clicked', 'call', 'meeting', 'status_changed', 'sample_requested', 'account_created')),
  subject TEXT,
  description TEXT,
  metadata JSONB,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_lead_activities_lead_id ON lead_activities(lead_id);
CREATE INDEX idx_lead_activities_type ON lead_activities(activity_type);
CREATE INDEX idx_lead_activities_created_at ON lead_activities(created_at DESC);

-- 5. Magic Link Tokens Table
CREATE TABLE IF NOT EXISTS magic_link_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  email TEXT,
  phone TEXT,
  user_id UUID REFERENCES auth.users(id),
  lead_id UUID REFERENCES leads(id),
  purpose TEXT NOT NULL CHECK (purpose IN ('login', 'signup', 'offer_access', 'sample_offer')),
  redirect_url TEXT,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_magic_link_tokens_token ON magic_link_tokens(token);
CREATE INDEX idx_magic_link_tokens_email ON magic_link_tokens(email);
CREATE INDEX idx_magic_link_tokens_expires_at ON magic_link_tokens(expires_at);

-- 6. Sample Requests Table
CREATE TABLE IF NOT EXISTS sample_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  lead_id UUID REFERENCES leads(id),
  requester_name TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  requester_phone TEXT,
  requester_company TEXT,
  product_id UUID NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  product_sku TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  purpose TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'shipped', 'delivered')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP,
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP,
  tracking_number TEXT,
  carrier TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sample_requests_user_id ON sample_requests(user_id);
CREATE INDEX idx_sample_requests_lead_id ON sample_requests(lead_id);
CREATE INDEX idx_sample_requests_status ON sample_requests(status);

-- 7. Rebates Table
CREATE TABLE IF NOT EXISTS rebates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  buying_group_id UUID NOT NULL REFERENCES buying_groups(id),
  rebate_type TEXT NOT NULL CHECK (rebate_type IN ('monthly', 'annual')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_purchases DECIMAL(12,2) NOT NULL DEFAULT 0,
  rebate_percentage DECIMAL(5,2) NOT NULL,
  rebate_amount DECIMAL(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP,
  paid_at TIMESTAMP,
  payment_method TEXT,
  payment_reference TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_rebates_user_id ON rebates(user_id);
CREATE INDEX idx_rebates_buying_group_id ON rebates(buying_group_id);
CREATE INDEX idx_rebates_period ON rebates(period_start, period_end);
CREATE INDEX idx_rebates_status ON rebates(status);

-- 8. Lead Pricing Table (custom pricing overrides)
CREATE TABLE IF NOT EXISTS lead_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  custom_price DECIMAL(10,2) NOT NULL,
  valid_from DATE NOT NULL,
  valid_until DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(lead_id, product_id, valid_from)
);

CREATE INDEX idx_lead_pricing_lead_id ON lead_pricing(lead_id);
CREATE INDEX idx_lead_pricing_product_id ON lead_pricing(product_id);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function: Get Lead Price (with region and buying group)
CREATE OR REPLACE FUNCTION get_lead_price(p_lead_id UUID, p_product_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_base_price DECIMAL(10,2);
  v_region_multiplier DECIMAL(5,4);
  v_buying_group_markup DECIMAL(5,2);
  v_custom_price DECIMAL(10,2);
  v_final_price DECIMAL(10,2);
BEGIN
  -- Get base price from product
  SELECT price INTO v_base_price
  FROM products
  WHERE id = p_product_id;
  
  -- Check for custom pricing
  SELECT custom_price INTO v_custom_price
  FROM lead_pricing
  WHERE lead_id = p_lead_id 
    AND product_id = p_product_id
    AND valid_from <= CURRENT_DATE
    AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
  ORDER BY valid_from DESC
  LIMIT 1;
  
  -- If custom price exists, return it
  IF v_custom_price IS NOT NULL THEN
    RETURN v_custom_price;
  END IF;
  
  -- Get region multiplier
  SELECT r.price_multiplier INTO v_region_multiplier
  FROM leads l
  JOIN regions r ON l.region_id = r.id
  WHERE l.id = p_lead_id;
  
  -- Get buying group markup
  SELECT bg.price_markup_percentage INTO v_buying_group_markup
  FROM leads l
  JOIN buying_groups bg ON l.buying_group_id = bg.id
  WHERE l.id = p_lead_id;
  
  -- Calculate final price
  v_final_price := v_base_price;
  
  -- Apply region multiplier
  IF v_region_multiplier IS NOT NULL THEN
    v_final_price := v_final_price * v_region_multiplier;
  END IF;
  
  -- Apply buying group markup
  IF v_buying_group_markup IS NOT NULL THEN
    v_final_price := v_final_price * (1 + v_buying_group_markup / 100);
  END IF;
  
  RETURN v_final_price;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate Rebate
CREATE OR REPLACE FUNCTION calculate_rebate(
  p_user_id UUID,
  p_period_start DATE,
  p_period_end DATE,
  p_rebate_type TEXT
)
RETURNS DECIMAL(12,2) AS $$
DECLARE
  v_total_purchases DECIMAL(12,2);
  v_rebate_percentage DECIMAL(5,2);
  v_rebate_amount DECIMAL(12,2);
BEGIN
  -- Get total purchases for the period
  SELECT COALESCE(SUM(total_amount), 0) INTO v_total_purchases
  FROM orders
  WHERE user_id = p_user_id
    AND created_at >= p_period_start
    AND created_at <= p_period_end
    AND status IN ('completed', 'shipped', 'delivered');
  
  -- Get rebate percentage from user's buying group
  IF p_rebate_type = 'monthly' THEN
    SELECT bg.monthly_rebate_percentage INTO v_rebate_percentage
    FROM profiles p
    JOIN buying_groups bg ON p.buying_group_id = bg.id
    WHERE p.id = p_user_id;
  ELSIF p_rebate_type = 'annual' THEN
    SELECT bg.annual_rebate_percentage INTO v_rebate_percentage
    FROM profiles p
    JOIN buying_groups bg ON p.buying_group_id = bg.id
    WHERE p.id = p_user_id;
  END IF;
  
  -- Calculate rebate amount
  IF v_rebate_percentage IS NOT NULL THEN
    v_rebate_amount := v_total_purchases * (v_rebate_percentage / 100);
  ELSE
    v_rebate_amount := 0;
  END IF;
  
  RETURN v_rebate_amount;
END;
$$ LANGUAGE plpgsql;

-- Function: Update Lead Score
CREATE OR REPLACE FUNCTION update_lead_score(p_lead_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_activity_count INTEGER;
  v_email_opened_count INTEGER;
  v_email_clicked_count INTEGER;
  v_days_since_contact INTEGER;
BEGIN
  -- Base score from activities
  SELECT COUNT(*) INTO v_activity_count
  FROM lead_activities
  WHERE lead_id = p_lead_id;
  
  v_score := v_score + LEAST(v_activity_count * 5, 30); -- Max 30 points
  
  -- Email engagement
  SELECT COUNT(*) INTO v_email_opened_count
  FROM lead_activities
  WHERE lead_id = p_lead_id AND activity_type = 'email_opened';
  
  SELECT COUNT(*) INTO v_email_clicked_count
  FROM lead_activities
  WHERE lead_id = p_lead_id AND activity_type = 'email_clicked';
  
  v_score := v_score + LEAST(v_email_opened_count * 3, 15); -- Max 15 points
  v_score := v_score + LEAST(v_email_clicked_count * 5, 25); -- Max 25 points
  
  -- Recency (days since last contact)
  SELECT EXTRACT(DAY FROM NOW() - last_contacted_at) INTO v_days_since_contact
  FROM leads
  WHERE id = p_lead_id;
  
  IF v_days_since_contact IS NOT NULL THEN
    IF v_days_since_contact < 7 THEN
      v_score := v_score + 20;
    ELSIF v_days_since_contact < 30 THEN
      v_score := v_score + 10;
    END IF;
  END IF;
  
  -- Sample requested
  IF EXISTS (SELECT 1 FROM sample_requests WHERE lead_id = p_lead_id) THEN
    v_score := v_score + 10;
  END IF;
  
  -- Cap at 100
  v_score := LEAST(v_score, 100);
  
  -- Update lead score
  UPDATE leads SET lead_score = v_score WHERE id = p_lead_id;
  
  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE buying_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE magic_link_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE sample_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE rebates ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_pricing ENABLE ROW LEVEL SECURITY;

-- Regions: Admins can manage, everyone can view active regions
CREATE POLICY "Admins can manage regions" ON regions FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = auth.uid() AND om.role = 'admin'
  )
);

CREATE POLICY "Everyone can view active regions" ON regions FOR SELECT TO authenticated
USING (is_active = true);

-- Buying Groups: Admins can manage, everyone can view active groups
CREATE POLICY "Admins can manage buying groups" ON buying_groups FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = auth.uid() AND om.role = 'admin'
  )
);

CREATE POLICY "Everyone can view active buying groups" ON buying_groups FOR SELECT TO authenticated
USING (is_active = true);

-- Leads: Admins can manage all leads
CREATE POLICY "Admins can manage leads" ON leads FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = auth.uid() AND om.role = 'admin'
  )
);

-- Lead Activities: Admins can manage all activities
CREATE POLICY "Admins can manage lead activities" ON lead_activities FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = auth.uid() AND om.role = 'admin'
  )
);

-- Magic Link Tokens: System-level only (no user access)
CREATE POLICY "System only can manage magic links" ON magic_link_tokens FOR ALL TO authenticated
USING (false);

-- Sample Requests: Users can view their own, admins can manage all
CREATE POLICY "Users can view own sample requests" ON sample_requests FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all sample requests" ON sample_requests FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = auth.uid() AND om.role = 'admin'
  )
);

-- Rebates: Users can view their own, admins can manage all
CREATE POLICY "Users can view own rebates" ON rebates FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all rebates" ON rebates FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = auth.uid() AND om.role = 'admin'
  )
);

-- Lead Pricing: Admins only
CREATE POLICY "Admins can manage lead pricing" ON lead_pricing FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = auth.uid() AND om.role = 'admin'
  )
);

-- =====================================================
-- SEED DATA
-- =====================================================

-- Insert default regions
INSERT INTO regions (name, tier, states, price_multiplier, description) VALUES
  ('Georgia (Local)', 1, ARRAY['GA'], 1.0000, 'Local Georgia customers - base pricing'),
  ('Border States', 2, ARRAY['FL', 'SC', 'NC', 'TN', 'AL'], 1.0500, 'Border state customers - 5% markup'),
  ('Outer States', 3, ARRAY['TX', 'CA', 'NY', 'IL', 'PA', 'OH', 'MI', 'VA', 'MD', 'NJ', 'MA'], 1.1000, 'Outer state customers - 10% markup')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- COMPLETE!
-- =====================================================
