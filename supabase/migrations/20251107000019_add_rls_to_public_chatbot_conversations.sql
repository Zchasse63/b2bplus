-- Add Row Level Security to public_chatbot_conversations table
-- SECURITY: Prevents unauthorized access to chatbot conversation data

-- Enable RLS on the table
ALTER TABLE IF EXISTS public_chatbot_conversations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Service role can manage all conversations" ON public_chatbot_conversations;
DROP POLICY IF EXISTS "Users can read their own conversation by ID" ON public_chatbot_conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public_chatbot_conversations;

-- Policy 1: Service role (backend) can manage all conversations
CREATE POLICY "Service role can manage all conversations"
  ON public_chatbot_conversations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy 2: Users can read ONLY their specific conversation by ID
-- This prevents browsing all conversations
CREATE POLICY "Users can read their own conversation by ID"
  ON public_chatbot_conversations
  FOR SELECT
  TO authenticated, anon
  USING (
    -- Only allow access if conversation_id is explicitly requested
    -- and matches session metadata
    id = current_setting('request.jwt.claims', true)::json->>'conversation_id'
    OR
    -- Alternative: Allow if IP matches (for anonymous users)
    metadata->>'ip_address' = current_setting('request.headers', true)::json->>'x-forwarded-for'
  );

-- Policy 3: Authenticated users can create their own conversations
CREATE POLICY "Authenticated users can create conversations"
  ON public_chatbot_conversations
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    -- Ensure metadata contains proper IP tracking
    metadata IS NOT NULL
    AND metadata->>'ip_address' IS NOT NULL
  );

-- Add index on metadata for performance
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_ip
  ON public_chatbot_conversations ((metadata->>'ip_address'));

-- Add comment explaining security
COMMENT ON TABLE public_chatbot_conversations IS
  'Public chatbot conversations with RLS enabled. Access controlled by conversation ID and IP address.';
