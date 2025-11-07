-- ============================================================================
-- Phase 2: AI Backend Logic - Support Tickets Table Migration
-- Created: 2025-11-07
-- Purpose: Create support_tickets table for customer support functionality
-- ============================================================================

-- ============================================================================
-- 1. SUPPORT_TICKETS TABLE
-- ============================================================================
-- Stores customer support tickets created by users or AI chatbot
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ticket Details
  ticket_number TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed')),
  
  -- Relationships
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Categorization
  category TEXT CHECK (category IN ('technical', 'billing', 'product', 'shipping', 'general', 'complaint')),
  tags TEXT[], -- Array of tags for filtering
  
  -- AI Integration
  created_by_chatbot BOOLEAN DEFAULT false,
  chatbot_conversation_id UUID REFERENCES chatbot_conversations(id) ON DELETE SET NULL,
  
  -- Resolution
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  
  -- Customer Satisfaction
  customer_rating INTEGER CHECK (customer_rating >= 1 AND customer_rating <= 5),
  customer_feedback TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. SUPPORT_TICKET_COMMENTS TABLE
-- ============================================================================
-- Stores comments/replies on support tickets
CREATE TABLE IF NOT EXISTS support_ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Comment Details
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false, -- Internal notes not visible to customer
  
  -- Attachments
  attachments JSONB DEFAULT '[]'::jsonb,
  -- Format: [{ name: string, url: string, size: number, type: string }]
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. INDEXES
-- ============================================================================
-- Indexes for support_tickets
CREATE INDEX idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_org ON support_tickets(organization_id);
CREATE INDEX idx_support_tickets_assigned ON support_tickets(assigned_to);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX idx_support_tickets_created ON support_tickets(created_at DESC);
CREATE INDEX idx_support_tickets_number ON support_tickets(ticket_number);
CREATE INDEX idx_support_tickets_category ON support_tickets(category);

-- Indexes for support_ticket_comments
CREATE INDEX idx_support_ticket_comments_ticket ON support_ticket_comments(ticket_id);
CREATE INDEX idx_support_ticket_comments_user ON support_ticket_comments(user_id);
CREATE INDEX idx_support_ticket_comments_created ON support_ticket_comments(created_at DESC);

-- ============================================================================
-- 4. RLS POLICIES
-- ============================================================================
-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_tickets
-- Users can view tickets from their organization
CREATE POLICY "Users can view tickets from their organization"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Users can create tickets for their organization
CREATE POLICY "Users can create tickets for their organization"
  ON support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Users can update their own tickets
CREATE POLICY "Users can update their own tickets"
  ON support_tickets FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can update any ticket in their organization
CREATE POLICY "Admins can update any ticket in their organization"
  ON support_tickets FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- RLS Policies for support_ticket_comments
-- Users can view comments on tickets they have access to
CREATE POLICY "Users can view comments on accessible tickets"
  ON support_ticket_comments FOR SELECT
  TO authenticated
  USING (
    ticket_id IN (
      SELECT id FROM support_tickets
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Users can create comments on accessible tickets
CREATE POLICY "Users can create comments on accessible tickets"
  ON support_ticket_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    ticket_id IN (
      SELECT id FROM support_tickets
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Users can update their own comments
CREATE POLICY "Users can update their own comments"
  ON support_ticket_comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 5. FUNCTIONS
-- ============================================================================
-- Function to generate ticket numbers
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  date_part TEXT;
  counter INTEGER;
BEGIN
  date_part := TO_CHAR(NOW(), 'YYYYMMDD');
  
  -- Get the count of tickets today
  SELECT COUNT(*) + 1 INTO counter
  FROM support_tickets
  WHERE ticket_number LIKE 'TKT-' || date_part || '-%';
  
  new_number := 'TKT-' || date_part || '-' || LPAD(counter::TEXT, 4, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate ticket numbers
CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_ticket_number_trigger
  BEFORE INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_number();

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_support_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_support_tickets_updated_at_trigger
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_support_tickets_updated_at();

CREATE TRIGGER update_support_ticket_comments_updated_at_trigger
  BEFORE UPDATE ON support_ticket_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_support_tickets_updated_at();

-- Function to auto-set organization_id from user
CREATE OR REPLACE FUNCTION set_ticket_organization()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM organization_members
    WHERE user_id = NEW.user_id
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_ticket_organization_trigger
  BEFORE INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_organization();

-- ============================================================================
-- 6. COMMENTS
-- ============================================================================
COMMENT ON TABLE support_tickets IS 'Customer support tickets created by users or AI chatbot';
COMMENT ON TABLE support_ticket_comments IS 'Comments and replies on support tickets';
COMMENT ON COLUMN support_tickets.ticket_number IS 'Auto-generated unique ticket number (TKT-YYYYMMDD-0001)';
COMMENT ON COLUMN support_tickets.created_by_chatbot IS 'True if ticket was created by AI chatbot';
COMMENT ON COLUMN support_tickets.chatbot_conversation_id IS 'Reference to chatbot conversation that created this ticket';
COMMENT ON COLUMN support_ticket_comments.is_internal IS 'Internal notes not visible to customers';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Tables created: support_tickets, support_ticket_comments
-- Indexes created: 11 indexes for performance
-- RLS policies: Comprehensive security for multi-tenant support system
-- Triggers: Auto-generate ticket numbers, auto-update timestamps, auto-set organization
-- Functions: Ticket number generation, timestamp updates, organization assignment
-- ============================================================================

