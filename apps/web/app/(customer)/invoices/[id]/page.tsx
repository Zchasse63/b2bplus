'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Card, Button, DataTable, PageHeader } from '@/components/b2b';
import { FiArrowLeft, FiDownload, FiCheckCircle, FiFileText } from 'react-icons/fi';
import { format } from 'date-fns';
import { fadeIn, fast } from '@/lib/animations';

interface InvoiceDetails {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  total_amount: number;
  paid_at?: string;
  orders: {
    id: string;
    order_number: string;
    po_number?: string;
    order_items: Array<{
      id: string;
      quantity: number;
      unit_price: number;
      line_total: number;
      sku: string;
      name: string;
    }>;
  };
  organizations: {
    name: string;
    email?: string;
    phone?: string;
  };
  shipping_address?: {
    contact_name: string;
    street_address: string;
    street_address2?: string;
    city: string;
    state: string;
    postal_code: string;
    phone: string;
  };
}

const statusConfig: Record<string, { header: string; color: string }> = {
  unpaid: { header: 'Unpaid', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  paid: { header: 'Paid', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  overdue: { header: 'Overdue', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  cancelled: { header: 'Cancelled', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
};

export default function InvoiceDetailsPage({ params }: { params: { id: string } }) {
  const [invoice, setInvoice] = useState<InvoiceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    loadInvoice();
  }, [params.id]);

  const loadInvoice = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const response = await fetch(`/api/invoices/${params.id}`);
      if (!response.ok) throw new Error('Failed to fetch invoice');

      const data = await response.json();
      setInvoice(data);
    } catch (error) {
      console.error('Error loading invoice:', error);
      alert('Failed to load invoice');
      router.push('/invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);

    try {
      const response = await fetch(`/api/invoices/${params.id}/pdf`);
      if (!response.ok) throw new Error('Failed to generate PDF');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoice?.invoice_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading invoice...</div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-gray-600 dark:text-gray-400">Invoice not found</div>
      </div>
    );
  }

  const statusInfo = statusConfig[invoice.status] || statusConfig.unpaid;

  const columns = [
    { key: 'sku', header: 'SKU' },
    { key: 'name', header: 'Product' },
    {
      key: 'quantity',
      header: 'Quantity',
      render: (item: any) => <span className="font-semibold">{item.quantity}</span>,
    },
    {
      key: 'unit_price',
      header: 'Unit Price',
      render: (item: any) => `$${item.unit_price.toFixed(2)}`,
    },
    {
      key: 'line_total',
      header: 'Total',
      render: (item: any) => (
        <span className="font-bold text-brand-500">${item.line_total.toFixed(2)}</span>
      ),
    },
  ];

  return (
    <div className="mt-3">
      {/* Header */}
      <Card className="mb-5 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              icon={<FiArrowLeft />}
              onClick={() => router.push('/invoices')}
            />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-navy-700 dark:text-white">
                  Invoice #{invoice.invoice_number}
                </h1>
                <span className={`rounded-full px-4 py-1 text-sm font-semibold ${statusInfo.color}`}>
                  {statusInfo.header}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Order #{invoice.orders.order_number}
                {invoice.orders.po_number && ` • PO: ${invoice.orders.po_number}`}
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            icon={<FiDownload />}
            onClick={handleDownloadPDF}
            loading={downloading}
          >
            Download PDF
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Invoice Items */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h2 className="mb-4 text-xl font-bold text-navy-700 dark:text-white">Line Items</h2>
            <DataTable
              data={invoice.orders.order_items}
              columns={columns}
             
             
            />
          </Card>
        </div>

        {/* Invoice Details */}
        <div className="space-y-5">
          {/* Invoice Summary */}
          <Card className="p-6">
            <h2 className="mb-4 text-xl font-bold text-navy-700 dark:text-white">Summary</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Issue Date</p>
                <p className="font-semibold text-navy-700 dark:text-white">
                  {format(new Date(invoice.issue_date), 'MMM d, yyyy')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Due Date</p>
                <p className="font-semibold text-navy-700 dark:text-white">
                  {format(new Date(invoice.due_date), 'MMM d, yyyy')}
                </p>
              </div>
              {invoice.paid_at && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Paid Date</p>
                  <p className="font-semibold text-green-600 dark:text-green-400">
                    {format(new Date(invoice.paid_at), 'MMM d, yyyy')}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Amount Breakdown */}
          <Card className="p-6">
            <h2 className="mb-4 text-xl font-bold text-navy-700 dark:text-white">Amount</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-gray-700 dark:text-gray-300">
                <span>Subtotal</span>
                <span>${invoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-700 dark:text-gray-300">
                <span>Tax</span>
                <span>${invoice.tax_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-700 dark:text-gray-300">
                <span>Shipping</span>
                <span>${invoice.shipping_amount.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-200 pt-3 dark:border-white/10">
                <div className="flex justify-between text-lg font-bold text-navy-700 dark:text-white">
                  <span>Total</span>
                  <span className="text-brand-500">${invoice.total_amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Billing Info */}
          <Card className="p-6">
            <h2 className="mb-4 text-xl font-bold text-navy-700 dark:text-white">Bill To</h2>
            <div className="space-y-2 text-gray-700 dark:text-gray-300">
              <p className="font-semibold">{invoice.organizations.name}</p>
              {invoice.organizations.email && <p>{invoice.organizations.email}</p>}
              {invoice.organizations.phone && <p>{invoice.organizations.phone}</p>}
            </div>
          </Card>

          {/* Shipping Address */}
          {invoice.shipping_address && (
            <Card className="p-6">
              <h2 className="mb-4 text-xl font-bold text-navy-700 dark:text-white">Ship To</h2>
              <div className="space-y-2 text-gray-700 dark:text-gray-300">
                <p className="font-semibold">{invoice.shipping_address.contact_name}</p>
                <p>{invoice.shipping_address.phone}</p>
                <p>{invoice.shipping_address.street_address}</p>
                {invoice.shipping_address.street_address2 && (
                  <p>{invoice.shipping_address.street_address2}</p>
                )}
                <p>
                  {invoice.shipping_address.city}, {invoice.shipping_address.state}{' '}
                  {invoice.shipping_address.postal_code}
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
