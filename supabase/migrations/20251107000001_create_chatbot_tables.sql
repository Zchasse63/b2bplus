-- ============================================================================
-- Phase 2: AI Backend Logic - Chatbot Tables Migration
-- Created: 2025-11-07
-- Purpose: Create tables for authenticated and public chatbot conversations
-- ============================================================================

-- ============================================================================
-- 1. CHATBOT_CONVERSATIONS TABLE (Authenticated Users)
-- ============================================================================
-- Stores conversation history for authenticated users
CREATE TABLE IF NOT EXISTS chatbot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Conversation Data
  messages JSONB DEFAULT '[]'::jsonb NOT NULL,
  -- Message format: [{ role: 'user' | 'assistant', content: string, timestamp: string }]
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for chatbot_conversations
CREATE INDEX idx_chatbot_conversations_user ON chatbot_conversations(user_id);
CREATE INDEX idx_chatbot_conversations_updated ON chatbot_conversations(updated_at DESC);

-- Enable RLS
ALTER TABLE chatbot_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chatbot_conversations
-- Users can view their own conversations
CREATE POLICY "Users can view their own conversations"
  ON chatbot_conversations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can create their own conversations
CREATE POLICY "Users can create their own conversations"
  ON chatbot_conversations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own conversations
CREATE POLICY "Users can update their own conversations"
  ON chatbot_conversations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own conversations
CREATE POLICY "Users can delete their own conversations"
  ON chatbot_conversations FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- 2. PUBLIC_CHATBOT_CONVERSATIONS TABLE (Unauthenticated Users)
-- ============================================================================
-- Stores conversation history for public/unauthenticated users
CREATE TABLE IF NOT EXISTS public_chatbot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tracking
  ip_address TEXT,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  
  -- Conversation Data
  messages JSONB DEFAULT '[]'::jsonb NOT NULL,
  -- Message format: [{ role: 'user' | 'assistant', content: string, timestamp: string }]
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for public_chatbot_conversations
CREATE INDEX idx_public_chatbot_conversations_ip ON public_chatbot_conversations(ip_address);
CREATE INDEX idx_public_chatbot_conversations_lead ON public_chatbot_conversations(lead_id);
CREATE INDEX idx_public_chatbot_conversations_created ON public_chatbot_conversations(created_at DESC);
CREATE INDEX idx_public_chatbot_conversations_updated ON public_chatbot_conversations(updated_at DESC);

-- No RLS needed for public conversations (accessed via API with IP validation)

-- ============================================================================
-- 3. AUTO-UPDATE TRIGGERS
-- ============================================================================
-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chatbot_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chatbot_conversations_updated_at_trigger
  BEFORE UPDATE ON chatbot_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_chatbot_conversations_updated_at();

CREATE TRIGGER update_public_chatbot_conversations_updated_at_trigger
  BEFORE UPDATE ON public_chatbot_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_chatbot_conversations_updated_at();

-- ============================================================================
-- 4. AUTO-CLEANUP FUNCTIONS
-- ============================================================================
-- Delete old authenticated conversations (privacy - 30 days)
CREATE OR REPLACE FUNCTION delete_old_chatbot_conversations()
RETURNS void AS $$
BEGIN
  DELETE FROM chatbot_conversations
  WHERE updated_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Delete old public conversations (7 days)
CREATE OR REPLACE FUNCTION delete_old_public_chatbot_conversations()
RETURNS void AS $$
BEGIN
  DELETE FROM public_chatbot_conversations
  WHERE updated_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. SCHEDULED CLEANUP (Using pg_cron if available)
-- ============================================================================
-- Note: pg_cron extension must be enabled in Supabase dashboard
-- These will be scheduled via Supabase Edge Functions or cron jobs

-- Schedule daily cleanup at 2 AM for authenticated conversations
-- SELECT cron.schedule(
--   'delete-old-chatbot-conversations',
--   '0 2 * * *', -- 2 AM daily
--   'SELECT delete_old_chatbot_conversations();'
-- );

-- Schedule daily cleanup at 2 AM for public conversations
-- SELECT cron.schedule(
--   'delete-old-public-chatbot-conversations',
--   '0 2 * * *', -- 2 AM daily
--   'SELECT delete_old_public_chatbot_conversations();'
-- );

-- ============================================================================
-- 6. COMMENTS
-- ============================================================================
COMMENT ON TABLE chatbot_conversations IS 'Stores AI chatbot conversation history for authenticated users with 30-day auto-cleanup';
COMMENT ON TABLE public_chatbot_conversations IS 'Stores AI chatbot conversation history for public/unauthenticated users with 7-day auto-cleanup';
COMMENT ON COLUMN chatbot_conversations.messages IS 'JSONB array of conversation messages with role, content, and timestamp';
COMMENT ON COLUMN public_chatbot_conversations.messages IS 'JSONB array of conversation messages with role, content, and timestamp';
COMMENT ON COLUMN public_chatbot_conversations.ip_address IS 'IP address for rate limiting and tracking';
COMMENT ON COLUMN public_chatbot_conversations.lead_id IS 'Linked lead ID if user provided contact information';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Tables created: chatbot_conversations, public_chatbot_conversations
-- Indexes created: 6 indexes for performance
-- RLS policies: Comprehensive security for authenticated conversations
-- Triggers: Auto-update updated_at timestamps
-- Functions: Auto-cleanup for old conversations (30 days auth, 7 days public)
-- ============================================================================

