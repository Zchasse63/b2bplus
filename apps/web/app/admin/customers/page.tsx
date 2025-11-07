'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAdmin } from '@/lib/hooks/useAdmin';
import { DataTable, Button, Card, Badge, Input } from '@/components/b2b';
import { FiUsers, FiMail, FiPhone, FiMapPin, FiDollarSign, FiShoppingCart, FiSearch } from 'react-icons/fi';

interface Customer {
  id: string;
  name: string;
  slug: string;
  type: 'distributor' | 'restaurant' | 'hotel' | 'hospital' | 'school';
  phone: string | null;
  website: string | null;
  created_at: string;
  total_orders?: number;
  total_spent?: number;
}

const typeColors: Record<string, string> = {
  distributor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  restaurant: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  hotel: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  hospital: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  school: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
};

export default function AdminCustomersPage() {
  const router = useRouter();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      router.push('/');
    } else if (isAdmin) {
      loadCustomers();
    }
  }, [isAdmin, adminLoading, router, page]);

  const loadCustomers = async () => {
    try {
      // Use optimized endpoint that avoids N+1 queries with pagination
      const response = await fetch(`/api/admin/customers/stats?page=${page}&pageSize=${pageSize}`);

      if (!response.ok) {
        throw new Error('Failed to fetch customer stats');
      }

      const data = await response.json();

      if (data.success && data.customers) {
        setCustomers(data.customers);
        if (data.pagination) {
          setTotalCount(data.pagination.totalCount);
        }
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns = [
    {
      key: 'name',
      header: 'Customer Name',
      render: (customer: Customer) => (
        <div>
          <div className="font-semibold text-navy-700 dark:text-white">{customer.name}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{customer.slug}</div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (customer: Customer) => (
        <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${typeColors[customer.type]}`}>
          {customer.type}
        </span>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (customer: Customer) => (
        <div className="space-y-1 text-sm">
          {customer.phone && (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <FiPhone className="h-3 w-3" />
              {customer.phone}
            </div>
          )}
          {customer.website && (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <FiMapPin className="h-3 w-3" />
              <a href={customer.website} target="_blank" rel="noopener noreferrer" className="hover:text-b2b-yellow">
                Website
              </a>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'orders',
      header: 'Total Orders',
      render: (customer: Customer) => (
        <div className="flex items-center gap-2">
          <FiShoppingCart className="h-4 w-4 text-gray-500" />
          <span className="font-semibold">{customer.total_orders || 0}</span>
        </div>
      ),
    },
    {
      key: 'spent',
      header: 'Total Spent',
      render: (customer: Customer) => (
        <div className="flex items-center gap-2">
          <FiDollarSign className="h-4 w-4 text-green-500" />
          <span className="font-semibold text-green-600 dark:text-green-400">
            ${(customer.total_spent || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      ),
    },
    {
      key: 'created',
      header: 'Member Since',
      render: (customer: Customer) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {new Date(customer.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
        </span>
      ),
    },
  ];

  if (adminLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  // Calculate summary stats
  const totalCustomers = customers.length;
  const totalRevenue = customers.reduce((sum, c) => sum + (c.total_spent || 0), 0);
  const totalOrders = customers.reduce((sum, c) => sum + (c.total_orders || 0), 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return (
    <div className="mt-3 animate-fadeIn">
      {/* Header Card */}
      <Card className="mb-5 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-700 dark:text-white">
              Customer Management
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              View and manage your customer accounts
            </p>
          </div>
          <FiUsers className="h-12 w-12 text-b2b-yellow" />
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="mb-5 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Customers</p>
              <p className="mt-1 text-2xl font-bold text-navy-700 dark:text-white">{totalCustomers}</p>
            </div>
            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/30">
              <FiUsers className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
              <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
                ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
            <div className="rounded-full bg-purple-100 p-3 dark:bg-purple-900/30">
              <FiShoppingCart className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Order Value</p>
              <p className="mt-1 text-2xl font-bold text-navy-700 dark:text-white">
                ${avgOrderValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-full bg-yellow-100 p-3 dark:bg-yellow-900/30">
              <FiDollarSign className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card className="mb-5 p-4">
        <Input
          placeholder="Search customers by name, slug, or type..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={<FiSearch />}
        />
      </Card>

      {/* Customers Table */}
      {filteredCustomers.length === 0 ? (
        <Card className="p-12 text-center">
          <FiUsers className="mx-auto mb-3 h-16 w-16 text-gray-400" />
          <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            {searchQuery ? 'No customers found' : 'No customers yet'}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchQuery ? 'Try adjusting your search query' : 'Customers will appear here once they sign up'}
          </p>
        </Card>
      ) : (
        <>
          <DataTable data={filteredCustomers} columns={columns} />

          {/* Pagination Controls */}
          {!searchQuery && totalCount > pageSize && (
            <Card className="mt-5 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} customers
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.ceil(totalCount / pageSize) }, (_, i) => i + 1)
                      .filter(p => {
                        // Show first page, last page, current page, and pages around current
                        return p === 1 ||
                               p === Math.ceil(totalCount / pageSize) ||
                               (p >= page - 1 && p <= page + 1);
                      })
                      .map((p, i, arr) => {
                        // Add ellipsis if there's a gap
                        const showEllipsis = i > 0 && p - arr[i - 1] > 1;
                        return (
                          <div key={p} className="flex items-center gap-1">
                            {showEllipsis && <span className="px-2 text-gray-400">...</span>}
                            <Button
                              variant={p === page ? 'primary' : 'ghost'}
                              size="sm"
                              onClick={() => setPage(p)}
                              className="min-w-[40px]"
                            >
                              {p}
                            </Button>
                          </div>
                        );
                      })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= Math.ceil(totalCount / pageSize)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

