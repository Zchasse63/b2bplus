/**
 * Lazy Loading Utilities for Code Splitting
 *
 * This module provides utilities for lazy loading components and modules
 * to reduce initial bundle size and improve performance.
 */

'use client';

import dynamic from 'next/dynamic';
import React from 'react';

/**
 * Loading component shown while lazy-loaded component is loading
 */
export const LazyLoadingFallback = () => {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-b2b-primary"></div>
    </div>
  );
};

/**
 * Error component shown if lazy-loaded component fails to load
 */
export const LazyLoadingError = ({ error }: { error?: Error }) => {
  return (
    <div className="flex items-center justify-center p-8 bg-red-50 rounded-lg border border-red-200">
      <div className="text-red-700">
        <p className="font-semibold">Failed to load component</p>
        {error && <p className="text-sm mt-1">{error.message}</p>}
      </div>
    </div>
  );
};

/**
 * Create a lazy-loaded component with loading and error states
 *
 * @param importFunc - Dynamic import function
 * @param options - Configuration options
 * @returns Lazy-loaded component
 */
export function createLazyComponent<P extends object>(
  importFunc: () => Promise<{ default: React.ComponentType<P> }>,
  options?: {
    loading?: React.ComponentType<any>;
    error?: React.ComponentType<{ error?: Error }>;
    ssr?: boolean;
  }
) {
  return dynamic(importFunc, {
    loading: options?.loading || LazyLoadingFallback,
    ssr: options?.ssr !== false,
  } as any);
}

/**
 * Lazy load Recharts components to reduce bundle size
 * Recharts is a heavy dependency (~200KB) used mainly in admin pages
 */
export const LazyLineChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.LineChart })),
  { loading: LazyLoadingFallback, ssr: false }
);

export const LazyBarChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.BarChart })),
  { loading: LazyLoadingFallback, ssr: false }
);

export const LazyPieChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.PieChart })),
  { loading: LazyLoadingFallback, ssr: false }
);

export const LazyAreaChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.AreaChart })),
  { loading: LazyLoadingFallback, ssr: false }
);

export const LazyResponsiveContainer = dynamic(
  () => import('recharts').then(mod => ({ default: mod.ResponsiveContainer })),
  { loading: LazyLoadingFallback, ssr: false }
);

/**
 * Lazy load admin page components
 */
export const LazyAdminAnalytics = dynamic(
  () => import('@/app/admin/analytics/page').then(mod => ({ default: mod.default })),
  { loading: LazyLoadingFallback, ssr: false }
);

export const LazyAdminReports = dynamic(
  () => import('@/app/admin/reports/page').then(mod => ({ default: mod.default })),
  { loading: LazyLoadingFallback, ssr: false }
);

export const LazyAdminInventory = dynamic(
  () => import('@/app/admin/inventory/page').then(mod => ({ default: mod.default })),
  { loading: LazyLoadingFallback, ssr: false }
);

export const LazyAdminPricing = dynamic(
  () => import('@/app/admin/pricing/page').then(mod => ({ default: mod.default })),
  { loading: LazyLoadingFallback, ssr: false }
);

export const LazyAdminCustomers = dynamic(
  () => import('@/app/admin/customers/page').then(mod => ({ default: mod.default })),
  { loading: LazyLoadingFallback, ssr: false }
);

export const LazyAdminProducts = dynamic(
  () => import('@/app/admin/products/page').then(mod => ({ default: mod.default })),
  { loading: LazyLoadingFallback, ssr: false }
);

/**
 * Lazy load heavy data visualization components
 */
export const LazyDataTable = dynamic(
  () => import('@/components/b2b/DataTable').then(mod => ({ default: (mod as any).DataTable })),
  { loading: LazyLoadingFallback, ssr: true }
) as any;

