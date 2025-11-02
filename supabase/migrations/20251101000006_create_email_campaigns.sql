-- Migration: Create email campaigns system
-- Description: Email marketing campaigns with Resend integration

-- Email templates
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  template_variables JSONB DEFAULT '[]',
  category TEXT CHECK (category IN ('marketing', 'transactional', 'notification')),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email campaigns
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  html_content TEXT,
  text_content TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  target_audience JSONB DEFAULT '{}',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaign recipients
CREATE TABLE IF NOT EXISTS email_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  bounced_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  resend_message_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(campaign_id, customer_id)
);

-- Email campaign clicks (track link clicks)
CREATE TABLE IF NOT EXISTS email_campaign_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES email_campaign_recipients(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_agent TEXT,
  ip_address INET
);

-- Automated email triggers
CREATE TABLE IF NOT EXISTS automated_email_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  trigger_event TEXT NOT NULL CHECK (trigger_event IN (
    'order_placed', 
    'order_shipped', 
    'order_delivered', 
    'invoice_generated',
    'payment_received',
    'account_created',
    'password_reset',
    'low_stock_alert'
  )),
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  delay_minutes INTEGER DEFAULT 0,
  conditions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Automated email queue
CREATE TABLE IF NOT EXISTS automated_email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_id UUID REFERENCES automated_email_triggers(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  template_data JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_scheduled ON email_campaigns(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_by ON email_campaigns(created_by);

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON email_campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_customer ON email_campaign_recipients(customer_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON email_campaign_recipients(status);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_sent ON email_campaign_recipients(sent_at);

CREATE INDEX IF NOT EXISTS idx_campaign_clicks_recipient ON email_campaign_clicks(recipient_id);
CREATE INDEX IF NOT EXISTS idx_campaign_clicks_url ON email_campaign_clicks(url);

CREATE INDEX IF NOT EXISTS idx_automated_triggers_event ON automated_email_triggers(trigger_event);
CREATE INDEX IF NOT EXISTS idx_automated_triggers_active ON automated_email_triggers(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_automated_queue_status ON automated_email_queue(status);
CREATE INDEX IF NOT EXISTS idx_automated_queue_scheduled ON automated_email_queue(scheduled_for);

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaign_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE automated_email_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE automated_email_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Email templates: Admins only
CREATE POLICY "Admins can manage email templates"
  ON email_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'super_admin')
    )
  );

-- Email campaigns: Admins only
CREATE POLICY "Admins can manage email campaigns"
  ON email_campaigns FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'super_admin')
    )
  );

-- Campaign recipients: Admins can view all, customers can view their own
CREATE POLICY "Admins can view all campaign recipients"
  ON email_campaign_recipients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Customers can view own campaign emails"
  ON email_campaign_recipients FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

-- Campaign clicks: Admins only
CREATE POLICY "Admins can view campaign clicks"
  ON email_campaign_clicks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'super_admin')
    )
  );

-- Automated triggers: Admins only
CREATE POLICY "Admins can manage automated triggers"
  ON automated_email_triggers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'super_admin')
    )
  );

-- Automated queue: Admins only
CREATE POLICY "Admins can view automated queue"
  ON automated_email_queue FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'super_admin')
    )
  );

-- Function to get campaign statistics
CREATE OR REPLACE FUNCTION get_campaign_stats(p_campaign_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_recipients', COUNT(*),
    'sent', COUNT(*) FILTER (WHERE status IN ('sent', 'delivered', 'opened', 'clicked')),
    'delivered', COUNT(*) FILTER (WHERE status IN ('delivered', 'opened', 'clicked')),
    'opened', COUNT(*) FILTER (WHERE status IN ('opened', 'clicked')),
    'clicked', COUNT(*) FILTER (WHERE status = 'clicked'),
    'bounced', COUNT(*) FILTER (WHERE status = 'bounced'),
    'failed', COUNT(*) FILTER (WHERE status = 'failed'),
    'open_rate', CASE 
      WHEN COUNT(*) FILTER (WHERE status IN ('delivered', 'opened', 'clicked')) > 0 
      THEN ROUND(100.0 * COUNT(*) FILTER (WHERE status IN ('opened', 'clicked')) / 
           COUNT(*) FILTER (WHERE status IN ('delivered', 'opened', 'clicked')), 2)
      ELSE 0 
    END,
    'click_rate', CASE 
      WHEN COUNT(*) FILTER (WHERE status IN ('opened', 'clicked')) > 0 
      THEN ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'clicked') / 
           COUNT(*) FILTER (WHERE status IN ('opened', 'clicked')), 2)
      ELSE 0 
    END
  ) INTO stats
  FROM email_campaign_recipients
  WHERE campaign_id = p_campaign_id;
  
  RETURN stats;
END;
$$;

-- Insert default email templates
INSERT INTO email_templates (name, subject, html_content, text_content, category) VALUES
(
  'order_confirmation',
  'Order Confirmation - Order #{{order_number}}',
  '<h1>Thank you for your order!</h1><p>Your order #{{order_number}} has been received and is being processed.</p><p>Order Total: ${{order_total}}</p>',
  'Thank you for your order! Your order #{{order_number}} has been received and is being processed. Order Total: ${{order_total}}',
  'transactional'
),
(
  'order_shipped',
  'Your Order Has Shipped - Order #{{order_number}}',
  '<h1>Your order is on the way!</h1><p>Order #{{order_number}} has been shipped.</p><p>Tracking Number: {{tracking_number}}</p>',
  'Your order is on the way! Order #{{order_number}} has been shipped. Tracking Number: {{tracking_number}}',
  'transactional'
),
(
  'invoice_generated',
  'Invoice #{{invoice_number}} - Payment Due',
  '<h1>Invoice Generated</h1><p>Invoice #{{invoice_number}} has been generated for your order.</p><p>Amount Due: ${{amount_due}}</p><p>Due Date: {{due_date}}</p>',
  'Invoice #{{invoice_number}} has been generated. Amount Due: ${{amount_due}}. Due Date: {{due_date}}',
  'transactional'
),
(
  'welcome_email',
  'Welcome to B2B+!',
  '<h1>Welcome to B2B+!</h1><p>Thank you for creating an account. We are excited to have you as a customer.</p>',
  'Welcome to B2B+! Thank you for creating an account.',
  'marketing'
)
ON CONFLICT (name) DO NOTHING;

-- Insert default automated triggers
INSERT INTO automated_email_triggers (name, description, trigger_event, is_active) VALUES
('Order Confirmation', 'Send confirmation email when order is placed', 'order_placed', true),
('Order Shipped', 'Send notification when order ships', 'order_shipped', true),
('Invoice Generated', 'Send invoice when generated', 'invoice_generated', true),
('Welcome Email', 'Send welcome email to new customers', 'account_created', true)
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE email_templates IS 'Reusable email templates';
COMMENT ON TABLE email_campaigns IS 'Email marketing campaigns';
COMMENT ON TABLE email_campaign_recipients IS 'Campaign recipient tracking';
COMMENT ON TABLE automated_email_triggers IS 'Automated email triggers for transactional emails';
COMMENT ON FUNCTION get_campaign_stats IS 'Get campaign statistics (open rate, click rate, etc.)';
