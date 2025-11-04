'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAdmin } from '@/lib/hooks/useAdmin';
import { Card, Button, Select } from '@/components/b2b';
import { FiTrendingUp, FiDollarSign, FiShoppingCart, FiUsers, FiPackage, FiBarChart2 } from 'react-icons/fi';

interface AnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  avgOrderValue: number;
  revenueGrowth: number;
  ordersGrowth: number;
  topProducts: Array<{
    id: string;
    name: string;
    category: string;
    total_revenue: number;
    order_count: number;
  }>;
  topCustomers: Array<{
    id: string;
    name: string;
    total_spent: number;
    order_count: number;
  }>;
  recentOrders: Array<{
    id: string;
    order_number: string;
    total: number;
    status: string;
    created_at: string;
  }>;
}

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      router.push('/');
    } else if (isAdmin) {
      loadAnalytics();
    }
  }, [isAdmin, adminLoading, router, timeRange]);

  const loadAnalytics = async () => {
    try {
      const supabase = createClient();
      const days = parseInt(timeRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Fetch orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, order_number, total, status, created_at, organization_id')
        .gte('created_at', startDate.toISOString())
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Fetch order items with products
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          id,
          order_id,
          product_id,
          quantity,
          unit_price,
          line_total,
          products (id, name, category)
        `)
        .in('order_id', (orders || []).map(o => o.id));

      if (itemsError) throw itemsError;

      // Fetch organizations
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name');

      if (orgsError) throw orgsError;

      // Calculate metrics
      const totalRevenue = (orders || []).reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
      const totalOrders = (orders || []).length;
      const totalCustomers = new Set((orders || []).map(o => o.organization_id)).size;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Calculate growth (compare to previous period)
      const previousStartDate = new Date(startDate);
      previousStartDate.setDate(previousStartDate.getDate() - days);
      
      const { data: previousOrders } = await supabase
        .from('orders')
        .select('total')
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', startDate.toISOString())
        .neq('status', 'cancelled');

      const previousRevenue = (previousOrders || []).reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
      const previousOrderCount = (previousOrders || []).length;
      
      const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;
      const ordersGrowth = previousOrderCount > 0 ? ((totalOrders - previousOrderCount) / previousOrderCount) * 100 : 0;

      // Top products
      const productStats = new Map<string, { name: string; category: string; revenue: number; count: number }>();
      (orderItems || []).forEach((item: any) => {
        const productId = item.product_id;
        const existing = productStats.get(productId) || { 
          name: item.products?.name || 'Unknown', 
          category: item.products?.category || 'Uncategorized',
          revenue: 0, 
          count: 0 
        };
        existing.revenue += parseFloat(item.line_total || 0);
        existing.count += 1;
        productStats.set(productId, existing);
      });

      const topProducts = Array.from(productStats.entries())
        .map(([id, stats]) => ({
          id,
          name: stats.name,
          category: stats.category,
          total_revenue: stats.revenue,
          order_count: stats.count,
        }))
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, 5);

      // Top customers
      const customerStats = new Map<string, { name: string; spent: number; count: number }>();
      (orders || []).forEach((order) => {
        const orgId = order.organization_id;
        const org = (orgs || []).find(o => o.id === orgId);
        const existing = customerStats.get(orgId) || { 
          name: org?.name || 'Unknown', 
          spent: 0, 
          count: 0 
        };
        existing.spent += parseFloat(order.total || 0);
        existing.count += 1;
        customerStats.set(orgId, existing);
      });

      const topCustomers = Array.from(customerStats.entries())
        .map(([id, stats]) => ({
          id,
          name: stats.name,
          total_spent: stats.spent,
          order_count: stats.count,
        }))
        .sort((a, b) => b.total_spent - a.total_spent)
        .slice(0, 5);

      setAnalytics({
        totalRevenue,
        totalOrders,
        totalCustomers,
        avgOrderValue,
        revenueGrowth,
        ordersGrowth,
        topProducts,
        topCustomers,
        recentOrders: (orders || []).slice(0, 10),
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading analytics...</div>
      </div>
    );
  }

  if (!isAdmin || !analytics) {
    return null;
  }

  const timeRangeOptions = [
    { value: '7', label: 'Last 7 Days' },
    { value: '30', label: 'Last 30 Days' },
    { value: '90', label: 'Last 90 Days' },
    { value: '365', label: 'Last Year' },
  ];

  return (
    <div className="mt-3 animate-fadeIn">
      {/* Header */}
      <Card className="mb-5 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-700 dark:text-white">
              Analytics Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Track your business performance and insights
            </p>
          </div>
          <div className="w-48">
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              options={timeRangeOptions}
            />
          </div>
        </div>
      </Card>

      {/* Key Metrics */}
      <div className="mb-5 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
              <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
                ${analytics.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className={`mt-1 text-xs font-semibold ${analytics.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {analytics.revenueGrowth >= 0 ? '↑' : '↓'} {Math.abs(analytics.revenueGrowth).toFixed(1)}% vs previous period
              </p>
            </div>
            <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/30">
              <FiDollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Orders</p>
              <p className="mt-1 text-2xl font-bold text-navy-700 dark:text-white">{analytics.totalOrders}</p>
              <p className={`mt-1 text-xs font-semibold ${analytics.ordersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {analytics.ordersGrowth >= 0 ? '↑' : '↓'} {Math.abs(analytics.ordersGrowth).toFixed(1)}% vs previous period
              </p>
            </div>
            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/30">
              <FiShoppingCart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Customers</p>
              <p className="mt-1 text-2xl font-bold text-navy-700 dark:text-white">{analytics.totalCustomers}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Unique customers</p>
            </div>
            <div className="rounded-full bg-purple-100 p-3 dark:bg-purple-900/30">
              <FiUsers className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Order Value</p>
              <p className="mt-1 text-2xl font-bold text-navy-700 dark:text-white">
                ${analytics.avgOrderValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Per order</p>
            </div>
            <div className="rounded-full bg-yellow-100 p-3 dark:bg-yellow-900/30">
              <FiTrendingUp className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Top Products & Customers */}
      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Top Products */}
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <FiPackage className="h-5 w-5 text-b2b-yellow" />
            <h2 className="text-lg font-bold text-navy-700 dark:text-white">Top Products</h2>
          </div>
          <div className="space-y-3">
            {analytics.topProducts.map((product, index) => (
              <div key={product.id} className="flex items-center justify-between border-b border-gray-200 pb-3 last:border-0 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-b2b-yellow/20 text-sm font-bold text-b2b-yellow">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-navy-700 dark:text-white">{product.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{product.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600 dark:text-green-400">
                    ${product.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{product.order_count} orders</p>
                </div>
              </div>
            ))}
            {analytics.topProducts.length === 0 && (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400">No product data available</p>
            )}
          </div>
        </Card>

        {/* Top Customers */}
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <FiUsers className="h-5 w-5 text-b2b-yellow" />
            <h2 className="text-lg font-bold text-navy-700 dark:text-white">Top Customers</h2>
          </div>
          <div className="space-y-3">
            {analytics.topCustomers.map((customer, index) => (
              <div key={customer.id} className="flex items-center justify-between border-b border-gray-200 pb-3 last:border-0 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-b2b-yellow/20 text-sm font-bold text-b2b-yellow">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-navy-700 dark:text-white">{customer.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{customer.order_count} orders</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600 dark:text-green-400">
                    ${customer.total_spent.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            ))}
            {analytics.topCustomers.length === 0 && (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400">No customer data available</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

