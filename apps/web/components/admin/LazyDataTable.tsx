/**
 * Lazy Data Table Component
 * 
 * Wraps the DataTable component with lazy loading to reduce initial bundle size.
 * The DataTable component is heavy and used mainly in admin pages.
 */

'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const LoadingSpinner = () => {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-b2b-primary"></div>
    </div>
  );
};

// Lazy load the DataTable component
const DataTableComponent = dynamic(
  () => import('@/components/b2b/DataTable').then(mod => ({ default: (mod as any).DataTable })),
  { loading: LoadingSpinner, ssr: true }
) as any;

/**
 * Lazy Data Table Wrapper
 * 
 * Provides the same interface as DataTable but with lazy loading
 */
export function LazyDataTable(props: any) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <DataTableComponent {...props} />
    </Suspense>
  );
}

export default LazyDataTable;

