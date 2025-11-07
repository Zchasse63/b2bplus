'use client';

import { lazy, Suspense } from 'react';
import { Card } from '@/components/b2b';

// Lazy load recharts components to reduce initial bundle size
const LineChart = lazy(() => import('recharts').then(mod => ({ default: mod.LineChart })));
const Line = lazy(() => import('recharts').then(mod => ({ default: mod.Line })));
const BarChart = lazy(() => import('recharts').then(mod => ({ default: mod.BarChart })));
const Bar = lazy(() => import('recharts').then(mod => ({ default: mod.Bar })));
const PieChart = lazy(() => import('recharts').then(mod => ({ default: mod.PieChart })));
const Pie = lazy(() => import('recharts').then(mod => ({ default: mod.Pie })));
const Cell = lazy(() => import('recharts').then(mod => ({ default: mod.Cell })));
const XAxis = lazy(() => import('recharts').then(mod => ({ default: mod.XAxis })));
const YAxis = lazy(() => import('recharts').then(mod => ({ default: mod.YAxis })));
const CartesianGrid = lazy(() => import('recharts').then(mod => ({ default: mod.CartesianGrid })));
const Tooltip = lazy(() => import('recharts').then(mod => ({ default: mod.Tooltip })));
const Legend = lazy(() => import('recharts').then(mod => ({ default: mod.Legend })));
const ResponsiveContainer = lazy(() => import('recharts').then(mod => ({ default: mod.ResponsiveContainer })));

// Loading fallback component
function ChartLoadingFallback() {
  return (
    <Card className="p-8">
      <div className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-b2b-yellow"></div>
        <span className="ml-3 text-b2b-gray-500">Loading chart...</span>
      </div>
    </Card>
  );
}

// Export lazy-loaded chart components wrapped in Suspense
export {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ChartLoadingFallback,
};

// Export a wrapper component that handles Suspense
export function LazyLineChart({ children, ...props }: any) {
  return (
    <Suspense fallback={<ChartLoadingFallback />}>
      <ResponsiveContainer {...props}>
        <LineChart {...props}>
          {children}
        </LineChart>
      </ResponsiveContainer>
    </Suspense>
  );
}

export function LazyBarChart({ children, ...props }: any) {
  return (
    <Suspense fallback={<ChartLoadingFallback />}>
      <ResponsiveContainer {...props}>
        <BarChart {...props}>
          {children}
        </BarChart>
      </ResponsiveContainer>
    </Suspense>
  );
}

export function LazyPieChart({ children, ...props }: any) {
  return (
    <Suspense fallback={<ChartLoadingFallback />}>
      <ResponsiveContainer {...props}>
        <PieChart {...props}>
          {children}
        </PieChart>
      </ResponsiveContainer>
    </Suspense>
  );
}
