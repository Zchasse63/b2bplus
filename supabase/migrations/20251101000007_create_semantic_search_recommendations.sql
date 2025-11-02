-- Migration: Create semantic search and recommendations system
-- Description: OpenAI embeddings for semantic search and AI-driven product recommendations

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Product embeddings for semantic search
CREATE TABLE IF NOT EXISTS product_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE UNIQUE,
  embedding vector(1536),
  embedding_model TEXT DEFAULT 'text-embedding-3-small',
  content_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product recommendations
CREATE TABLE IF NOT EXISTS product_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  recommended_product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  recommendation_type TEXT CHECK (recommendation_type IN ('also_bought', 'frequently_together', 'similar', 'ai_suggested')),
  score DECIMAL(5,4) CHECK (score >= 0 AND score <= 1),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, recommended_product_id, recommendation_type)
);

-- Search queries log (for analytics and improvement)
CREATE TABLE IF NOT EXISTS search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  query_text TEXT NOT NULL,
  query_type TEXT CHECK (query_type IN ('keyword', 'semantic', 'hybrid')),
  results_count INTEGER,
  clicked_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  clicked_position INTEGER,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer product affinities (for personalized recommendations)
CREATE TABLE IF NOT EXISTS customer_product_affinities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  affinity_score DECIMAL(5,4) CHECK (affinity_score >= 0 AND affinity_score <= 1),
  view_count INTEGER DEFAULT 0,
  cart_add_count INTEGER DEFAULT 0,
  purchase_count INTEGER DEFAULT 0,
  last_interaction_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(customer_id, product_id)
);

-- Indexes for performance
CREATE INDEX idx_product_embeddings_product ON product_embeddings(product_id);
CREATE INDEX idx_product_embeddings_vector ON product_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_product_recommendations_product ON product_recommendations(product_id);
CREATE INDEX idx_product_recommendations_recommended ON product_recommendations(recommended_product_id);
CREATE INDEX idx_product_recommendations_type ON product_recommendations(recommendation_type);
CREATE INDEX idx_product_recommendations_score ON product_recommendations(score DESC);

CREATE INDEX idx_search_queries_user ON search_queries(user_id);
CREATE INDEX idx_search_queries_created ON search_queries(created_at DESC);
CREATE INDEX idx_search_queries_type ON search_queries(query_type);

CREATE INDEX idx_customer_affinities_customer ON customer_product_affinities(customer_id);
CREATE INDEX idx_customer_affinities_product ON customer_product_affinities(product_id);
CREATE INDEX idx_customer_affinities_score ON customer_product_affinities(affinity_score DESC);

-- Enable RLS
ALTER TABLE product_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_product_affinities ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Product embeddings: Everyone can view, admins can manage
CREATE POLICY "Anyone can view product embeddings"
  ON product_embeddings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage product embeddings"
  ON product_embeddings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'super_admin')
    )
  );

-- Product recommendations: Everyone can view
CREATE POLICY "Anyone can view product recommendations"
  ON product_recommendations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage product recommendations"
  ON product_recommendations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'super_admin')
    )
  );

-- Search queries: Users can view their own, admins can view all
CREATE POLICY "Users can view own search queries"
  ON search_queries FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all search queries"
  ON search_queries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Anyone can insert search queries"
  ON search_queries FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Customer affinities: Users can view their own, admins can view all
CREATE POLICY "Users can view own affinities"
  ON customer_product_affinities FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Admins can view all affinities"
  ON customer_product_affinities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "System can manage affinities"
  ON customer_product_affinities FOR ALL
  TO authenticated
  WITH CHECK (true);

