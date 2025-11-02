'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Card from '@/components/horizon/card';
import { MdBarChart, MdAttachMoney, MdShoppingCart, MdPeople } from 'react-icons/md';

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
    <div className="mt-3 grid h-full grid-cols-1 gap-5 xl:grid-cols-2 2xl:grid-cols-4">
      {/* Total Revenue Card */}
      <Card extra="!flex-row flex-grow items-center rounded-[20px]">
        <div className="ml-[18px] flex h-[90px] w-auto flex-row items-center">
          <div className="rounded-full bg-lightPrimary p-3 dark:bg-navy-700">
            <span className="flex items-center text-brand-500 dark:text-white">
              <MdAttachMoney className="h-7 w-7" />
            </span>
          </div>
        </div>

        <div className="h-50 ml-4 flex w-auto flex-col justify-center">
          <p className="font-dm text-sm font-medium text-gray-600">Total Revenue</p>
          <h4 className="text-xl font-bold text-navy-700 dark:text-white">
            {loading ? '...' : `$${stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </h4>
        </div>
      </Card>

      {/* Total Orders Card */}
      <Card extra="!flex-row flex-grow items-center rounded-[20px]">
        <div className="ml-[18px] flex h-[90px] w-auto flex-row items-center">
          <div className="rounded-full bg-lightPrimary p-3 dark:bg-navy-700">
            <span className="flex items-center text-brand-500 dark:text-white">
              <MdShoppingCart className="h-6 w-6" />
            </span>
          </div>
        </div>

        <div className="h-50 ml-4 flex w-auto flex-col justify-center">
          <p className="font-dm text-sm font-medium text-gray-600">Total Orders</p>
          <h4 className="text-xl font-bold text-navy-700 dark:text-white">
            {loading ? '...' : stats.totalOrders.toLocaleString()}
          </h4>
        </div>
      </Card>

      {/* Total Customers Card */}
      <Card extra="!flex-row flex-grow items-center rounded-[20px]">
        <div className="ml-[18px] flex h-[90px] w-auto flex-row items-center">
          <div className="rounded-full bg-lightPrimary p-3 dark:bg-navy-700">
            <span className="flex items-center text-brand-500 dark:text-white">
              <MdPeople className="h-6 w-6" />
            </span>
          </div>
        </div>

        <div className="h-50 ml-4 flex w-auto flex-col justify-center">
          <p className="font-dm text-sm font-medium text-gray-600">Total Customers</p>
          <h4 className="text-xl font-bold text-navy-700 dark:text-white">
            {loading ? '...' : stats.totalCustomers.toLocaleString()}
          </h4>
        </div>
      </Card>

      {/* Average Order Value Card */}
      <Card extra="!flex-row flex-grow items-center rounded-[20px]">
        <div className="ml-[18px] flex h-[90px] w-auto flex-row items-center">
          <div className="rounded-full bg-lightPrimary p-3 dark:bg-navy-700">
            <span className="flex items-center text-brand-500 dark:text-white">
              <MdBarChart className="h-6 w-6" />
            </span>
          </div>
        </div>

        <div className="h-50 ml-4 flex w-auto flex-col justify-center">
          <p className="font-dm text-sm font-medium text-gray-600">Avg Order Value</p>
          <h4 className="text-xl font-bold text-navy-700 dark:text-white">
            {loading ? '...' : `$${stats.averageOrderValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </h4>
        </div>
      </Card>

      {/* Welcome Card */}
      <Card extra="col-span-1 xl:col-span-2 2xl:col-span-4 rounded-[20px] p-6">
        <div className="mb-4">
          <h3 className="text-2xl font-bold text-navy-700 dark:text-white">
            Welcome to B2B+ Admin Dashboard
          </h3>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
            Manage your products, orders, customers, and analytics from this central hub.
          </p>
        </div>
        
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 p-4 text-white">
            <h4 className="text-lg font-bold">Quick Actions</h4>
            <p className="mt-2 text-sm opacity-90">Add products, create orders, manage inventory</p>
          </div>
          
          <div className="rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 p-4 text-white">
            <h4 className="text-lg font-bold">Analytics</h4>
            <p className="mt-2 text-sm opacity-90">View sales trends, customer insights, revenue reports</p>
          </div>
          
          <div className="rounded-lg bg-gradient-to-br from-green-400 to-green-600 p-4 text-white">
            <h4 className="text-lg font-bold">Settings</h4>
            <p className="mt-2 text-sm opacity-90">Configure pricing, shipping, taxes, and more</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
