-- Migration: Create recommendation helper functions
-- Description: Functions to calculate product recommendations based on order history

-- Function to get products also bought together
CREATE OR REPLACE FUNCTION get_also_bought_products(
  p_product_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  recommended_product_id UUID,
  times_bought INTEGER,
  score DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_feature_enabled('smart_recommendations') THEN
    RETURN QUERY
    SELECT NULL::UUID, 0::INTEGER, 0::DECIMAL
    LIMIT 0;
  END IF;

  RETURN QUERY
  WITH product_orders AS (
    -- Get all orders that contain the target product
    SELECT DISTINCT oi1.order_id
    FROM order_items oi1
    WHERE oi1.product_id = p_product_id
  ),
  also_bought AS (
    -- Get other products in those same orders
    SELECT 
      oi2.product_id,
      COUNT(*) as times_bought
    FROM order_items oi2
    WHERE oi2.order_id IN (SELECT order_id FROM product_orders)
      AND oi2.product_id != p_product_id
    GROUP BY oi2.product_id
  )
  SELECT 
    ab.product_id,
    ab.times_bought::INTEGER,
    LEAST(ab.times_bought::DECIMAL / 100, 1.0) as score
  FROM also_bought ab
  JOIN products p ON p.id = ab.product_id
  WHERE p.is_active = true
  ORDER BY ab.times_bought DESC
  LIMIT p_limit;
END;
$$;

-- Function to get personalized recommendations based on browsing history
CREATE OR REPLACE FUNCTION get_personalized_product_recommendations(
  p_customer_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  product_sku TEXT,
  product_price DECIMAL,
  affinity_score DECIMAL,
  recommendation_reason TEXT
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
  WITH customer_categories AS (
    -- Get categories customer has interacted with
    SELECT 
      p.category,
      SUM(cpa.affinity_score) as category_affinity
    FROM customer_product_affinities cpa
    JOIN products p ON p.id = cpa.product_id
    WHERE cpa.customer_id = p_customer_id
      AND p.category IS NOT NULL
    GROUP BY p.category
  ),
  recommended_products AS (
    -- Get products from preferred categories that customer hasn't interacted with much
    SELECT 
      p.id,
      p.name,
      p.sku,
      p.base_price,
      COALESCE(cpa.affinity_score, 0) + (cc.category_affinity * 0.3) as score,
      CASE 
        WHEN cpa.purchase_count > 0 THEN 'Previously purchased'
        WHEN cpa.cart_add_count > 0 THEN 'Previously added to cart'
        WHEN cpa.view_count > 0 THEN 'Previously viewed'
        ELSE 'Based on your interests in ' || p.category
      END as reason
    FROM products p
    JOIN customer_categories cc ON cc.category = p.category
    LEFT JOIN customer_product_affinities cpa ON cpa.product_id = p.id AND cpa.customer_id = p_customer_id
    WHERE p.is_active = true
      AND (cpa.affinity_score IS NULL OR cpa.affinity_score < 0.8)
    ORDER BY score DESC
    LIMIT p_limit
  )
  SELECT 
    rp.id,
    rp.name,
    rp.sku,
    rp.base_price,
    rp.score,
    rp.reason
  FROM recommended_products rp;
END;
$$;

-- Function to calculate recommendation score between two products
CREATE OR REPLACE FUNCTION calculate_product_similarity(
  p_product_id_1 UUID,
  p_product_id_2 UUID
)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  similarity_score DECIMAL := 0;
  p1_category TEXT;
  p2_category TEXT;
  p1_price DECIMAL;
  p2_price DECIMAL;
  price_diff DECIMAL;
BEGIN
  -- Get product details
  SELECT category, base_price INTO p1_category, p1_price
  FROM products WHERE id = p_product_id_1;
  
  SELECT category, base_price INTO p2_category, p2_price
  FROM products WHERE id = p_product_id_2;
  
  -- Same category adds 0.5 to score
  IF p1_category = p2_category THEN
    similarity_score := similarity_score + 0.5;
  END IF;
  
  -- Similar price range adds up to 0.3 to score
  IF p1_price > 0 AND p2_price > 0 THEN
    price_diff := ABS(p1_price - p2_price) / GREATEST(p1_price, p2_price);
    similarity_score := similarity_score + (0.3 * (1 - LEAST(price_diff, 1)));
  END IF;
  
  -- Check if bought together (adds up to 0.2)
  DECLARE
    times_together INTEGER;
  BEGIN
    SELECT COUNT(*) INTO times_together
    FROM order_items oi1
    JOIN order_items oi2 ON oi1.order_id = oi2.order_id
    WHERE oi1.product_id = p_product_id_1
      AND oi2.product_id = p_product_id_2;
    
    IF times_together > 0 THEN
      similarity_score := similarity_score + LEAST(times_together::DECIMAL / 50, 0.2);
    END IF;
  END;
  
  RETURN LEAST(similarity_score, 1.0);
END;
$$;

-- Function to update recommendation scores periodically
CREATE OR REPLACE FUNCTION refresh_product_recommendations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER := 0;
  product_record RECORD;
BEGIN
  IF NOT is_feature_enabled('smart_recommendations') THEN
    RETURN 0;
  END IF;

  -- Loop through all active products
  FOR product_record IN 
    SELECT id FROM products WHERE is_active = true
  LOOP
    -- Generate also_bought recommendations
    INSERT INTO product_recommendations (
      product_id,
      recommended_product_id,
      recommendation_type,
      score,
      reason,
      updated_at
    )
    SELECT 
      product_record.id,
      ab.recommended_product_id,
      'also_bought',
      ab.score,
      'Bought together ' || ab.times_bought || ' times',
      NOW()
    FROM get_also_bought_products(product_record.id, 5) ab
    ON CONFLICT (product_id, recommended_product_id, recommendation_type)
    DO UPDATE SET
      score = EXCLUDED.score,
      reason = EXCLUDED.reason,
      updated_at = EXCLUDED.updated_at;
    
    updated_count := updated_count + 1;
  END LOOP;

  RETURN updated_count;
END;
$$;

COMMENT ON FUNCTION get_also_bought_products IS 'Get products frequently bought together with target product';
COMMENT ON FUNCTION get_personalized_product_recommendations IS 'Get personalized recommendations for customer';
COMMENT ON FUNCTION calculate_product_similarity IS 'Calculate similarity score between two products';
COMMENT ON FUNCTION refresh_product_recommendations IS 'Refresh recommendation scores for all products';
