'use client';

import Link from 'next/link';
import { PageHeader, Card, Button } from '@/components/b2b';
import CustomerDashboardLayout from '@/components/CustomerDashboardLayout';
import { FiShoppingCart, FiFileText, FiTrendingUp } from 'react-icons/fi';
import { EmbeddedAIAssistantPanel } from '@/components/EmbeddedAIAssistantPanel';

export default function DashboardPage() {
  return (
    <CustomerDashboardLayout>
      <div className="bg-b2b-gray-50 py-8">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 xl:grid-cols-4">
            {/* Main dashboard content */}
            <div className="space-y-6 lg:col-span-2 xl:col-span-3">
              <PageHeader
                title="Dashboard Overview"
                subtitle="See a quick snapshot of your business activity and jump into key workflows."
              />

              {/* Key metrics overview (lightweight for now; detailed analytics live on /analytics) */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card padding="lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-b2b-gray-500">Orders</p>
                      <p className="mt-1 text-xl font-bold text-b2b-dark">Recent activity</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-b2b-blue/10">
                      <FiShoppingCart className="h-5 w-5 text-b2b-blue" />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-between text-sm">
                    <span className="text-b2b-gray-500">View your order history</span>
                    <Link href="/orders" className="font-medium text-b2b-blue hover:underline">
                      Open
                    </Link>
                  </div>
                </Card>

                <Card padding="lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-b2b-gray-500">Invoices</p>
                      <p className="mt-1 text-xl font-bold text-b2b-dark">Billing & payments</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                      <FiFileText className="h-5 w-5 text-emerald-500" />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-between text-sm">
                    <span className="text-b2b-gray-500">Review open and past invoices</span>
                    <Link href="/invoices" className="font-medium text-b2b-blue hover:underline">
                      Open
                    </Link>
                  </div>
                </Card>

                <Card padding="lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-b2b-gray-500">Analytics</p>
                      <p className="mt-1 text-xl font-bold text-b2b-dark">Spending trends</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                      <FiTrendingUp className="h-5 w-5 text-amber-500" />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-between text-sm">
                    <span className="text-b2b-gray-500">Dig into detailed analytics</span>
                    <Link href="/analytics" className="font-medium text-b2b-blue hover:underline">
                      Open
                    </Link>
                  </div>
                </Card>
              </div>

              {/* Quick links section */}
              <Card padding="lg">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-b2b-dark">Next steps</h2>
                    <p className="mt-1 text-sm text-b2b-gray-500">
                      Continue shopping, review recent activity, or update your account details.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button asChild variant="primary" size="sm">
                      <Link href="/products">Browse products</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href="/orders">View orders</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href="/profile">Account settings</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href="/tools/container-calculator">Container calculator</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href="/chat">Open full AI assistant</Link>
                    </Button>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right column - dashboard AI assistant */}
            <div className="lg:col-span-1 xl:col-span-1">
              <EmbeddedAIAssistantPanel mode="dashboard" />
            </div>
          </div>
        </div>
      </div>
    </CustomerDashboardLayout>
  );
}
