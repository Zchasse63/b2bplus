/**
 * Reports Charts Component
 * 
 * This component wraps Recharts components to enable lazy loading
 * and reduce the initial bundle size.
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

// Lazy load Recharts components
const ResponsiveContainer = dynamic(
  () => import('recharts').then(mod => ({ default: mod.ResponsiveContainer as any })),
  { loading: LoadingSpinner, ssr: false }
) as any;

const LineChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.LineChart as any })),
  { loading: LoadingSpinner, ssr: false }
) as any;

const BarChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.BarChart as any })),
  { loading: LoadingSpinner, ssr: false }
) as any;

const PieChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.PieChart as any })),
  { loading: LoadingSpinner, ssr: false }
) as any;

const Line = dynamic(
  () => import('recharts').then(mod => ({ default: mod.Line as any })),
  { loading: LoadingSpinner, ssr: false }
) as any;

const Bar = dynamic(
  () => import('recharts').then(mod => ({ default: mod.Bar as any })),
  { loading: LoadingSpinner, ssr: false }
) as any;

const Pie = dynamic(
  () => import('recharts').then(mod => ({ default: mod.Pie as any })),
  { loading: LoadingSpinner, ssr: false }
) as any;

const Cell = dynamic(
  () => import('recharts').then(mod => ({ default: mod.Cell as any })),
  { loading: LoadingSpinner, ssr: false }
) as any;

const XAxis = dynamic(
  () => import('recharts').then(mod => ({ default: mod.XAxis as any })),
  { loading: LoadingSpinner, ssr: false }
) as any;

const YAxis = dynamic(
  () => import('recharts').then(mod => ({ default: mod.YAxis as any })),
  { loading: LoadingSpinner, ssr: false }
) as any;

const CartesianGrid = dynamic(
  () => import('recharts').then(mod => ({ default: mod.CartesianGrid as any })),
  { loading: LoadingSpinner, ssr: false }
) as any;

const Tooltip = dynamic(
  () => import('recharts').then(mod => ({ default: mod.Tooltip as any })),
  { loading: LoadingSpinner, ssr: false }
) as any;

const Legend = dynamic(
  () => import('recharts').then(mod => ({ default: mod.Legend as any })),
  { loading: LoadingSpinner, ssr: false }
) as any;

// Export components for use in admin pages
export {
  ResponsiveContainer,
  LineChart,
  BarChart,
  PieChart,
  Line,
  Bar,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
};

/**
 * Revenue Chart Component
 * Displays revenue over time using a line chart
 */
export function RevenueChart({ data }: { data: Array<{ date: string; revenue: number }> }) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="revenue" stroke="#0ACF83" />
        </LineChart>
      </ResponsiveContainer>
    </Suspense>
  );
}

/**
 * Orders Status Chart Component
 * Displays order distribution by status using a bar chart
 */
export function OrdersStatusChart({ data }: { data: Array<{ status: string; count: number }> }) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="status" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="count" fill="#FFC120" />
        </BarChart>
      </ResponsiveContainer>
    </Suspense>
  );
}

/**
 * Categories Revenue Chart Component
 * Displays revenue by category using a pie chart
 */
export function CategoriesRevenueChart({
  data,
  colors,
}: {
  data: Array<{ category: string; revenue: number }>;
  colors: string[];
}) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="revenue"
            nameKey="category"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Suspense>
  );
}

/**
 * Customer Growth Chart Component
 * Displays customer growth over time using a line chart
 */
export function CustomerGrowthChart({ data }: { data: Array<{ month: string; customers: number }> }) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="customers" stroke="#111012" />
        </LineChart>
      </ResponsiveContainer>
    </Suspense>
  );
}

