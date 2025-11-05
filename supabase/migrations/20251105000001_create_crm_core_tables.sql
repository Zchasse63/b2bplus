-- =============================================
-- CRM Core Tables Migration
-- Created: 2025-11-05
-- Purpose: Add contacts, tasks, activities, and documents tables for CRM functionality
-- =============================================

-- =============================================
-- 1. CONTACTS TABLE
-- =============================================
-- Multiple contacts per organization (Decision Makers, Influencers, Users)
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Contact Information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  title TEXT, -- Job title (e.g., "Purchasing Manager", "Chef")
  department TEXT, -- Department (e.g., "Purchasing", "Kitchen")
  
  -- Contact Role & Status
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('decision_maker', 'influencer', 'user', 'other')),
  is_primary BOOLEAN DEFAULT false, -- Primary contact for organization
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  
  -- Communication Preferences
  preferred_contact_method TEXT CHECK (preferred_contact_method IN ('email', 'phone', 'mobile', 'none')),
  email_opt_in BOOLEAN DEFAULT true,
  sms_opt_in BOOLEAN DEFAULT false,
  
  -- Additional Info
  notes TEXT,
  tags TEXT[], -- Array of tags for categorization
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Indexes for contacts
CREATE INDEX idx_contacts_organization_id ON public.contacts(organization_id);
CREATE INDEX idx_contacts_email ON public.contacts(email) WHERE email IS NOT NULL;
CREATE INDEX idx_contacts_role ON public.contacts(role);
CREATE INDEX idx_contacts_status ON public.contacts(status);
CREATE INDEX idx_contacts_is_primary ON public.contacts(is_primary) WHERE is_primary = true;

-- RLS Policies for contacts
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Admin users can view all contacts
CREATE POLICY "Admin users can view all contacts"
  ON public.contacts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Admin users can insert contacts
CREATE POLICY "Admin users can insert contacts"
  ON public.contacts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Admin users can update contacts
CREATE POLICY "Admin users can update contacts"
  ON public.contacts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Admin users can delete contacts
CREATE POLICY "Admin users can delete contacts"
  ON public.contacts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- =============================================
-- 2. TASKS TABLE
-- =============================================
-- Task management system for sales and account management
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Task Details
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'general' CHECK (task_type IN ('call', 'email', 'meeting', 'follow_up', 'demo', 'quote', 'general', 'other')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'deferred')),
  
  -- Relationships
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Scheduling
  due_date TIMESTAMP WITH TIME ZONE,
  reminder_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Additional Info
  notes TEXT,
  tags TEXT[], -- Array of tags for categorization
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Indexes for tasks
CREATE INDEX idx_tasks_organization_id ON public.tasks(organization_id);
CREATE INDEX idx_tasks_contact_id ON public.tasks(contact_id);
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_priority ON public.tasks(priority);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_tasks_task_type ON public.tasks(task_type);

-- RLS Policies for tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Admin users can view all tasks
CREATE POLICY "Admin users can view all tasks"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Users can view tasks assigned to them
CREATE POLICY "Users can view their assigned tasks"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (assigned_to = auth.uid());

-- Admin users can insert tasks
CREATE POLICY "Admin users can insert tasks"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Admin users can update tasks
CREATE POLICY "Admin users can update tasks"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Users can update tasks assigned to them
CREATE POLICY "Users can update their assigned tasks"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (assigned_to = auth.uid());

