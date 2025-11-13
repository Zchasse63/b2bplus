# Database Optimization Checklist

## Current Database Analysis

### Tables to Optimize
1. **orders** - High query volume
2. **order_items** - Frequently joined
3. **products** - Frequently queried
4. **customers** - Frequently queried
5. **invoices** - High query volume
6. **campaigns** - Frequently queried
7. **customer_opportunities** - AI-generated data

## Optimization Tasks

### Phase 1: Index Analysis

- [ ] **orders table**
  - [ ] Add index on `customer_id` (for customer order queries)
  - [ ] Add index on `created_at DESC` (for recent orders)
  - [ ] Add index on `status` (for order filtering)
  - [ ] Add composite index on `(customer_id, created_at DESC)`

- [ ] **order_items table**
  - [ ] Add index on `order_id` (for order detail queries)
  - [ ] Add index on `product_id` (for product analytics)

- [ ] **products table**
  - [ ] Add index on `category` (for category filtering)
  - [ ] Add index on `sku` (for SKU lookups)
  - [ ] Add index on `created_at DESC` (for recent products)

- [ ] **customers table**
  - [ ] Add index on `email` (for email lookups)
  - [ ] Add index on `organization_id` (for org queries)
  - [ ] Add index on `created_at DESC` (for recent customers)

- [ ] **invoices table**
  - [ ] Add index on `vendor_id` (for vendor invoices)
  - [ ] Add index on `status` (for invoice filtering)
  - [ ] Add index on `created_at DESC` (for recent invoices)

- [ ] **campaigns table**
  - [ ] Add index on `status` (for campaign filtering)
  - [ ] Add index on `created_at DESC` (for recent campaigns)

### Phase 2: Query Optimization

- [ ] **N+1 Query Analysis**
  - [ ] Audit `/api/admin/orders` - Check for N+1 with order_items
  - [ ] Audit `/api/admin/customers` - Check for N+1 with orders
  - [ ] Audit `/api/admin/products` - Check for N+1 with categories
  - [ ] Audit `/api/admin/invoices` - Check for N+1 with line items

- [ ] **JOIN Optimization**
  - [ ] Verify all JOINs use indexed columns
  - [ ] Check for unnecessary JOINs
  - [ ] Optimize complex queries with multiple JOINs

- [ ] **SELECT Optimization**
  - [ ] Remove SELECT * queries
  - [ ] Only fetch needed columns
  - [ ] Use pagination for large result sets

### Phase 3: Connection Pooling

- [ ] Configure Supabase connection pool
  - [ ] Set pool size to 20-30 connections
  - [ ] Set idle timeout to 30 seconds
  - [ ] Monitor connection usage

- [ ] Monitor connection health
  - [ ] Check active connections
  - [ ] Check idle connections
  - [ ] Set up alerts for connection pool exhaustion

### Phase 4: Caching Strategy

- [ ] Identify cacheable queries
  - [ ] Product list (cache 1 hour)
  - [ ] Category list (cache 1 day)
  - [ ] Customer data (cache 5 minutes)
  - [ ] Order data (cache 5 minutes)

- [ ] Implement Redis caching
  - [ ] Set up Redis client
  - [ ] Implement cache-aside pattern
  - [ ] Add cache invalidation on updates

### Phase 5: Query Monitoring

- [ ] Enable query logging
  - [ ] Set log_min_duration_statement = 1000ms
  - [ ] Monitor slow queries
  - [ ] Create alerts for queries > 500ms

- [ ] Analyze query performance
  - [ ] Use EXPLAIN ANALYZE
  - [ ] Identify sequential scans
  - [ ] Identify missing indexes

## SQL Optimization Queries

### Add Indexes
```sql
-- Orders table
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_customer_created ON orders(customer_id, created_at DESC);

-- Order items table
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- Products table
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_created_at ON products(created_at DESC);

-- Customers table
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_org_id ON customers(organization_id);
CREATE INDEX idx_customers_created_at ON customers(created_at DESC);

-- Invoices table
CREATE INDEX idx_invoices_vendor_id ON invoices(vendor_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_created_at ON invoices(created_at DESC);

-- Campaigns table
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_created_at ON campaigns(created_at DESC);
```

### Analyze Query Performance
```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Find unused indexes
SELECT schemaname, tablename, indexname
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Performance Targets

### Before Optimization
- Average query time: ~300ms
- Slow queries (> 500ms): 15-20%
- Cache hit rate: 0%

### After Optimization
- Average query time: < 100ms (66% improvement)
- Slow queries (> 500ms): < 5%
- Cache hit rate: > 70%

## Monitoring & Alerts

### Key Metrics to Track
- Query execution time (P50, P95, P99)
- Slow query count
- Cache hit rate
- Connection pool usage
- Database CPU usage
- Database memory usage

### Alert Thresholds
- Query P95 > 500ms
- Slow query count > 10/minute
- Cache hit rate < 50%
- Connection pool usage > 80%
- Database CPU > 80%

## Related Documentation

- [Supabase Performance Tuning](https://supabase.com/docs/guides/database/performance)
- [PostgreSQL Index Types](https://www.postgresql.org/docs/current/indexes-types.html)
- [Query Optimization](https://www.postgresql.org/docs/current/performance-tips.html)

