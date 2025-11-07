'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAdmin } from '@/lib/hooks/useAdmin';
import { Card, Select } from '@/components/b2b';
import { FiFileText, FiTrendingUp, FiDollarSign, FiShoppingCart, FiUsers } from 'react-icons/fi';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ReportData {
  revenue_by_day: Array<{ date: string; revenue: number }>;
  orders_by_status: Array<{ status: string; count: number }>;
  top_categories: Array<{ category: string; revenue: number }>;
  customer_growth: Array<{ month: string; customers: number }>;
}

const COLORS = ['#FFC120', '#0ACF83', '#111012', '#BABABA', '#7F7F7F'];

export default function AdminReportsPage() {
  const router = useRouter();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');

  const loadReportData = useCallback(async () => {
    try {
      const supabase = createClient();
      const days = parseInt(timeRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Fetch orders
      const { data: orders } = await supabase
        .from('orders')
        .select('id, total, status, created_at')
        .gte('created_at', startDate.toISOString())
        .neq('status', 'cancelled');

      // Fetch order items with products
      const { data: orderItems } = await supabase
        .from('order_items')
        .select(`
          id, line_total,
          products (category)
        `)
        .in('order_id', (orders || []).map(o => o.id));

      // Process revenue by day
      const revenueByDay = new Map<string, number>();
      (orders || []).forEach(order => {
        const date = new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        revenueByDay.set(date, (revenueByDay.get(date) || 0) + parseFloat(order.total || 0));
      });

      // Process orders by status
      const ordersByStatus = new Map<string, number>();
      (orders || []).forEach(order => {
        ordersByStatus.set(order.status, (ordersByStatus.get(order.status) || 0) + 1);
      });

      // Process top categories
      const categoryRevenue = new Map<string, number>();
      interface OrderItemWithProduct {
        line_total: number;
        products?: {
          category: string;
        };
      }

      (orderItems || []).forEach((item: OrderItemWithProduct) => {
        const category = item.products?.category || 'Unknown';
        categoryRevenue.set(category, (categoryRevenue.get(category) || 0) + parseFloat(item.line_total || 0));
      });

      // Fetch customer growth
      const { data: customers } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', startDate.toISOString());

      const customerGrowth = new Map<string, number>();
      (customers || []).forEach(customer => {
        const month = new Date(customer.created_at).toLocaleDateString('en-US', { month: 'short' });
        customerGrowth.set(month, (customerGrowth.get(month) || 0) + 1);
      });

      setReportData({
        revenue_by_day: Array.from(revenueByDay.entries())
          .map(([date, revenue]) => ({ date, revenue }))
          .slice(-14), // Last 14 days
        orders_by_status: Array.from(ordersByStatus.entries())
          .map(([status, count]) => ({ status: status.charAt(0).toUpperCase() + status.slice(1), count })),
        top_categories: Array.from(categoryRevenue.entries())
          .map(([category, revenue]) => ({ category, revenue }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5),
        customer_growth: Array.from(customerGrowth.entries())
          .map(([month, customers]) => ({ month, customers })),
      });
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      router.push('/');
    } else if (isAdmin) {
      loadReportData();
    }
  }, [isAdmin, adminLoading, router, loadReportData]);

  if (adminLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading reports...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const timeRangeOptions = [
    { value: '7', label: 'Last 7 Days' },
    { value: '30', label: 'Last 30 Days' },
    { value: '90', label: 'Last 90 Days' },
    { value: '365', label: 'Last Year' },
  ];

  const totalRevenue = reportData?.revenue_by_day.reduce((sum, d) => sum + d.revenue, 0) || 0;
  const totalOrders = reportData?.orders_by_status.reduce((sum, s) => sum + s.count, 0) || 0;
  const totalCustomers = reportData?.customer_growth.reduce((sum, c) => sum + c.customers, 0) || 0;

  return (
    <div className="mt-3 animate-fadeIn">
      {/* Header Card */}
      <Card className="mb-5 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-700 dark:text-white">
              Reports & Analytics
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Visualize business performance and trends
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              options={timeRangeOptions}
            />
            <FiFileText className="h-12 w-12 text-b2b-yellow" />
          </div>
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="mb-5 grid grid-cols-1 gap-5 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
              <p className="mt-1 text-2xl font-bold text-navy-700 dark:text-white">
                ${totalRevenue.toFixed(2)}
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
              <p className="mt-1 text-2xl font-bold text-navy-700 dark:text-white">{totalOrders}</p>
            </div>
            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/30">
              <FiShoppingCart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">New Customers</p>
              <p className="mt-1 text-2xl font-bold text-navy-700 dark:text-white">{totalCustomers}</p>
            </div>
            <div className="rounded-full bg-purple-100 p-3 dark:bg-purple-900/30">
              <FiUsers className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Revenue Trend */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-bold text-navy-700 dark:text-white">
            Revenue Trend
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={reportData?.revenue_by_day || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#7f7f7f" />
              <YAxis stroke="#7f7f7f" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#0ACF83" strokeWidth={2} name="Revenue ($)" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Orders by Status */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-bold text-navy-700 dark:text-white">
            Orders by Status
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={reportData?.orders_by_status || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.status}: ${entry.count}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
              >
                {(reportData?.orders_by_status || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Top Categories */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-bold text-navy-700 dark:text-white">
            Top Categories by Revenue
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData?.top_categories || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="category" stroke="#7f7f7f" />
              <YAxis stroke="#7f7f7f" />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" fill="#FFC120" name="Revenue ($)" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Customer Growth */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-bold text-navy-700 dark:text-white">
            Customer Growth
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={reportData?.customer_growth || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#7f7f7f" />
              <YAxis stroke="#7f7f7f" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="customers" stroke="#111012" strokeWidth={2} name="New Customers" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

