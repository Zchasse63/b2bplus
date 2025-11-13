# APM Monitoring Guide

## Overview

APM (Application Performance Monitoring) provides:
- **Real-time Performance Metrics**: Track response times, throughput, errors
- **Distributed Tracing**: Trace requests across services
- **Error Tracking**: Capture and analyze errors
- **Performance Alerts**: Get notified of issues

## Sentry APM Setup

### 1. Enable Sentry APM

Sentry APM is already configured in the project. Verify in `sentry.init()`:

```typescript
// sentry.server.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1, // 10% of transactions
  environment: process.env.NODE_ENV,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.OnUncaughtException(),
    new Sentry.Integrations.OnUnhandledRejection(),
  ],
});
```

### 2. Configure Performance Monitoring

```typescript
// lib/monitoring/performance.ts
import * as Sentry from "@sentry/nextjs";

export function capturePerformanceMetric(
  name: string,
  duration: number,
  tags?: Record<string, string>
) {
  Sentry.captureMessage(`Performance: ${name}`, {
    level: 'info',
    contexts: {
      performance: {
        metric: name,
        duration,
        unit: 'ms',
      },
    },
    tags: {
      performance: 'true',
      ...tags,
    },
  });
}

export function captureSlowQuery(
  query: string,
  duration: number,
  threshold: number
) {
  if (duration > threshold) {
    Sentry.captureMessage('Slow database query', {
      level: 'warning',
      contexts: {
        database: {
          query: query.substring(0, 100),
          duration,
          threshold,
        },
      },
    });
  }
}
```

### 3. Monitor API Routes

```typescript
// app/api/products/route.ts
import * as Sentry from "@sentry/nextjs";

export async function GET(request: Request) {
  const transaction = Sentry.startTransaction({
    name: 'GET /api/products',
    op: 'http.server',
  });

  try {
    const startTime = Date.now();

    // Your API logic
    const products = await db.products.findMany();

    const duration = Date.now() - startTime;
    transaction.setTag('duration', duration);
    transaction.setTag('product_count', products.length);

    return Response.json(products);
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  } finally {
    transaction.finish();
  }
}
```

### 4. Monitor Database Queries

```typescript
// lib/supabase/monitoring.ts
import * as Sentry from "@sentry/nextjs";

export async function monitoredQuery<T>(
  name: string,
  query: () => Promise<T>,
  threshold: number = 500
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await query();
    const duration = Date.now() - startTime;

    if (duration > threshold) {
      Sentry.captureMessage('Slow database query', {
        level: 'warning',
        contexts: {
          database: {
            query: name,
            duration,
            threshold,
          },
        },
      });
    }

    return result;
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
}
```

## Performance Metrics to Track

### Frontend Metrics
- **FCP** (First Contentful Paint): < 1.5s
- **LCP** (Largest Contentful Paint): < 2.5s
- **CLS** (Cumulative Layout Shift): < 0.1
- **TTI** (Time to Interactive): < 3.5s

### Backend Metrics
- **API Response Time**: P95 < 500ms
- **Database Query Time**: P95 < 300ms
- **Error Rate**: < 0.1%
- **Throughput**: > 100 req/s

### Infrastructure Metrics
- **CPU Usage**: < 80%
- **Memory Usage**: < 80%
- **Disk Usage**: < 80%
- **Network Latency**: < 200ms

## Alert Configuration

### Critical Alerts
- Error rate > 1%
- API response time P95 > 1000ms
- Database query time P95 > 500ms
- CPU usage > 90%

### Warning Alerts
- Error rate > 0.5%
- API response time P95 > 500ms
- Database query time P95 > 300ms
- CPU usage > 80%

### Info Alerts
- Deployment completed
- Performance improvement detected
- Cache hit rate < 50%

## Dashboards

### Performance Dashboard
- API response time trends
- Error rate trends
- Throughput trends
- Database query time trends

### Infrastructure Dashboard
- CPU usage
- Memory usage
- Disk usage
- Network latency

### Error Dashboard
- Error count by type
- Error rate by endpoint
- Error trends
- Top errors

## Implementation Plan

### Phase 1: Verify APM Setup
- [ ] Confirm Sentry APM enabled
- [ ] Verify transactions being captured
- [ ] Check Sentry dashboard

### Phase 2: Add Custom Metrics
- [ ] Add performance monitoring to API routes
- [ ] Add database query monitoring
- [ ] Add frontend performance tracking

### Phase 3: Configure Alerts
- [ ] Set up critical alerts
- [ ] Set up warning alerts
- [ ] Configure notification channels

### Phase 4: Create Dashboards
- [ ] Create performance dashboard
- [ ] Create infrastructure dashboard
- [ ] Create error dashboard

## Monitoring Best Practices

1. **Sample Strategically**
   - Sample 10-20% of transactions
   - Sample 100% of errors
   - Sample 100% of slow transactions

2. **Use Meaningful Tags**
   - Add endpoint, method, status code
   - Add user ID, organization ID
   - Add environment, region

3. **Monitor Key Flows**
   - User authentication
   - Product search
   - Order checkout
   - Admin operations

4. **Set Realistic Thresholds**
   - Based on historical data
   - Account for peak times
   - Leave room for growth

## Related Documentation

- [Sentry APM](https://docs.sentry.io/product/performance/)
- [Web Vitals](https://web.dev/vitals/)
- [Performance Monitoring](https://web.dev/performance-monitoring/)
- [Observability Best Practices](https://www.datadoghq.com/blog/observability-best-practices/)

