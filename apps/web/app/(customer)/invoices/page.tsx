'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Card, Button, Input, DataTable, PageHeader } from '@/components/b2b';
import { FiFileText, FiSearch, FiEye, FiDownload } from 'react-icons/fi';
import { format } from 'date-fns';
import { fadeIn, fast } from '@/lib/animations';

interface Invoice {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: string;
  total_amount: number;
  orders: {
    order_number: string;
    po_number?: string;
  };
}

const statusConfig: Record<string, { header: string; color: string }> = {
  unpaid: { header: 'Unpaid', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  paid: { header: 'Paid', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  overdue: { header: 'Overdue', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  cancelled: { header: 'Cancelled', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const response = await fetch('/api/invoices');
      if (!response.ok) throw new Error('Failed to fetch invoices');

      const data = await response.json();
      setInvoices(data);
    } catch (error) {
      console.error('Error loading invoices:', error);
      alert('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: 'invoice_number',
      header: 'Invoice #',
      render: (invoice: Invoice) => (
        <span className="font-mono font-semibold text-navy-700 dark:text-white">
          {invoice.invoice_number}
        </span>
      ),
    },
    {
      key: 'order_number',
      header: 'Order #',
      render: (invoice: Invoice) => (
        <span className="text-gray-700 dark:text-gray-300">{invoice.orders?.order_number}</span>
      ),
    },
    {
      key: 'issue_date',
      header: 'Issue Date',
      render: (invoice: Invoice) => format(new Date(invoice.issue_date), 'MMM d, yyyy'),
    },
    {
      key: 'due_date',
      header: 'Due Date',
      render: (invoice: Invoice) => format(new Date(invoice.due_date), 'MMM d, yyyy'),
    },
    {
      key: 'total_amount',
      header: 'Amount',
      render: (invoice: Invoice) => (
        <span className="font-bold text-brand-500">${invoice.total_amount.toFixed(2)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (invoice: Invoice) => {
        const config = statusConfig[invoice.status] || statusConfig.unpaid;
        return (
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${config.color}`}>
            {config.header}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (invoice: Invoice) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<FiEye />}
            onClick={() => router.push(`/invoices/${invoice.id}`)}
          >
            View
          </Button>
        </div>
      ),
    },
  ];

  const filteredInvoices = invoices.filter(
    (invoice) =>
      invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.orders?.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.orders?.po_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalAmount = filteredInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
  const unpaidAmount = filteredInvoices
    .filter((inv) => inv.status === 'unpaid' || inv.status === 'overdue')
    .reduce((sum, inv) => sum + inv.total_amount, 0);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading invoices...</div>
      </div>
    );
  }

  return (
    <div className="mt-3">
      {/* Header */}
      <Card className="mb-5 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600">
              <FiFileText className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-navy-700 dark:text-white">Invoices</h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                View and manage your invoices
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="mb-5 grid grid-cols-1 gap-5 md:grid-cols-3">
        <Card padding="lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Invoices</p>
              <p className="mt-1 text-2xl font-bold text-navy-700 dark:text-white">
                {filteredInvoices.length}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <FiFileText className="h-6 w-6 text-blue-500" />
            </div>
          </div>
        </Card>

        <Card padding="lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Amount</p>
              <p className="mt-1 text-2xl font-bold text-navy-700 dark:text-white">
                ${totalAmount.toFixed(2)}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <FiFileText className="h-6 w-6 text-green-500" />
            </div>
          </div>
        </Card>

        <Card padding="lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Unpaid Amount</p>
              <p className="mt-1 text-2xl font-bold text-navy-700 dark:text-white">
                ${unpaidAmount.toFixed(2)}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <FiFileText className="h-6 w-6 text-yellow-500" />
            </div>
          </div>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card padding="lg">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-navy-700 dark:text-white">All Invoices</h2>
          <div className="w-80">
            <Input
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<FiSearch />}
            />
          </div>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="py-12 text-center">
            <FiFileText className="mx-auto mb-3 h-16 w-16 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-400">
              {searchQuery ? 'No invoices found matching your search' : 'No invoices yet'}
            </p>
          </div>
        ) : (
          <DataTable data={filteredInvoices} columns={columns} />
        )}
      </Card>
    </div>
  );
}
