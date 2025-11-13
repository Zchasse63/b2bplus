# Code Splitting Strategy for B2B Plus

## Overview

Code splitting is a technique to reduce the initial JavaScript bundle size by splitting the code into smaller chunks that are loaded on-demand. This improves:
- **First Contentful Paint (FCP)**: Faster initial page load
- **Time to Interactive (TTI)**: Faster user interaction
- **Mobile Performance**: Reduced data usage on mobile networks

## Current Bundle Analysis

### Bundle Sizes (Before Optimization)
- **Client Bundle**: 940KB (analysis file)
- **Static Chunks**: 2.1MB
- **Total Static Assets**: 2.2MB

### Heavy Dependencies
1. **Recharts** (~200KB) - Used in admin analytics, reports, forecasts
2. **Radix UI** (~150KB) - Used throughout the app
3. **Framer Motion** (~100KB) - Used for animations
4. **React Icons** (~80KB) - Used for icons

## Code Splitting Strategy

### 1. Admin Pages Code Splitting

Admin pages are the primary target for code splitting because:
- They're not accessed by all users
- They contain heavy components (charts, tables, data visualization)
- They can be loaded on-demand

**Admin Pages to Split:**
- `/admin/analytics` - Uses Recharts heavily
- `/admin/reports` - Uses Recharts and data tables
- `/admin/inventory` - Uses data tables
- `/admin/pricing` - Uses data tables and forms
- `/admin/customers` - Uses data tables
- `/admin/products` - Uses data tables and forms
- `/admin/forecasts` - Uses Recharts
- `/admin/opportunities` - Uses data tables
- `/admin/recommendations` - Uses data tables

### 2. Component-Level Code Splitting

Heavy components that should be lazy-loaded:
- **Recharts Components** - LineChart, BarChart, PieChart, AreaChart
- **DataTable** - Complex data table component
- **Modal/Drawer** - Dialog components (loaded on-demand)
- **Charts** - Custom chart components

### 3. Implementation Approach

#### Option A: Dynamic Imports (Recommended)
```typescript
import dynamic from 'next/dynamic';

const LazyAnalytics = dynamic(
  () => import('@/app/admin/analytics/page'),
  { loading: () => <LoadingSpinner />, ssr: false }
);
```

**Pros:**
- Simple to implement
- Works with Next.js out of the box
- Automatic code splitting

**Cons:**
- Requires loading state UI
- May cause layout shift

#### Option B: Route-Based Code Splitting
Next.js automatically code-splits at the route level. Each page is a separate chunk.

**Pros:**
- Automatic
- No additional configuration needed

**Cons:**
- Limited control over chunk size
- May not split enough

#### Option C: Component-Level Code Splitting
Lazy load individual components within pages.

**Pros:**
- Fine-grained control
- Can optimize specific heavy components

**Cons:**
- More implementation work
- More loading states to manage

## Implementation Plan

### Phase 1: Recharts Lazy Loading (Week 1)
1. Create lazy-load utilities in `lib/utils/lazy-load.ts`
2. Update admin pages to use lazy-loaded Recharts components
3. Add loading states for chart components
4. Expected reduction: 200KB

### Phase 2: Admin Page Code Splitting (Week 2)
1. Implement dynamic imports for admin pages
2. Create loading UI for admin pages
3. Test performance improvements
4. Expected reduction: 300-400KB

### Phase 3: Component-Level Optimization (Week 3)
1. Lazy load Modal/Drawer components
2. Lazy load DataTable component
3. Lazy load heavy form components
4. Expected reduction: 150-200KB

### Phase 4: Verification & Monitoring (Week 4)
1. Run bundle analysis after each phase
2. Measure performance improvements
3. Monitor real-world performance with Sentry
4. Document results

## Performance Targets

### Bundle Size Targets
- **Initial Bundle**: < 200KB gzipped (from 940KB)
- **Admin Bundle**: < 300KB gzipped
- **Chart Bundle**: < 150KB gzipped

### Performance Metrics
- **FCP**: < 1.5s (from ~2.5s)
- **LCP**: < 2.5s (from ~3.5s)
- **TTI**: < 3.5s (from ~4.5s)

## Implementation Details

### Lazy Load Utilities

File: `lib/utils/lazy-load.ts`

```typescript
import dynamic from 'next/dynamic';

export const LazyLineChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.LineChart })),
  { loading: LazyLoadingFallback, ssr: false }
);

export const LazyAdminAnalytics = dynamic(
  () => import('@/app/admin/analytics/page'),
  { loading: LazyLoadingFallback, ssr: false }
);
```

### Usage in Components

```typescript
import { LazyLineChart, LazyResponsiveContainer } from '@/lib/utils/lazy-load';

export function AnalyticsChart() {
  return (
    <LazyResponsiveContainer width="100%" height={300}>
      <LazyLineChart data={data}>
        {/* Chart content */}
      </LazyLineChart>
    </LazyResponsiveContainer>
  );
}
```

## Monitoring & Validation

### Bundle Analysis
```bash
npm run build:analyze
# Opens interactive bundle analysis in browser
```

### Performance Testing
```bash
npm run build
npm start
# Use Chrome DevTools to measure performance
```

### Lighthouse Audit
```bash
# Run Lighthouse audit
lighthouse https://localhost:3000/admin --view
```

## Rollback Plan

If code splitting causes issues:
1. Revert to static imports
2. Increase `ssr` flag to `true` for problematic components
3. Adjust loading states
4. Monitor performance metrics

## Related Documentation

- [Performance Optimization Guide](./performance-optimization-guide.md)
- [Bundle Analysis Results](./bundle-analysis.md)
- [Next.js Dynamic Imports](https://nextjs.org/docs/advanced-features/dynamic-import)

