-- Migration: Extend documents table for Phase 5 Document Processing
-- Description: Add AI extraction, embeddings, and semantic search capabilities
-- Date: November 8, 2025

-- ============================================================================
-- 1. ADD NEW COLUMNS TO DOCUMENTS TABLE
-- ============================================================================

-- AI Extraction columns
ALTER TABLE documents 
  ADD COLUMN IF NOT EXISTS extraction_status TEXT DEFAULT 'pending' CHECK (extraction_status IN (
    'pending',
    'processing',
    'completed',
    'failed'
  )),
  ADD COLUMN IF NOT EXISTS extraction_confidence DECIMAL(3,2), -- 0.00 to 1.00
  ADD COLUMN IF NOT EXISTS extraction_error TEXT,
  ADD COLUMN IF NOT EXISTS extracted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS extracted_text TEXT, -- Full text extracted from document
  ADD COLUMN IF NOT EXISTS extracted_data JSONB DEFAULT '{}'; -- Structured data extracted

-- Semantic Search columns
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS content_embedding vector(768), -- Gemini text-embedding-004 (768 dimensions)
  ADD COLUMN IF NOT EXISTS embedding_generated_at TIMESTAMPTZ;

-- Document Classification
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS ai_classified_type TEXT, -- AI-detected document type
  ADD COLUMN IF NOT EXISTS classification_confidence DECIMAL(3,2); -- 0.00 to 1.00

-- Add more document types
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_document_type_check;
ALTER TABLE documents ADD CONSTRAINT documents_document_type_check 
  CHECK (document_type IN (
    'contract', 
    'quote', 
    'invoice', 
    'proposal', 
    'presentation', 
    'specification', 
    'certificate', 
    'purchase_order',
    'packing_slip',
    'receipt',
    'agreement',
    'report',
    'other'
  ));

-- ============================================================================
-- 2. CREATE INDEXES
-- ============================================================================

-- Index for extraction status
CREATE INDEX IF NOT EXISTS idx_documents_extraction_status ON documents(extraction_status);

-- Index for AI classified type
CREATE INDEX IF NOT EXISTS idx_documents_ai_classified_type ON documents(ai_classified_type);

-- Vector index for semantic search (using HNSW for better performance)
CREATE INDEX IF NOT EXISTS idx_documents_content_embedding 
  ON documents USING hnsw (content_embedding vector_cosine_ops);

-- Full-text search index on extracted text
CREATE INDEX IF NOT EXISTS idx_documents_extracted_text_fts 
  ON documents USING gin(to_tsvector('english', extracted_text));

-- ============================================================================
-- 3. CREATE DOCUMENT LINKS TABLE
-- ============================================================================
-- Track relationships between documents and other entities

CREATE TABLE IF NOT EXISTS document_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Document reference
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  -- Linked entity (polymorphic)
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'customer',
    'order',
    'vendor',
    'vendor_invoice',
    'purchase_order',
    'product',
    'contact',
    'organization'
  )),
  entity_id UUID NOT NULL,
  
  -- Link metadata
  link_type TEXT, -- e.g., 'attachment', 'reference', 'related'
  notes TEXT,
  
  -- Timestamps
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_document_links_document ON document_links(document_id);
CREATE INDEX idx_document_links_entity ON document_links(entity_type, entity_id);
CREATE INDEX idx_document_links_created_by ON document_links(created_by);

-- ============================================================================
-- 4. RLS POLICIES FOR DOCUMENT_LINKS
-- ============================================================================

ALTER TABLE document_links ENABLE ROW LEVEL SECURITY;

-- Admins can view all document links
CREATE POLICY "Admins can view all document links"
  ON document_links FOR SELECT
  TO authenticated
  USING (is_admin());

-- Admins can insert document links
CREATE POLICY "Admins can insert document links"
  ON document_links FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Admins can update document links
CREATE POLICY "Admins can update document links"
  ON document_links FOR UPDATE
  TO authenticated
  USING (is_admin());

-- Admins can delete document links
CREATE POLICY "Admins can delete document links"
  ON document_links FOR DELETE
  TO authenticated
  USING (is_admin());

-- ============================================================================
-- 5. HELPER FUNCTIONS
-- ============================================================================

-- Function to search documents by semantic similarity
CREATE OR REPLACE FUNCTION search_documents_by_embedding(
  query_embedding vector(768),
  match_threshold DECIMAL DEFAULT 0.7,
  match_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  document_type TEXT,
  extracted_text TEXT,
  similarity DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.name,
    d.document_type,
    d.extracted_text,
    (1 - (d.content_embedding <=> query_embedding))::DECIMAL as similarity
  FROM documents d
  WHERE d.content_embedding IS NOT NULL
    AND (1 - (d.content_embedding <=> query_embedding)) > match_threshold
  ORDER BY d.content_embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION search_documents_by_embedding TO authenticated;

-- Function to get documents linked to an entity
CREATE OR REPLACE FUNCTION get_linked_documents(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  document_type TEXT,
  file_path TEXT,
  mime_type TEXT,
  file_size BIGINT,
  link_type TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.name,
    d.document_type,
    d.file_path,
    d.mime_type,
    d.file_size,
    dl.link_type,
    d.created_at
  FROM documents d
  INNER JOIN document_links dl ON dl.document_id = d.id
  WHERE dl.entity_type = p_entity_type
    AND dl.entity_id = p_entity_id
  ORDER BY d.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_linked_documents TO authenticated;

-- ============================================================================
-- 6. UPDATED_AT TRIGGER FOR DOCUMENT_LINKS
-- ============================================================================

-- Reuse existing update_updated_at_column function if it exists
-- Otherwise it was created in previous migration

-- ============================================================================
-- 7. COMMENTS
-- ============================================================================

COMMENT ON COLUMN documents.extraction_status IS 'Status of AI text extraction from document';
COMMENT ON COLUMN documents.extracted_text IS 'Full text content extracted from document by AI';
COMMENT ON COLUMN documents.extracted_data IS 'Structured data extracted from document (JSON)';
COMMENT ON COLUMN documents.content_embedding IS 'Gemini text-embedding-004 vector (768 dimensions) for semantic search';
COMMENT ON COLUMN documents.ai_classified_type IS 'Document type detected by AI (may differ from user-specified type)';

COMMENT ON TABLE document_links IS 'Links between documents and other entities (customers, orders, vendors, etc.)';
COMMENT ON FUNCTION search_documents_by_embedding IS 'Semantic search for documents using embedding similarity';
COMMENT ON FUNCTION get_linked_documents IS 'Get all documents linked to a specific entity';

