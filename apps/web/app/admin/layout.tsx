'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FiHome,
  FiShoppingCart,
  FiUsers,
  FiTrendingUp,
  FiPackage,
  FiTruck,
  FiSettings,
  FiFileText,
  FiMenu,
  FiX,
  FiTarget,
  FiBarChart2,
  FiDollarSign,
  FiUserCheck,
  FiActivity
} from 'react-icons/fi';

// Define admin routes for B2B+ platform
const routes = [
  {
    name: 'Dashboard',
    path: '/admin',
    icon: FiHome,
  },
  {
    name: 'Products',
    path: '/admin/products',
    icon: FiPackage,
  },
  {
    name: 'Orders',
    path: '/admin/orders',
    icon: FiShoppingCart,
  },
  {
    name: 'Customers',
    path: '/admin/customers',
    icon: FiUsers,
  },
  {
    name: 'Analytics',
    path: '/admin/analytics',
    icon: FiTrendingUp,
  },
  {
    name: 'Opportunities',
    path: '/admin/opportunities',
    icon: FiTarget,
  },
  {
    name: 'Forecasts',
    path: '/admin/forecasts',
    icon: FiBarChart2,
  },
  {
    name: 'Pricing',
    path: '/admin/pricing/recommendations',
    icon: FiDollarSign,
  },
  {
    name: 'Registrations',
    path: '/admin/registrations',
    icon: FiUserCheck,
  },
  {
    name: 'Invoices',
    path: '/admin/invoices',
    icon: FiFileText,
  },
  {
    name: 'Shipping',
    path: '/admin/shipping',
    icon: FiTruck,
  },
  {
    name: 'Monitoring',
    path: '/admin/monitoring',
    icon: FiActivity,
  },
  {
    name: 'Settings',
    path: '/admin/settings',
    icon: FiSettings,
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-b2b-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white shadow-b2b transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between border-b border-b2b-gray-100 px-6">
            <h1 className="text-xl font-bold text-b2b-dark">B2B+ Admin</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-b2b-blue-300 rounded"
              aria-label="Close sidebar"
            >
              <FiX className="h-6 w-6 text-b2b-gray-500" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto p-4">
            {routes.map((route) => {
              const Icon = route.icon;
              const isActive = pathname === route.path;
              return (
                <Link
                  key={route.path}
                  href={route.path}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-b2b-blue-300 focus-visible:ring-offset-2 ${
                    isActive
                      ? 'bg-b2b-yellow text-b2b-dark'
                      : 'text-b2b-gray-500 hover:bg-b2b-gray-50 hover:text-b2b-dark'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  {route.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b border-b2b-gray-100 bg-white px-6 shadow-b2b-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-b2b-blue-300 rounded"
            aria-label="Open sidebar"
          >
            <FiMenu className="h-6 w-6 text-b2b-gray-500" />
          </button>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm text-b2b-gray-500 hover:text-b2b-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-b2b-blue-300 rounded px-2 py-1"
            >
              View Site
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
