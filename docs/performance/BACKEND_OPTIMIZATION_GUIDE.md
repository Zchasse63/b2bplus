# Backend Optimization Guide

## Overview

Backend optimization focuses on:
- **Database Query Optimization**: Reduce query time, add indexes, optimize N+1 queries
- **Connection Pooling**: Manage database connections efficiently
- **Redis Caching**: Cache frequently accessed data
- **API Response Optimization**: Compress responses, optimize payloads

## Performance Targets

### API Response Times
- **P50**: < 200ms
- **P95**: < 500ms
- **P99**: < 1000ms

### Database Query Times
- **P50**: < 100ms
- **P95**: < 300ms
- **P99**: < 500ms

### Cache Hit Rate
- **Target**: > 70%
- **Minimum**: > 50%

## 1. Database Query Optimization

### Identify Slow Queries

```sql
-- Enable query logging
ALTER SYSTEM SET log_min_duration_statement = 1000;
SELECT pg_reload_conf();

-- Check slow queries
SELECT query, calls, mean_exec_time, max_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC;
```

### Common Issues

1. **N+1 Queries**
   - Problem: Loading parent, then querying child for each parent
   - Solution: Use JOIN or batch queries

2. **Missing Indexes**
   - Problem: Full table scans
   - Solution: Add indexes on frequently queried columns

3. **Inefficient Joins**
   - Problem: Joining on non-indexed columns
   - Solution: Ensure join columns are indexed

4. **Large Result Sets**
   - Problem: Fetching too much data
   - Solution: Use pagination, select specific columns

### Optimization Strategies

```sql
-- Add indexes on frequently queried columns
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- Use EXPLAIN to analyze queries
EXPLAIN ANALYZE
SELECT * FROM orders
WHERE customer_id = 123
ORDER BY created_at DESC;

-- Optimize with JOIN instead of N+1
-- BEFORE: Loop through customers, query orders for each
-- AFTER:
SELECT c.*, COUNT(o.id) as order_count
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
GROUP BY c.id;
```

## 2. Connection Pooling

### Supabase Connection Pool Configuration

```typescript
// lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    db: {
      schema: 'public',
    },
    auth: {
      persistSession: false,
    },
  }
);

export default supabase;
```

### Connection Pool Monitoring

```sql
-- Check active connections
SELECT datname, count(*) as connections
FROM pg_stat_activity
GROUP BY datname;

-- Check connection limits
SHOW max_connections;
SHOW superuser_reserved_connections;
```

## 3. Redis Caching

### Setup Redis Client

```typescript
// lib/redis/client.ts
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

export default redis;
```

### Cache Patterns

```typescript
// Cache-aside pattern
async function getProduct(id: string) {
  // Check cache first
  const cached = await redis.get(`product:${id}`);
  if (cached) return JSON.parse(cached);

  // Query database
  const product = await db.products.findById(id);

  // Store in cache (5 minutes)
  await redis.setex(`product:${id}`, 300, JSON.stringify(product));

  return product;
}

// Cache invalidation
async function updateProduct(id: string, data: any) {
  await db.products.update(id, data);
  await redis.del(`product:${id}`);
}
```

## 4. API Response Optimization

### Response Compression

```typescript
// middleware.ts
import compression from 'compression';

export const middleware = compression({
  threshold: 1024, // Only compress responses > 1KB
  level: 6, // Compression level (0-9)
});
```

### Payload Optimization

```typescript
// Only return necessary fields
async function getOrders(customerId: string) {
  return db.orders
    .select('id', 'total', 'status', 'created_at')
    .where('customer_id', customerId)
    .limit(10);
}

// Use pagination
async function getProducts(page: number = 1, limit: number = 20) {
  const offset = (page - 1) * limit;
  return db.products
    .select('id', 'name', 'price', 'image')
    .limit(limit)
    .offset(offset);
}
```

## Implementation Plan

### Phase 1: Database Optimization
- [ ] Analyze slow queries
- [ ] Add missing indexes
- [ ] Optimize N+1 queries
- [ ] Test performance improvements

### Phase 2: Connection Pooling
- [ ] Configure connection pool
- [ ] Monitor connections
- [ ] Set up alerts

### Phase 3: Redis Caching
- [ ] Set up Redis
- [ ] Implement cache patterns
- [ ] Add cache invalidation

### Phase 4: API Optimization
- [ ] Enable compression
- [ ] Optimize payloads
- [ ] Add pagination
- [ ] Test performance

## Monitoring

### Key Metrics
- Query execution time
- Cache hit rate
- Connection pool usage
- API response time

### Sentry Integration
```typescript
Sentry.captureMessage('Slow query detected', {
  level: 'warning',
  contexts: {
    database: {
      query: 'SELECT * FROM orders',
      duration: 1500,
      threshold: 1000,
    },
  },
});
```

## Performance Targets

### Before Optimization
- API P95: ~800ms
- Database P95: ~400ms
- Cache hit rate: 0%

### After Optimization
- API P95: < 500ms (37% improvement)
- Database P95: < 200ms (50% improvement)
- Cache hit rate: > 70%

## Related Documentation

- [Supabase Performance](https://supabase.com/docs/guides/database/performance)
- [PostgreSQL Query Optimization](https://www.postgresql.org/docs/current/performance.html)
- [Redis Caching Patterns](https://redis.io/docs/manual/client-side-caching/)
- [API Response Optimization](https://web.dev/optimize-api-calls/)

