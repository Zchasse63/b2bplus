'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, StatCard, PageHeader } from '@/components/b2b';
import { FiTrendingUp, FiDollarSign, FiShoppingCart, FiUsers } from 'react-icons/fi';

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  averageOrderValue: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    averageOrderValue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  async function loadDashboardStats() {
    const supabase = createClient();

    try {
      // Get total orders and revenue
      const { data: orders } = await supabase
        .from('orders')
        .select('total');

      const totalRevenue = orders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
      const totalOrders = orders?.length || 0;

      // Get total customers
      const { count: customerCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      setStats({
        totalRevenue,
        totalOrders,
        totalCustomers: customerCount || 0,
        averageOrderValue,
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="Overview of your B2B platform" />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue Card */}
        <StatCard
          title="Total Revenue"
          value={loading ? '...' : `$${stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<FiDollarSign className="h-6 w-6" />}
        />

        {/* Total Orders Card */}
        <StatCard
          title="Total Orders"
          value={loading ? '...' : stats.totalOrders.toLocaleString()}
          icon={<FiShoppingCart className="h-6 w-6" />}
        />

        {/* Total Customers Card */}
        <StatCard
          title="Total Customers"
          value={loading ? '...' : stats.totalCustomers.toLocaleString()}
          icon={<FiUsers className="h-6 w-6" />}
        />

        {/* Average Order Value Card */}
        <StatCard
          title="Avg Order Value"
          value={loading ? '...' : `$${stats.averageOrderValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<FiTrendingUp className="h-6 w-6" />}
        />
      </div>

      {/* Welcome Card */}
      <Card padding="lg" className="mt-6">
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-b2b-dark">
            Welcome to B2B+ Admin Dashboard
          </h3>
          <p className="mt-2 text-base text-b2b-gray-500">
            Manage your products, orders, customers, and analytics from this central hub.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-b2b-yellow bg-opacity-10 border border-b2b-yellow p-4">
            <h4 className="text-lg font-bold text-b2b-dark">Quick Actions</h4>
            <p className="mt-2 text-sm text-b2b-gray-500">Add products, create orders, manage inventory</p>
          </div>

          <div className="rounded-lg bg-b2b-green bg-opacity-10 border border-b2b-green p-4">
            <h4 className="text-lg font-bold text-b2b-dark">Analytics</h4>
            <p className="mt-2 text-sm text-b2b-gray-500">View sales trends, customer insights, revenue reports</p>
          </div>

          <div className="rounded-lg bg-b2b-gray-100 border border-b2b-gray-300 p-4">
            <h4 className="text-lg font-bold text-b2b-dark">Settings</h4>
            <p className="mt-2 text-sm text-b2b-gray-500">Configure pricing, shipping, taxes, and more</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
