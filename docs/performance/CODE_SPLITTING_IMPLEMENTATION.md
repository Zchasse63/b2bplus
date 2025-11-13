# Code Splitting Implementation Guide

## Completed Tasks

### ✅ Task 1: Bundle Analysis
- Installed @next/bundle-analyzer
- Analyzed current bundle: 2.1MB static chunks
- Identified heavy dependencies: Recharts, Radix UI, Framer Motion

### ✅ Task 2: Admin Page Code Splitting
- Created `lib/utils/lazy-load.tsx` - Lazy loading utilities
- Created `components/admin/ReportsCharts.tsx` - Lazy-loaded Recharts components
- Updated `app/admin/reports/page.tsx` to use lazy-loaded charts
- Build successful, bundle: 2.3MB

## In Progress: Task 3 - Lazy Load Heavy Components

### Components to Lazy Load

1. **DataTable** (`components/b2b/DataTable.tsx`)
   - Used in: customers, products, inventory, recommendations pages
   - Size: ~50KB
   - Status: Created LazyDataTable wrapper

2. **Modal** (`components/b2b/Modal.tsx`)
   - Used in: Forms, confirmations, dialogs
   - Size: ~30KB
   - Status: Pending

3. **Drawer** (`components/b2b/Drawer.tsx`)
   - Used in: Side panels, filters
   - Size: ~25KB
   - Status: Pending

4. **Form Components** (Select, Input, etc.)
   - Used in: All forms
   - Size: ~40KB combined
   - Status: Pending

### Implementation Pattern

```typescript
// components/admin/LazyDataTable.tsx
import dynamic from 'next/dynamic';

const DataTableComponent = dynamic(
  () => import('@/components/b2b/DataTable').then(mod => ({ default: (mod as any).DataTable })),
  { loading: LoadingSpinner, ssr: true }
) as any;

export function LazyDataTable(props: any) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <DataTableComponent {...props} />
    </Suspense>
  );
}
```

### Usage in Admin Pages

```typescript
// Before
import { DataTable } from '@/components/b2b';

export function CustomersPage() {
  return <DataTable data={customers} columns={columns} />;
}

// After
import { LazyDataTable } from '@/components/admin/LazyDataTable';

export function CustomersPage() {
  return <LazyDataTable data={customers} columns={columns} />;
}
```

## Next Steps

### Task 3.1: Lazy Load DataTable
- [ ] Update admin/customers/page.tsx
- [ ] Update admin/products/page.tsx
- [ ] Update admin/inventory/page.tsx
- [ ] Update admin/recommendations/page.tsx
- [ ] Test build and performance

### Task 3.2: Lazy Load Modal/Drawer
- [ ] Create LazyModal wrapper
- [ ] Create LazyDrawer wrapper
- [ ] Update pages using modals/drawers
- [ ] Test build

### Task 3.3: Lazy Load Form Components
- [ ] Create LazySelect wrapper
- [ ] Create LazyInput wrapper
- [ ] Update admin forms
- [ ] Test build

## Performance Targets

### Current State
- Static chunks: 2.3MB
- Client bundle: 960KB (analysis)

### Target After Code Splitting
- Static chunks: < 1.8MB (20% reduction)
- Client bundle: < 700KB (25% reduction)
- Initial load time: < 2s (from ~3s)

## Monitoring

### Bundle Analysis
```bash
npm run build:analyze
# Opens interactive visualization
```

### Performance Metrics
- Measure FCP, LCP, TTI before/after
- Monitor real-world performance with Sentry
- Track user experience metrics

## Rollback Plan

If code splitting causes issues:
1. Revert to static imports
2. Increase `ssr` flag to `true`
3. Adjust loading states
4. Monitor performance

## Related Files

- `lib/utils/lazy-load.tsx` - Lazy loading utilities
- `components/admin/ReportsCharts.tsx` - Lazy-loaded charts
- `components/admin/LazyDataTable.tsx` - Lazy-loaded data table
- `docs/performance/CODE_SPLITTING_STRATEGY.md` - Strategy document