-- Function to search products by semantic similarity
CREATE OR REPLACE FUNCTION semantic_search_products(
  query_embedding vector(1536),
  match_threshold DECIMAL DEFAULT 0.7,
  match_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  product_id UUID,
  name TEXT,
  description TEXT,
  similarity DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_feature_enabled('semantic_search') THEN
    RETURN QUERY
    SELECT p.id, p.name, p.description, 0::DECIMAL
    FROM products p
    LIMIT 0;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.description,
    ROUND((1 - (pe.embedding <=> query_embedding))::NUMERIC, 4) AS similarity
  FROM product_embeddings pe
  JOIN products p ON p.id = pe.product_id
  WHERE 1 - (pe.embedding <=> query_embedding) > match_threshold
    AND p.is_active = true
  ORDER BY pe.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to get product recommendations
CREATE OR REPLACE FUNCTION get_product_recommendations(
  p_product_id UUID,
  p_recommendation_type TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  recommended_product_id UUID,
  product_name TEXT,
  product_sku TEXT,
  product_price DECIMAL,
  recommendation_type TEXT,
  score DECIMAL,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_feature_enabled('smart_recommendations') THEN
    RETURN QUERY
    SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::DECIMAL, NULL::TEXT, NULL::DECIMAL, NULL::TEXT
    LIMIT 0;
  END IF;

  RETURN QUERY
  SELECT
    pr.recommended_product_id,
    p.name,
    p.sku,
    p.base_price,
    pr.recommendation_type,
    pr.score,
    pr.reason
  FROM product_recommendations pr
  JOIN products p ON p.id = pr.recommended_product_id
  WHERE pr.product_id = p_product_id
    AND (p_recommendation_type IS NULL OR pr.recommendation_type = p_recommendation_type)
    AND p.is_active = true
  ORDER BY pr.score DESC
  LIMIT p_limit;
END;
$$;

-- Function to get personalized recommendations for customer
CREATE OR REPLACE FUNCTION get_personalized_recommendations(
  p_customer_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  product_sku TEXT,
  product_price DECIMAL,
  affinity_score DECIMAL,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_feature_enabled('smart_recommendations') THEN
    RETURN QUERY
    SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::DECIMAL, NULL::DECIMAL, NULL::TEXT
    LIMIT 0;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.sku,
    p.base_price,
    cpa.affinity_score,
    'Based on your browsing and purchase history' AS reason
  FROM customer_product_affinities cpa
  JOIN products p ON p.id = cpa.product_id
  WHERE cpa.customer_id = p_customer_id
    AND p.is_active = true
  ORDER BY cpa.affinity_score DESC, cpa.last_interaction_at DESC
  LIMIT p_limit;
END;
$$;

-- Function to update customer affinity score
CREATE OR REPLACE FUNCTION update_customer_affinity(
  p_customer_id UUID,
  p_product_id UUID,
  p_interaction_type TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affinity_increment DECIMAL;
BEGIN
  IF NOT is_feature_enabled('smart_recommendations') THEN
    RETURN;
  END IF;

  -- Calculate affinity increment based on interaction type
  affinity_increment := CASE p_interaction_type
    WHEN 'view' THEN 0.01
    WHEN 'cart_add' THEN 0.05
    WHEN 'purchase' THEN 0.10
    ELSE 0
  END;

  -- Insert or update affinity
  INSERT INTO customer_product_affinities (
    customer_id,
    product_id,
    affinity_score,
    view_count,
    cart_add_count,
    purchase_count,
    last_interaction_at
  ) VALUES (
    p_customer_id,
    p_product_id,
    affinity_increment,
    CASE WHEN p_interaction_type = 'view' THEN 1 ELSE 0 END,
    CASE WHEN p_interaction_type = 'cart_add' THEN 1 ELSE 0 END,
    CASE WHEN p_interaction_type = 'purchase' THEN 1 ELSE 0 END,
    NOW()
  )
  ON CONFLICT (customer_id, product_id) DO UPDATE SET
    affinity_score = LEAST(customer_product_affinities.affinity_score + affinity_increment, 1.0),
    view_count = customer_product_affinities.view_count + CASE WHEN p_interaction_type = 'view' THEN 1 ELSE 0 END,
    cart_add_count = customer_product_affinities.cart_add_count + CASE WHEN p_interaction_type = 'cart_add' THEN 1 ELSE 0 END,
    purchase_count = customer_product_affinities.purchase_count + CASE WHEN p_interaction_type = 'purchase' THEN 1 ELSE 0 END,
    last_interaction_at = NOW(),
    updated_at = NOW();
END;
$$;

-- Trigger to update product embeddings timestamp
CREATE OR REPLACE FUNCTION update_embedding_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_embedding_timestamp
  BEFORE UPDATE ON product_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_embedding_timestamp();

COMMENT ON TABLE product_embeddings IS 'OpenAI embeddings for semantic product search';
COMMENT ON TABLE product_recommendations IS 'AI-driven product recommendations';
COMMENT ON TABLE search_queries IS 'Search query log for analytics';
COMMENT ON TABLE customer_product_affinities IS 'Customer product affinity scores for personalization';
COMMENT ON FUNCTION semantic_search_products IS 'Search products using vector similarity';
COMMENT ON FUNCTION get_product_recommendations IS 'Get AI-driven product recommendations';
COMMENT ON FUNCTION get_personalized_recommendations IS 'Get personalized recommendations for customer';
COMMENT ON FUNCTION update_customer_affinity IS 'Update customer affinity score based on interactions';
