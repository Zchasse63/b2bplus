"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FiHome,
  FiShoppingCart,
  FiFileText,
  FiTrendingUp,
  FiBell,
  FiUser,
  FiSettings,
  FiMenu,
  FiX,
} from "react-icons/fi";

const customerRoutes = [
  {
    name: "Overview",
    path: "/dashboard",
    icon: FiHome,
  },
  {
    name: "Orders",
    path: "/orders",
    icon: FiShoppingCart,
  },
  {
    name: "Invoices",
    path: "/invoices",
    icon: FiFileText,
  },
  {
    name: "Analytics",
    path: "/analytics",
    icon: FiTrendingUp,
  },
  {
    name: "Notifications",
    path: "/notifications",
    icon: FiBell,
  },
  {
    name: "Profile",
    path: "/profile",
    icon: FiUser,
  },
  {
    name: "Settings",
    path: "/settings",
    icon: FiSettings,
  },
];

interface CustomerDashboardLayoutProps {
  children: React.ReactNode;
}

export default function CustomerDashboardLayout({
  children,
}: CustomerDashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (!pathname) return false;
    return pathname === path || pathname.startsWith(path + "/");
  };

  return (
    <div className="flex min-h-screen bg-b2b-gray-50">
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
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between border-b border-b2b-gray-100 px-6">
            <h1 className="text-xl font-bold text-b2b-dark">My Business</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-b2b-blue-300 rounded"
              aria-label="Close navigation"
            >
              <FiX className="h-6 w-6 text-b2b-gray-500" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto p-4">
            {customerRoutes.map((route) => {
              const Icon = route.icon;
              const active = isActive(route.path);
              return (
                <Link
                  key={route.path}
                  href={route.path}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-b2b-blue-300 focus-visible:ring-offset-2 ${
                    active
                      ? "bg-b2b-yellow text-b2b-dark"
                      : "text-b2b-gray-500 hover:bg-b2b-gray-50 hover:text-b2b-dark"
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
        <header className="flex h-16 items-center justify-between border-b border-b2b-gray-100 bg-white px-4 sm:px-6 shadow-b2b-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-b2b-blue-300 rounded"
              aria-label="Open navigation"
            >
              <FiMenu className="h-6 w-6 text-b2b-gray-500" />
            </button>
            <span className="hidden text-sm font-medium text-b2b-gray-600 sm:inline">
              Customer Dashboard
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link
              href="/products"
              className="text-b2b-gray-500 hover:text-b2b-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-b2b-blue-300 rounded px-2 py-1"
            >
              Products
            </Link>
            <Link
              href="/cart"
              className="text-b2b-gray-500 hover:text-b2b-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-b2b-blue-300 rounded px-2 py-1"
            >
              Cart
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