-- Admin users can delete tasks
CREATE POLICY "Admin users can delete tasks"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- =============================================
-- 3. ACTIVITIES TABLE
-- =============================================
-- Unified activity log for all customer interactions
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Activity Details
  activity_type TEXT NOT NULL CHECK (activity_type IN ('call', 'email', 'meeting', 'note', 'order', 'quote', 'sample_request', 'task_completed', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  
  -- Relationships
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  
  -- Activity Metadata
  activity_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  duration_minutes INTEGER, -- For calls, meetings
  outcome TEXT, -- Result of the activity (e.g., "Successful", "No Answer", "Follow-up Required")
  
  -- Additional Info
  notes TEXT,
  tags TEXT[], -- Array of tags for categorization
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Indexes for activities
CREATE INDEX idx_activities_organization_id ON public.activities(organization_id);
CREATE INDEX idx_activities_contact_id ON public.activities(contact_id);
CREATE INDEX idx_activities_task_id ON public.activities(task_id);
CREATE INDEX idx_activities_order_id ON public.activities(order_id);
CREATE INDEX idx_activities_activity_type ON public.activities(activity_type);
CREATE INDEX idx_activities_activity_date ON public.activities(activity_date DESC);
CREATE INDEX idx_activities_created_by ON public.activities(created_by);

-- RLS Policies for activities
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Admin users can view all activities
CREATE POLICY "Admin users can view all activities"
  ON public.activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Admin users can insert activities
CREATE POLICY "Admin users can insert activities"
  ON public.activities FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Admin users can update activities
CREATE POLICY "Admin users can update activities"
  ON public.activities FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Admin users can delete activities
CREATE POLICY "Admin users can delete activities"
  ON public.activities FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- =============================================
-- 4. DOCUMENTS TABLE
-- =============================================
-- File attachments for contracts, quotes, invoices, and other documents
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Document Details
  name TEXT NOT NULL,
  description TEXT,
  document_type TEXT NOT NULL CHECK (document_type IN ('contract', 'quote', 'invoice', 'proposal', 'presentation', 'specification', 'certificate', 'other')),
  file_path TEXT NOT NULL, -- Path in Supabase Storage
  file_size BIGINT, -- File size in bytes
  mime_type TEXT, -- MIME type (e.g., 'application/pdf', 'image/png')

  -- Relationships
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,

  -- Version Control
  version INTEGER DEFAULT 1,
  parent_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL, -- For versioning
  is_latest_version BOOLEAN DEFAULT true,

  -- Access Control
  is_public BOOLEAN DEFAULT false, -- If true, customer can view
  shared_with UUID[], -- Array of user IDs who have access

  -- Additional Info
  tags TEXT[], -- Array of tags for categorization
  notes TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Indexes for documents
CREATE INDEX idx_documents_organization_id ON public.documents(organization_id);
CREATE INDEX idx_documents_contact_id ON public.documents(contact_id);
CREATE INDEX idx_documents_order_id ON public.documents(order_id);
CREATE INDEX idx_documents_document_type ON public.documents(document_type);
CREATE INDEX idx_documents_parent_document_id ON public.documents(parent_document_id);
CREATE INDEX idx_documents_is_latest_version ON public.documents(is_latest_version) WHERE is_latest_version = true;
CREATE INDEX idx_documents_created_by ON public.documents(created_by);

-- RLS Policies for documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Admin users can view all documents
CREATE POLICY "Admin users can view all documents"
  ON public.documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Customers can view public documents for their organization
CREATE POLICY "Customers can view public documents"
  ON public.documents FOR SELECT
  TO authenticated
  USING (
    is_public = true
    AND organization_id IN (
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid()
    )
  );

-- Users can view documents shared with them
CREATE POLICY "Users can view shared documents"
  ON public.documents FOR SELECT
  TO authenticated
  USING (auth.uid() = ANY(shared_with));

-- Admin users can insert documents
CREATE POLICY "Admin users can insert documents"
  ON public.documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Admin users can update documents
CREATE POLICY "Admin users can update documents"
  ON public.documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Admin users can delete documents
CREATE POLICY "Admin users can delete documents"
  ON public.documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- =============================================
-- 5. TRIGGERS FOR UPDATED_AT
-- =============================================
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for contacts
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Triggers for tasks
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Triggers for activities
CREATE TRIGGER update_activities_updated_at
  BEFORE UPDATE ON public.activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Triggers for documents
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 6. HELPER FUNCTIONS
-- =============================================

-- Function to get primary contact for an organization
CREATE OR REPLACE FUNCTION public.get_primary_contact(org_id UUID)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  title TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.first_name,
    c.last_name,
    c.email,
    c.phone,
    c.title
  FROM public.contacts c
  WHERE c.organization_id = org_id
    AND c.is_primary = true
    AND c.status = 'active'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recent activities for an organization
CREATE OR REPLACE FUNCTION public.get_recent_activities(org_id UUID, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  activity_type TEXT,
  title TEXT,
  description TEXT,
  activity_date TIMESTAMP WITH TIME ZONE,
  contact_name TEXT,
  created_by_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.activity_type,
    a.title,
    a.description,
    a.activity_date,
    CONCAT(c.first_name, ' ', c.last_name) AS contact_name,
    p.full_name AS created_by_name
  FROM public.activities a
  LEFT JOIN public.contacts c ON a.contact_id = c.id
  LEFT JOIN public.profiles p ON a.created_by = p.id
  WHERE a.organization_id = org_id
  ORDER BY a.activity_date DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get open tasks for an organization
CREATE OR REPLACE FUNCTION public.get_open_tasks(org_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  task_type TEXT,
  priority TEXT,
  status TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  assigned_to_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.title,
    t.task_type,
    t.priority,
    t.status,
    t.due_date,
    p.full_name AS assigned_to_name
  FROM public.tasks t
  LEFT JOIN public.profiles p ON t.assigned_to = p.id
  WHERE t.organization_id = org_id
    AND t.status IN ('pending', 'in_progress')
  ORDER BY
    CASE t.priority
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
    END,
    t.due_date ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
-- Tables created: contacts, tasks, activities, documents
-- Indexes created: 25+ indexes for performance
-- RLS policies: Comprehensive security policies for all tables
-- Triggers: Auto-update updated_at timestamps
-- Helper functions: 3 functions for common queries
-- =============================================

