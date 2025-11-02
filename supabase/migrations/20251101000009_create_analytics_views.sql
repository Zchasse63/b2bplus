-- Analytics Dashboard Migration
-- Create materialized views and functions for analytics

-- Sales Analytics View
CREATE OR REPLACE VIEW sales_analytics AS
SELECT
  DATE_TRUNC('day', o.created_at) as date,
  COUNT(DISTINCT o.id) as order_count,
  COUNT(DISTINCT o.customer_id) as unique_customers,
  SUM(o.total_amount) as revenue,
  AVG(o.total_amount) as avg_order_value,
  SUM(oi.quantity) as total_items_sold
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
WHERE o.status != 'cancelled'
GROUP BY DATE_TRUNC('day', o.created_at)
ORDER BY date DESC;

-- Top Products View
CREATE OR REPLACE VIEW top_products AS
SELECT
  p.id,
  p.sku,
  p.name,
  p.category,
  p.price,
  COUNT(DISTINCT oi.order_id) as order_count,
  SUM(oi.quantity) as total_quantity_sold,
  SUM(oi.quantity * oi.unit_price) as total_revenue
FROM products p
LEFT JOIN order_items oi ON oi.product_id = p.id
LEFT JOIN orders o ON o.id = oi.order_id
WHERE o.status != 'cancelled' OR o.status IS NULL
GROUP BY p.id, p.sku, p.name, p.category, p.price
ORDER BY total_revenue DESC NULLS LAST;

-- Top Customers View
CREATE OR REPLACE VIEW top_customers AS
SELECT
  u.id,
  u.email,
  p.full_name,
  p.company_name,
  COUNT(DISTINCT o.id) as order_count,
  SUM(o.total_amount) as total_spent,
  AVG(o.total_amount) as avg_order_value,
  MAX(o.created_at) as last_order_date,
  MIN(o.created_at) as first_order_date
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN orders o ON o.customer_id = u.id
WHERE o.status != 'cancelled' OR o.status IS NULL
GROUP BY u.id, u.email, p.full_name, p.company_name
ORDER BY total_spent DESC NULLS LAST;

-- Category Performance View
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
CREATE OR REPLACE VIEW order_status_distribution AS
SELECT
  status,
  COUNT(*) as count,
  SUM(total_amount) as total_amount
FROM orders
GROUP BY status
ORDER BY count DESC;

-- Revenue Trends (Last 30 Days)
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
    SUM(o.total_amount) as revenue,
    COUNT(o.id) as order_count,
    AVG(o.total_amount) as avg_order_value
  FROM orders o
  WHERE o.created_at >= NOW() - (days_back || ' days')::INTERVAL
    AND o.status != 'cancelled'
  GROUP BY DATE_TRUNC('day', o.created_at)::DATE
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;

-- Customer Lifetime Value
CREATE OR REPLACE FUNCTION get_customer_ltv(customer_id_param UUID)
RETURNS DECIMAL AS $$
DECLARE
  ltv DECIMAL;
BEGIN
  SELECT COALESCE(SUM(total_amount), 0)
  INTO ltv
  FROM orders
  WHERE customer_id = customer_id_param
    AND status != 'cancelled';
  
  RETURN ltv;
END;
$$ LANGUAGE plpgsql;

-- Product Performance Metrics
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

-- Grant permissions
GRANT SELECT ON sales_analytics TO authenticated;
GRANT SELECT ON top_products TO authenticated;
GRANT SELECT ON top_customers TO authenticated;
GRANT SELECT ON category_performance TO authenticated;
GRANT SELECT ON order_status_distribution TO authenticated;
GRANT EXECUTE ON FUNCTION get_revenue_trends TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_ltv TO authenticated;
GRANT EXECUTE ON FUNCTION get_product_metrics TO authenticated;

-- RLS Policies (admins only for analytics)
CREATE POLICY "Admins can view sales analytics"
  ON sales_analytics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );

-- Note: Views don't support RLS directly, so we'll enforce in the API layer
