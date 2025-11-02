-- Migration: CRM and Lead Management System
-- Created: 2025-11-01
-- Description: Comprehensive CRM with leads, regional pricing, buying groups, rebate tracking, magic links, and sample requests

-- =====================================================
-- 1. REGIONS TABLE
-- =====================================================
-- Define pricing regions (Tier 1: Georgia, Tier 2: Border states, Tier 3: Outer states)
CREATE TABLE IF NOT EXISTS regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  tier INTEGER NOT NULL CHECK (tier IN (1, 2, 3)),
  states TEXT[] NOT NULL, -- Array of state codes (e.g., ['GA'], ['FL', 'SC', 'NC', 'TN', 'AL'])
  price_multiplier DECIMAL(5,4) NOT NULL DEFAULT 1.0000, -- Multiplier for base price (e.g., 1.05 for 5% markup)
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 2. BUYING GROUPS TABLE
-- =====================================================
-- Define buying groups with rebate structures
CREATE TABLE IF NOT EXISTS buying_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE, -- Short code (e.g., 'GPO1', 'SYSCO')
  monthly_rebate_percentage DECIMAL(5,2) NOT NULL DEFAULT 3.00, -- 3% monthly rebate
  annual_rebate_percentage DECIMAL(5,2) NOT NULL DEFAULT 1.00, -- 1% annual growth-based rebate
  price_markup_percentage DECIMAL(5,2) NOT NULL DEFAULT 3.50, -- 3.5% markup to cover rebate
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 3. LEADS TABLE
-- =====================================================
-- Store potential customers (leads) before they become active customers
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Company Information
  company_name TEXT NOT NULL,
  industry TEXT,
  company_size TEXT, -- e.g., 'Small (1-50)', 'Medium (51-200)', 'Large (201+)'
  website TEXT,
  
  -- Contact Information
  contact_name TEXT,
  contact_title TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  mobile TEXT,
  
  -- Address
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT NOT NULL, -- State code (e.g., 'GA', 'FL')
  zip_code TEXT,
  country TEXT DEFAULT 'US',
  
  -- Lead Management
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'converted', 'lost', 'inactive')),
  source TEXT, -- e.g., 'import', 'website', 'referral', 'trade_show'
  lead_score INTEGER DEFAULT 0, -- 0-100 score based on engagement
  
  -- Regional Pricing
  region_id UUID REFERENCES regions(id),
  
  -- Buying Group
  buying_group_id UUID REFERENCES buying_groups(id),
  
  -- Account Creation
  account_created BOOLEAN DEFAULT false,
  user_id UUID REFERENCES auth.users(id), -- Linked user account if created
  account_created_at TIMESTAMP,
  
  -- Notes & Tags
  notes TEXT,
  tags TEXT[], -- e.g., ['high_value', 'quick_close', 'price_sensitive']
  
  -- Tracking
  last_contacted_at TIMESTAMP,
  last_email_sent_at TIMESTAMP,
  last_email_opened_at TIMESTAMP,
  last_email_clicked_at TIMESTAMP,
  conversion_date TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- 4. LEAD ACTIVITIES TABLE
-- =====================================================
-- Track all interactions with leads
CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'email_sent', 'email_opened', 'email_clicked', 'email_replied',
    'call_made', 'call_received', 'meeting_scheduled', 'meeting_completed',
    'quote_sent', 'sample_requested', 'sample_sent',
    'note_added', 'status_changed', 'account_created'
  )),
  
  subject TEXT,
  description TEXT,
  metadata JSONB, -- Store additional data (e.g., email campaign ID, product IDs)
  
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 5. MAGIC LINK TOKENS TABLE
-- =====================================================
-- Store magic link tokens for passwordless authentication
CREATE TABLE IF NOT EXISTS magic_link_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  lead_id UUID REFERENCES leads(id), -- For leads that don't have accounts yet
  
  token TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  
  purpose TEXT NOT NULL DEFAULT 'login' CHECK (purpose IN ('login', 'signup', 'offer_access', 'sample_request')),
  redirect_url TEXT, -- Where to redirect after successful auth
  
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  ip_address TEXT,
  user_agent TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 6. EMAIL CAMPAIGNS TABLE
