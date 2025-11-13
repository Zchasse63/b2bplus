# Infrastructure Optimization Guide

## Overview

Infrastructure optimization focuses on:
- **CDN Configuration**: Distribute content globally
- **Auto-scaling**: Handle traffic spikes
- **Database Read Replicas**: Distribute read load
- **Load Balancing**: Distribute requests

## 1. CDN Configuration (CloudFlare)

### Setup CloudFlare

1. **Add Domain to CloudFlare**
   - Go to cloudflare.com
   - Add your domain
   - Update nameservers

2. **Configure Cache Rules**
   ```
   Path: /static/*
   Cache Level: Cache Everything
   Browser Cache TTL: 1 year
   
   Path: /api/*
   Cache Level: Bypass
   
   Path: /images/*
   Cache Level: Cache Everything
   Browser Cache TTL: 30 days
   ```

3. **Enable Features**
   - [ ] Gzip compression
   - [ ] Brotli compression
   - [ ] Minify CSS/JS/HTML
   - [ ] Rocket Loader (async JS)
   - [ ] Image optimization
   - [ ] HTTP/2 Push

### CloudFlare Configuration

```javascript
// next.config.js
const nextConfig = {
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, must-revalidate',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
        ],
      },
    ];
  },
};
```

## 2. Auto-scaling Configuration

### Vercel Auto-scaling

Vercel automatically scales based on traffic:
- Serverless functions scale automatically
- No configuration needed
- Monitor usage in Vercel dashboard

### Supabase Auto-scaling

```sql
-- Monitor connection usage
SELECT datname, count(*) as connections
FROM pg_stat_activity
GROUP BY datname;

-- Set up read replicas
-- Available in Supabase Pro plan
-- Automatically distributes read queries
```

## 3. Database Read Replicas

### Enable Read Replicas (Supabase Pro)

1. **Create Read Replica**
   - Go to Supabase dashboard
   - Database > Replicas
   - Create new replica in different region

2. **Configure Connection Pooling**
   ```typescript
   // Read queries to replica
   const readClient = createClient(
     process.env.SUPABASE_REPLICA_URL,
     process.env.SUPABASE_SERVICE_ROLE_KEY
   );

   // Write queries to primary
   const writeClient = createClient(
     process.env.SUPABASE_URL,
     process.env.SUPABASE_SERVICE_ROLE_KEY
   );
   ```

3. **Route Queries**
   ```typescript
   // Read-heavy queries
   const products = await readClient
     .from('products')
     .select('*');

   // Write queries
   await writeClient
     .from('products')
     .insert(newProduct);
   ```

## 4. Load Balancing

### Vercel Load Balancing

Vercel automatically load balances:
- Distributes requests across regions
- Automatic failover
- No configuration needed

### Custom Load Balancing

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Route to different servers based on path
  if (request.nextUrl.pathname.startsWith('/api/heavy')) {
    // Route to dedicated server
    return NextResponse.rewrite(
      new URL('https://api-heavy.example.com' + request.nextUrl.pathname, request.url)
    );
  }

  return NextResponse.next();
}
```

## Performance Targets

### Before Infrastructure Optimization
- Global latency: ~500ms (US to EU)
- Peak traffic handling: 100 req/s
- Database read latency: ~200ms

### After Infrastructure Optimization
- Global latency: < 200ms (with CDN)
- Peak traffic handling: 1000+ req/s (with auto-scaling)
- Database read latency: < 50ms (with read replicas)

## Monitoring

### Key Metrics
- CDN cache hit rate
- Origin response time
- Global latency (by region)
- Auto-scaling events
- Database replica lag

### Sentry Integration
```typescript
Sentry.captureMessage('High latency detected', {
  level: 'warning',
  contexts: {
    infrastructure: {
      latency: 800,
      region: 'eu-west-1',
      threshold: 500,
    },
  },
});
```

## Implementation Plan

### Phase 1: CDN Setup
- [ ] Add domain to CloudFlare
- [ ] Configure cache rules
- [ ] Enable compression
- [ ] Test CDN performance

### Phase 2: Auto-scaling
- [ ] Monitor Vercel auto-scaling
- [ ] Set up alerts
- [ ] Test load handling

### Phase 3: Read Replicas
- [ ] Create read replica (if Pro plan)
- [ ] Configure connection routing
- [ ] Test replica performance

### Phase 4: Monitoring
- [ ] Set up performance monitoring
- [ ] Create dashboards
- [ ] Set up alerts

## Cost Optimization

### CloudFlare Pricing
- Free: $0/month (basic CDN)
- Pro: $20/month (advanced features)
- Business: $200/month (priority support)

### Supabase Pricing
- Free: $0/month (no read replicas)
- Pro: $25/month (1 read replica)
- Business: Custom pricing (multiple replicas)

### Vercel Pricing
- Free: $0/month (auto-scaling included)
- Pro: $20/month (priority support)
- Enterprise: Custom pricing

## Related Documentation

- [CloudFlare Caching](https://developers.cloudflare.com/cache/)
- [Vercel Auto-scaling](https://vercel.com/docs/concepts/edge-network/overview)
- [Supabase Read Replicas](https://supabase.com/docs/guides/database/read-replicas)
- [Load Balancing Best Practices](https://aws.amazon.com/elasticloadbalancing/)

