-- Add campaign_type column to email_campaigns table
ALTER TABLE email_campaigns
ADD COLUMN IF NOT EXISTS campaign_type TEXT DEFAULT 'general';

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_email_campaigns_campaign_type ON email_campaigns(campaign_type);

-- Add comment
COMMENT ON COLUMN email_campaigns.campaign_type IS 'Type of campaign: general, promotional, individual, sample_offer, etc.';
