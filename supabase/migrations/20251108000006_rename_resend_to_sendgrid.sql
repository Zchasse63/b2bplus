-- Migration: Rename resend_message_id to sendgrid_message_id
-- Date: 2025-11-08
-- Purpose: Replace Resend email service with SendGrid across the platform

-- Rename column in email_campaign_recipients table
ALTER TABLE email_campaign_recipients 
  RENAME COLUMN resend_message_id TO sendgrid_message_id;

-- Add comment to document the change
COMMENT ON COLUMN email_campaign_recipients.sendgrid_message_id IS 
  'SendGrid message ID for tracking email delivery, opens, clicks, and bounces via SendGrid webhooks';