-- =====================================================
-- Store email campaign templates and tracking
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_template TEXT NOT NULL, -- HTML email template with placeholders
  
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('promotional', 'nurture', 'announcement', 'sample_offer', 'custom')),
  
  target_criteria JSONB, -- Filter criteria for leads (e.g., {"region": "tier1", "status": "qualified"})
  
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused')),
  scheduled_at TIMESTAMP,
  sent_at TIMESTAMP,
  
  total_recipients INTEGER DEFAULT 0,
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_replied INTEGER DEFAULT 0,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 7. EMAIL CAMPAIGN RECIPIENTS TABLE
-- =====================================================
-- Track individual email sends and engagement
CREATE TABLE IF NOT EXISTS email_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  
  email TEXT NOT NULL,
  personalization_data JSONB, -- Data used to personalize email (name, company, etc.)
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'bounced', 'failed')),
  
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  replied_at TIMESTAMP,
  bounced_at TIMESTAMP,
  
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  
  magic_link_token TEXT, -- Magic link token included in email
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 8. SAMPLE REQUESTS TABLE
-- =====================================================
-- Track product sample requests from customers/leads
CREATE TABLE IF NOT EXISTS sample_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Requester Information
  user_id UUID REFERENCES auth.users(id),
  lead_id UUID REFERENCES leads(id),
  
  requester_name TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  requester_phone TEXT,
  requester_company TEXT,
  
  -- Product Information
  product_id UUID NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  product_sku TEXT NOT NULL,
  
  -- Request Details
  quantity INTEGER DEFAULT 1,
  purpose TEXT, -- Why they need the sample
  notes TEXT,
  
  -- Status Tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'shipped', 'delivered', 'declined')),
  
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP,
  
  shipped_at TIMESTAMP,
  tracking_number TEXT,
  carrier TEXT,
  
  delivered_at TIMESTAMP,
  
  -- Follow-up
  follow_up_scheduled BOOLEAN DEFAULT false,
  follow_up_completed BOOLEAN DEFAULT false,
  follow_up_notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 9. REBATES TABLE
-- =====================================================
-- Track rebates owed to customers in buying groups
CREATE TABLE IF NOT EXISTS rebates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id UUID NOT NULL REFERENCES auth.users(id),
  buying_group_id UUID NOT NULL REFERENCES buying_groups(id),
  
  rebate_type TEXT NOT NULL CHECK (rebate_type IN ('monthly', 'annual')),
  
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  total_purchases DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  rebate_percentage DECIMAL(5,2) NOT NULL,
  rebate_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  
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

-- =====================================================
-- 10. LEAD PRICING TABLE
-- =====================================================
-- Store custom pricing for specific leads (overrides regional pricing)
CREATE TABLE IF NOT EXISTS lead_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  
  -- Either product_id OR category_id should be set, not both
  CONSTRAINT lead_pricing_product_or_category CHECK (
    (product_id IS NOT NULL AND category_id IS NULL) OR
    (product_id IS NULL AND category_id IS NOT NULL)
  ),
  
  custom_price DECIMAL(10,2),
  price_multiplier DECIMAL(5,4), -- Alternative to custom_price
  
  valid_from DATE,
  valid_until DATE,
  
  notes TEXT,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Leads indexes
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_state ON leads(state);
CREATE INDEX idx_leads_region_id ON leads(region_id);
CREATE INDEX idx_leads_buying_group_id ON leads(buying_group_id);
CREATE INDEX idx_leads_user_id ON leads(user_id);
CREATE INDEX idx_leads_lead_score ON leads(lead_score DESC);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);

-- Lead activities indexes
CREATE INDEX idx_lead_activities_lead_id ON lead_activities(lead_id);
CREATE INDEX idx_lead_activities_type ON lead_activities(activity_type);
CREATE INDEX idx_lead_activities_created_at ON lead_activities(created_at DESC);

-- Magic link tokens indexes
CREATE INDEX idx_magic_link_tokens_token ON magic_link_tokens(token);
CREATE INDEX idx_magic_link_tokens_email ON magic_link_tokens(email);
CREATE INDEX idx_magic_link_tokens_expires_at ON magic_link_tokens(expires_at);
CREATE INDEX idx_magic_link_tokens_user_id ON magic_link_tokens(user_id);
CREATE INDEX idx_magic_link_tokens_lead_id ON magic_link_tokens(lead_id);

-- Email campaign indexes
CREATE INDEX idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX idx_email_campaigns_created_at ON email_campaigns(created_at DESC);

-- Email campaign recipients indexes
CREATE INDEX idx_email_campaign_recipients_campaign_id ON email_campaign_recipients(campaign_id);
CREATE INDEX idx_email_campaign_recipients_lead_id ON email_campaign_recipients(lead_id);
CREATE INDEX idx_email_campaign_recipients_status ON email_campaign_recipients(status);

