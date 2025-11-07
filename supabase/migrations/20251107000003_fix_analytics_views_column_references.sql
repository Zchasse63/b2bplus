-- Migration: Fix analytics views column reference errors
-- Description: Correct column names to match actual table schemas
-- FIXES:
--   - orders.customer_id → orders.user_id
--   - orders.total_amount → orders.total
--   - products.price → products.base_price

-- Drop and recreate all analytics views with correct column references

-- Sales Analytics View
DROP VIEW IF EXISTS sales_analytics CASCADE;
CREATE OR REPLACE VIEW sales_analytics AS
SELECT
  DATE_TRUNC('day', o.created_at) as date,
  COUNT(DISTINCT o.id) as order_count,
  COUNT(DISTINCT o.user_id) as unique_customers,  -- FIX: customer_id → user_id
  SUM(o.total) as revenue,  -- FIX: total_amount → total
  AVG(o.total) as avg_order_value,  -- FIX: total_amount → total
  SUM(oi.quantity) as total_items_sold
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
WHERE o.status != 'cancelled'
GROUP BY DATE_TRUNC('day', o.created_at)
ORDER BY date DESC;

-- Top Products View
DROP VIEW IF EXISTS top_products CASCADE;
CREATE OR REPLACE VIEW top_products AS
SELECT
  p.id,
  p.sku,
  p.name,
  p.category,
  p.base_price,  -- FIX: price → base_price
  COUNT(DISTINCT oi.order_id) as order_count,
  SUM(oi.quantity) as total_quantity_sold,
  SUM(oi.quantity * oi.unit_price) as total_revenue
FROM products p
LEFT JOIN order_items oi ON oi.product_id = p.id
LEFT JOIN orders o ON o.id = oi.order_id
WHERE o.status != 'cancelled' OR o.status IS NULL
GROUP BY p.id, p.sku, p.name, p.category, p.base_price  -- FIX: price → base_price
ORDER BY total_revenue DESC NULLS LAST;

-- Top Customers View
DROP VIEW IF EXISTS top_customers CASCADE;
CREATE OR REPLACE VIEW top_customers AS
SELECT
  u.id,
  u.email,
  p.full_name,
  p.company_name,
  COUNT(DISTINCT o.id) as order_count,
  SUM(o.total) as total_spent,  -- FIX: total_amount → total
  AVG(o.total) as avg_order_value,  -- FIX: total_amount → total
  MAX(o.created_at) as last_order_date,
  MIN(o.created_at) as first_order_date
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN orders o ON o.user_id = u.id  -- FIX: customer_id → user_id
WHERE o.status != 'cancelled' OR o.status IS NULL
GROUP BY u.id, u.email, p.full_name, p.company_name
ORDER BY total_spent DESC NULLS LAST;

-- Category Performance View
DROP VIEW IF EXISTS category_performance CASCADE;
CREATE OR REPLACE VIEW category_performance AS
SELECT
  p.category,
  COUNT(DISTINCT p.id) as product_count,
  COUNT(DISTINCT oi.order_id) as order_count,
  SUM(oi.quantity) as total_quantity_sold,
  SUM(oi.quantity * oi.unit_price) as total_revenue,
  AVG(oi.unit_price) as avg_price
FROM products p
LEFT JOIN order_items oi ON oi.product_id = p.id
LEFT JOIN orders o ON o.id = oi.order_id
WHERE (o.status != 'cancelled' OR o.status IS NULL) AND p.category IS NOT NULL
GROUP BY p.category
ORDER BY total_revenue DESC NULLS LAST;

-- Order Status Distribution
DROP VIEW IF EXISTS order_status_distribution CASCADE;
CREATE OR REPLACE VIEW order_status_distribution AS
SELECT
  status,
  COUNT(*) as count,
  SUM(total) as total_amount  -- FIX: Keep column name as total_amount for consistency with API
FROM orders
GROUP BY status
ORDER BY count DESC;

-- Revenue Trends Function (Last N Days)
DROP FUNCTION IF EXISTS get_revenue_trends(INT);
CREATE OR REPLACE FUNCTION get_revenue_trends(days_back INT DEFAULT 30)
RETURNS TABLE (
  date DATE,
  revenue DECIMAL,
  order_count BIGINT,
  avg_order_value DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE_TRUNC('day', o.created_at)::DATE as date,
    SUM(o.total) as revenue,  -- FIX: total_amount → total
    COUNT(o.id) as order_count,
    AVG(o.total) as avg_order_value  -- FIX: total_amount → total
  FROM orders o
  WHERE o.created_at >= NOW() - (days_back || ' days')::INTERVAL
    AND o.status != 'cancelled'
  GROUP BY DATE_TRUNC('day', o.created_at)::DATE
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;

-- Customer Lifetime Value Function
DROP FUNCTION IF EXISTS get_customer_ltv(UUID);
CREATE OR REPLACE FUNCTION get_customer_ltv(customer_id_param UUID)
RETURNS DECIMAL AS $$
DECLARE
  ltv DECIMAL;
BEGIN
  SELECT COALESCE(SUM(total), 0)  -- FIX: total_amount → total
  INTO ltv
  FROM orders
  WHERE user_id = customer_id_param  -- FIX: customer_id → user_id
    AND status != 'cancelled';

  RETURN ltv;
END;
$$ LANGUAGE plpgsql;

-- Product Performance Metrics Function
DROP FUNCTION IF EXISTS get_product_metrics(UUID);
CREATE OR REPLACE FUNCTION get_product_metrics(product_id_param UUID)
RETURNS TABLE (
  total_orders BIGINT,
  total_quantity BIGINT,
  total_revenue DECIMAL,
  avg_order_quantity DECIMAL,
  last_ordered_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT oi.order_id) as total_orders,
    SUM(oi.quantity) as total_quantity,
    SUM(oi.quantity * oi.unit_price) as total_revenue,
    AVG(oi.quantity) as avg_order_quantity,
    MAX(o.created_at) as last_ordered_at
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE oi.product_id = product_id_param
    AND o.status != 'cancelled';
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (views and functions)
GRANT SELECT ON sales_analytics TO authenticated;
GRANT SELECT ON top_products TO authenticated;
GRANT SELECT ON top_customers TO authenticated;
GRANT SELECT ON category_performance TO authenticated;
GRANT SELECT ON order_status_distribution TO authenticated;
GRANT EXECUTE ON FUNCTION get_revenue_trends TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_ltv TO authenticated;
GRANT EXECUTE ON FUNCTION get_product_metrics TO authenticated;

-- Note: RLS policies on views are not supported in PostgreSQL
-- Access control should be enforced at the API layer
-- All analytics endpoints should require admin role

COMMENT ON VIEW sales_analytics IS 'Daily sales metrics: orders, revenue, customers, items sold';
COMMENT ON VIEW top_products IS 'Product performance ranking by revenue';
COMMENT ON VIEW top_customers IS 'Customer lifetime value and order history';
COMMENT ON VIEW category_performance IS 'Category-level sales performance';
COMMENT ON VIEW order_status_distribution IS 'Order counts by status';
COMMENT ON FUNCTION get_revenue_trends IS 'Revenue trends over specified number of days';
COMMENT ON FUNCTION get_customer_ltv IS 'Calculate customer lifetime value';
COMMENT ON FUNCTION get_product_metrics IS 'Product performance metrics';
