-- Create function to get customer stats efficiently
-- This avoids N+1 queries by aggregating all customer order stats in one query

CREATE OR REPLACE FUNCTION get_customer_stats()
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  type TEXT,
  phone TEXT,
  website TEXT,
  created_at TIMESTAMPTZ,
  total_orders BIGINT,
  total_spent NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.name,
    o.slug,
    o.type::TEXT,
    o.phone,
    o.website,
    o.created_at,
    COALESCE(COUNT(ord.id), 0) AS total_orders,
    COALESCE(SUM(ord.total), 0) AS total_spent
  FROM organizations o
  LEFT JOIN orders ord ON ord.organization_id = o.id
    AND ord.status != 'cancelled'
  GROUP BY o.id, o.name, o.slug, o.type, o.phone, o.website, o.created_at
  ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_customer_stats() TO authenticated;

COMMENT ON FUNCTION get_customer_stats() IS 'Get all customers with their order statistics in a single optimized query';