-- Sample requests indexes
CREATE INDEX idx_sample_requests_user_id ON sample_requests(user_id);
CREATE INDEX idx_sample_requests_lead_id ON sample_requests(lead_id);
CREATE INDEX idx_sample_requests_product_id ON sample_requests(product_id);
CREATE INDEX idx_sample_requests_status ON sample_requests(status);
CREATE INDEX idx_sample_requests_created_at ON sample_requests(created_at DESC);

-- Rebates indexes
CREATE INDEX idx_rebates_user_id ON rebates(user_id);
CREATE INDEX idx_rebates_buying_group_id ON rebates(buying_group_id);
CREATE INDEX idx_rebates_status ON rebates(status);
CREATE INDEX idx_rebates_period_end ON rebates(period_end DESC);

-- Lead pricing indexes
CREATE INDEX idx_lead_pricing_lead_id ON lead_pricing(lead_id);
CREATE INDEX idx_lead_pricing_product_id ON lead_pricing(product_id);
CREATE INDEX idx_lead_pricing_category_id ON lead_pricing(category_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE buying_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE magic_link_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sample_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE rebates ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_pricing ENABLE ROW LEVEL SECURITY;

-- Regions: Admins can manage, everyone can view active regions
CREATE POLICY "Admins can manage regions" ON regions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
    )
  );

CREATE POLICY "Everyone can view active regions" ON regions
  FOR SELECT USING (is_active = true);

-- Buying Groups: Admins can manage, everyone can view active groups
CREATE POLICY "Admins can manage buying groups" ON buying_groups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
    )
  );

CREATE POLICY "Everyone can view active buying groups" ON buying_groups
  FOR SELECT USING (is_active = true);

-- Leads: Admins can manage all leads
CREATE POLICY "Admins can manage leads" ON leads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
    )
  );

-- Lead Activities: Admins can manage, users can view their own
CREATE POLICY "Admins can manage lead activities" ON lead_activities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
    )
  );

-- Magic Link Tokens: System-level access only (no RLS policies)
-- Users access via API endpoints with server-side validation

-- Email Campaigns: Admins only
CREATE POLICY "Admins can manage email campaigns" ON email_campaigns
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
    )
  );

-- Email Campaign Recipients: Admins only
CREATE POLICY "Admins can manage email campaign recipients" ON email_campaign_recipients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
    )
  );

-- Sample Requests: Users can view/create their own, admins can manage all
CREATE POLICY "Users can view their own sample requests" ON sample_requests
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create sample requests" ON sample_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all sample requests" ON sample_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
    )
  );

-- Rebates: Users can view their own, admins can manage all
CREATE POLICY "Users can view their own rebates" ON rebates
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all rebates" ON rebates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
    )
  );

-- Lead Pricing: Admins only
CREATE POLICY "Admins can manage lead pricing" ON lead_pricing
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
    )
  );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to calculate lead price based on region, buying group, and custom pricing
CREATE OR REPLACE FUNCTION get_lead_price(
  p_lead_id UUID,
  p_product_id UUID
) RETURNS DECIMAL AS $$
DECLARE
  v_base_price DECIMAL;
  v_final_price DECIMAL;
  v_region_multiplier DECIMAL;
  v_buying_group_markup DECIMAL;
  v_custom_price DECIMAL;
  v_custom_multiplier DECIMAL;
BEGIN
  -- Get base price from product
  SELECT price INTO v_base_price
  FROM products
  WHERE id = p_product_id;
  
  -- Check for custom pricing first
  SELECT custom_price, price_multiplier
  INTO v_custom_price, v_custom_multiplier
  FROM lead_pricing
  WHERE lead_id = p_lead_id
    AND product_id = p_product_id
    AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)
    AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
  LIMIT 1;
  
  -- If custom price exists, use it
  IF v_custom_price IS NOT NULL THEN
    RETURN v_custom_price;
  END IF;
  
  -- If custom multiplier exists, apply it
  IF v_custom_multiplier IS NOT NULL THEN
    RETURN v_base_price * v_custom_multiplier;
  END IF;
  
  -- Otherwise, calculate based on region and buying group
  v_final_price := v_base_price;
  
  -- Apply regional pricing
  SELECT r.price_multiplier INTO v_region_multiplier
  FROM leads l
  JOIN regions r ON l.region_id = r.id
  WHERE l.id = p_lead_id;
  
  IF v_region_multiplier IS NOT NULL THEN
    v_final_price := v_final_price * v_region_multiplier;
  END IF;
  
  -- Apply buying group markup
  SELECT bg.price_markup_percentage / 100 INTO v_buying_group_markup
  FROM leads l
  JOIN buying_groups bg ON l.buying_group_id = bg.id
  WHERE l.id = p_lead_id;
  
  IF v_buying_group_markup IS NOT NULL THEN
    v_final_price := v_final_price * (1 + v_buying_group_markup);
  END IF;
  
  RETURN v_final_price;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate rebate for a user
