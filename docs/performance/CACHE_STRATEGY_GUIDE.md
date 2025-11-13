# Cache Strategy Implementation Guide

## Overview

Effective caching is critical for performance:
- **Static Assets**: Cache for 1 year (immutable)
- **API Responses**: Cache for 5 minutes (frequently updated)
- **HTML Pages**: Cache for 5 minutes (dynamic content)
- **Images**: Cache for 30 days (rarely change)

## Cache Layers

### 1. Browser Cache (Client-Side)
- Controlled by HTTP headers
- Reduces server requests
- Improves perceived performance

### 2. CDN Cache (Edge)
- Distributed globally
- Reduces origin server load
- Improves latency

### 3. Server Cache (Origin)
- In-memory caching (Redis)
- Database query caching
- API response caching

## HTTP Cache Headers

### Static Assets (1 Year)
```
Cache-Control: public, max-age=31536000, immutable
```

### API Responses (5 Minutes)
```
Cache-Control: public, max-age=300, must-revalidate
```

### HTML Pages (5 Minutes)
```
Cache-Control: public, max-age=300, must-revalidate
```

### Images (30 Days)
```
Cache-Control: public, max-age=2592000
```

## Next.js Cache Configuration

### next.config.js
```javascript
const nextConfig = {
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
  headers: async () => {
    return [
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, must-revalidate',
          },
        ],
      },
    ];
  },
};
```

## API Response Caching

### Middleware for Cache Headers
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Cache API responses for 5 minutes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'public, max-age=300, must-revalidate');
  }

  // Cache static assets for 1 year
  if (request.nextUrl.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|webp)$/)) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }

  return response;
}

export const config = {
  matcher: ['/:path*'],
};
```

## Cache Invalidation Strategies

### 1. Time-Based (TTL)
- Automatic expiration after set time
- Simple to implement
- May serve stale data

### 2. Event-Based
- Invalidate on data changes
- More complex
- Always serves fresh data

### 3. Manual
- Admin-triggered invalidation
- Full control
- Requires manual intervention

## Implementation Plan

### Phase 1: HTTP Headers
- [ ] Configure cache headers in next.config.js
- [ ] Set up middleware for cache control
- [ ] Test cache headers with DevTools

### Phase 2: Service Worker Caching
- [ ] Update service worker cache strategy
- [ ] Implement cache versioning
- [ ] Add cache invalidation logic

### Phase 3: Redis Caching
- [ ] Set up Redis connection
- [ ] Implement cache layer for API responses
- [ ] Add cache invalidation on data changes

### Phase 4: Monitoring
- [ ] Track cache hit/miss rates
- [ ] Monitor cache size
- [ ] Set up alerts for cache issues

## Performance Targets

### Cache Goals
- **Cache hit rate**: > 80%
- **Cache size**: < 100MB
- **Cache invalidation time**: < 1 second

### Metrics to Track
- Cache hit/miss ratio
- Cache size
- Cache invalidation time
- API response time (cached vs uncached)

## Cache Invalidation Examples

### On Data Update
```typescript
// When updating a product
async function updateProduct(id: string, data: any) {
  // Update database
  await db.products.update(id, data);

  // Invalidate cache
  await cache.delete(`product:${id}`);
  await cache.delete('products:list');
}
```

### On Scheduled Time
```typescript
// Invalidate cache every 5 minutes
setInterval(() => {
  cache.delete('api:recommendations');
  cache.delete('api:pricing');
}, 5 * 60 * 1000);
```

### On User Action
```typescript
// Invalidate cache when user approves pricing
async function approvePricing(id: string) {
  await db.pricing.update(id, { status: 'approved' });
  
  // Invalidate related caches
  await cache.delete(`pricing:${id}`);
  await cache.delete('pricing:list');
  await cache.delete('pricing:recommendations');
}
```

## Testing Cache

### Browser DevTools
1. Open DevTools
2. Go to Network tab
3. Check "Disable cache" to test without caching
4. Compare load times with/without cache

### curl Command
```bash
# Check cache headers
curl -I https://example.com/api/products

# Check cache with curl
curl -H "Cache-Control: max-age=0" https://example.com/api/products
```

## Monitoring

### Cache Metrics
- Cache hit rate: (hits / total requests) * 100
- Cache size: Total bytes stored
- Cache invalidation time: Time to invalidate cache

### Sentry Integration
```typescript
Sentry.captureMessage('Cache hit', {
  level: 'debug',
  contexts: {
    cache: {
      key: 'product:123',
      hit: true,
      age: 45000,
    },
  },
});
```

## Related Documentation

- [HTTP Caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)
- [Next.js Caching](https://nextjs.org/docs/app/building-your-application/caching)
- [Service Worker Caching](https://web.dev/service-workers-cache-storage/)
- [Redis Caching](https://redis.io/docs/manual/client-side-caching/)

