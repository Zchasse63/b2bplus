-- Migration: Fix embedding dimensions for Gemini text-embedding-004
-- Description: Change product_embeddings table to use 768-dimensional vectors (Gemini) instead of 1536 (OpenAI)

-- Drop the old index that depends on the embedding column
DROP INDEX IF EXISTS idx_product_embeddings_embedding;

-- Recreate the product_embeddings table with correct dimensions
-- First, backup existing data if any
CREATE TABLE IF NOT EXISTS product_embeddings_backup AS
SELECT * FROM product_embeddings WHERE FALSE;

-- Drop the old table
DROP TABLE IF EXISTS product_embeddings CASCADE;

-- Create the new table with correct 768-dimensional embeddings
CREATE TABLE product_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE UNIQUE,
  embedding vector(768),  -- Gemini text-embedding-004 produces 768-dimensional vectors
  embedding_model TEXT DEFAULT 'text-embedding-004',
  content_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_product_embeddings_product_id ON product_embeddings(product_id);
CREATE INDEX idx_product_embeddings_embedding ON product_embeddings USING ivfflat(embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_product_embeddings_created_at ON product_embeddings(created_at DESC);

-- Enable RLS
ALTER TABLE product_embeddings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "product_embeddings_select_all" ON product_embeddings
  FOR SELECT USING (true);

CREATE POLICY "product_embeddings_insert_admin" ON product_embeddings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "product_embeddings_update_admin" ON product_embeddings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "product_embeddings_delete_admin" ON product_embeddings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