CREATE OR REPLACE FUNCTION calculate_rebate(
  p_user_id UUID,
  p_period_start DATE,
  p_period_end DATE,
  p_rebate_type TEXT
) RETURNS DECIMAL AS $$
DECLARE
  v_total_purchases DECIMAL;
  v_rebate_percentage DECIMAL;
  v_rebate_amount DECIMAL;
BEGIN
  -- Get total purchases for the period
  SELECT COALESCE(SUM(total_amount), 0) INTO v_total_purchases
  FROM orders
  WHERE user_id = p_user_id
    AND created_at >= p_period_start
    AND created_at <= p_period_end
    AND status IN ('completed', 'shipped', 'delivered');
  
  -- Get rebate percentage from buying group
  IF p_rebate_type = 'monthly' THEN
    SELECT bg.monthly_rebate_percentage / 100 INTO v_rebate_percentage
    FROM users u
    JOIN buying_groups bg ON u.buying_group_id = bg.id
    WHERE u.id = p_user_id;
  ELSIF p_rebate_type = 'annual' THEN
    SELECT bg.annual_rebate_percentage / 100 INTO v_rebate_percentage
    FROM users u
    JOIN buying_groups bg ON u.buying_group_id = bg.id
    WHERE u.id = p_user_id;
  END IF;
  
  -- Calculate rebate amount
  v_rebate_amount := v_total_purchases * COALESCE(v_rebate_percentage, 0);
  
  RETURN v_rebate_amount;
END;
$$ LANGUAGE plpgsql;

-- Function to update lead score based on activities
CREATE OR REPLACE FUNCTION update_lead_score(p_lead_id UUID) RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_email_opens INTEGER;
  v_email_clicks INTEGER;
  v_sample_requests INTEGER;
BEGIN
  -- Count email opens (5 points each, max 50)
  SELECT COUNT(*) INTO v_email_opens
  FROM lead_activities
  WHERE lead_id = p_lead_id AND activity_type = 'email_opened';
  v_score := v_score + LEAST(v_email_opens * 5, 50);
  
  -- Count email clicks (10 points each, max 50)
  SELECT COUNT(*) INTO v_email_clicks
  FROM lead_activities
  WHERE lead_id = p_lead_id AND activity_type = 'email_clicked';
  v_score := v_score + LEAST(v_email_clicks * 10, 50);
  
  -- Count sample requests (20 points each)
  SELECT COUNT(*) INTO v_sample_requests
  FROM sample_requests
  WHERE lead_id = p_lead_id;
  v_score := v_score + (v_sample_requests * 20);
  
  -- Update lead score
  UPDATE leads
  SET lead_score = LEAST(v_score, 100)
  WHERE id = p_lead_id;
  
  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_regions_updated_at BEFORE UPDATE ON regions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_buying_groups_updated_at BEFORE UPDATE ON buying_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sample_requests_updated_at BEFORE UPDATE ON sample_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rebates_updated_at BEFORE UPDATE ON rebates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lead_pricing_updated_at BEFORE UPDATE ON lead_pricing
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_campaigns_updated_at BEFORE UPDATE ON email_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED DATA
-- =====================================================

-- Insert default regions
INSERT INTO regions (name, tier, states, price_multiplier, description) VALUES
  ('Georgia (Local)', 1, ARRAY['GA'], 1.0000, 'Local pricing for Georgia customers'),
  ('Border States', 2, ARRAY['FL', 'SC', 'NC', 'TN', 'AL'], 1.0500, '5% markup for border state customers'),
  ('Outer States', 3, ARRAY['VA', 'WV', 'KY', 'MS', 'LA', 'AR'], 1.1000, '10% markup for outer state customers')
ON CONFLICT (name) DO NOTHING;

-- Insert sample buying groups
INSERT INTO buying_groups (name, code, monthly_rebate_percentage, annual_rebate_percentage, price_markup_percentage, description) VALUES
  ('Sysco', 'SYSCO', 3.00, 1.00, 3.50, 'Sysco buying group members'),
  ('US Foods', 'USFOODS', 3.00, 1.00, 3.50, 'US Foods buying group members'),
  ('Performance Food Group', 'PFG', 3.00, 1.00, 3.50, 'Performance Food Group members')
ON CONFLICT (code) DO NOTHING;
