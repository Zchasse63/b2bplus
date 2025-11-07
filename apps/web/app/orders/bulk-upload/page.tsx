'use client';

import { useState } from 'react';
import { Card, Button, DataTable, Modal, PageHeader } from '@/components/b2b';
import { toast } from '@/hooks/use-toast';
import {
  FiUpload,
  FiUploadCloud,
  FiCheckCircle,
  FiXCircle,
  FiAlertTriangle,
  FiDownload,
  FiShoppingCart,
} from 'react-icons/fi';
import { useRouter } from 'next/navigation';

interface OrderItem {
  sku: string;
  quantity: number;
  product_name?: string;
  unit_price?: number;
  total_price?: number;
  status: 'valid' | 'invalid' | 'warning';
  error?: string;
}

interface OrderPreview {
  items: OrderItem[];
  total_items: number;
  total_amount: number;
  valid_items: number;
  invalid_items: number;
}

export default function BulkOrderUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<OrderPreview | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/orders/bulk-upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process file');
      }

      const data = await response.json();
      setPreview(data.preview);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to process CSV file';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitOrder = async () => {
    if (!preview || preview.invalid_items > 0) {
      toast({
        title: 'Validation Error',
        description: 'Please fix all errors before submitting the order',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/orders/bulk-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: preview.items }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit order');
      }

      const data = await response.json();
      setSuccessModal(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to submit order';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = 'SKU,Quantity\nEXAMPLE-001,100\nEXAMPLE-002,50';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk-order-template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const statusIcons = {
    valid: <FiCheckCircle className="h-5 w-5 text-green-500" />,
    invalid: <FiXCircle className="h-5 w-5 text-red-500" />,
    warning: <FiAlertTriangle className="h-5 w-5 text-yellow-500" />,
  };

  const columns = [
    {
      key: 'status',
      header: 'Status',
      render: (item: OrderItem) => statusIcons[item.status],
    },
    { key: 'sku', header: 'SKU' },
    {
      key: 'product_name',
      header: 'Product',
      render: (item: OrderItem) => item.product_name || '-',
    },
    {
      key: 'quantity',
      header: 'Quantity',
      render: (item: OrderItem) => <span className="font-semibold">{item.quantity}</span>,
    },
    {
      key: 'unit_price',
      header: 'Unit Price',
      render: (item: OrderItem) =>
        item.unit_price ? `$${item.unit_price.toFixed(2)}` : '-',
    },
    {
      key: 'total_price',
      header: 'Total',
      render: (item: OrderItem) =>
        item.total_price ? (
          <span className="font-bold text-brand-500">${item.total_price.toFixed(2)}</span>
        ) : (
          '-'
        ),
    },
    {
      key: 'error',
      header: 'Notes',
      render: (item: OrderItem) =>
        item.error ? <span className="text-sm text-red-600">{item.error}</span> : '-',
    },
  ];

  return (
    <div className="mt-3 animate-fadeIn">
      {/* Header */}
      <Card className="mb-5 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600">
              <FiUploadCloud className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-navy-700 dark:text-white">
                Bulk Order Upload
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Upload a CSV file to create orders in bulk
              </p>
            </div>
          </div>
          <Button variant="outline" icon={<FiDownload />} onClick={downloadTemplate}>
            Download Template
          </Button>
        </div>
      </Card>

      {/* Upload Section */}
      <Card className="mb-5 p-6">
        <h2 className="mb-4 text-xl font-bold text-navy-700 dark:text-white">Upload CSV File</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="flex-1">
              <div className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-gray-300 p-6 transition-colors hover:border-brand-500 dark:border-gray-600">
                <FiUpload className="h-8 w-8 text-gray-400" />
                <div>
                  <p className="font-semibold text-navy-700 dark:text-white">
                    {file ? file.name : 'Choose a CSV file'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    CSV format with SKU and Quantity columns
                  </p>
                </div>
              </div>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            <Button
              variant="primary"
              icon={<FiUpload />}
              onClick={handleUpload}
              loading={uploading}
              disabled={!file}
            >
              Process File
            </Button>
          </div>

          {/* Instructions */}
          <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
            <h3 className="mb-2 font-semibold text-blue-900 dark:text-blue-300">
              CSV Format Instructions:
            </h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-blue-800 dark:text-blue-400">
              <li>First row must contain headers: SKU, Quantity</li>
              <li>Each subsequent row represents one product</li>
              <li>SKU must match existing products in the system</li>
              <li>Quantity must be a positive number</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Preview Section */}
      {preview && (
        <>
          {/* Summary Cards */}
          <div className="mb-5 grid grid-cols-1 gap-5 md:grid-cols-4">
            <Card padding="lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Items</p>
                  <p className="mt-1 text-2xl font-bold text-navy-700 dark:text-white">
                    {preview.total_items}
                  </p>
                </div>
                <FiUploadCloud className="h-8 w-8 text-gray-400" />
              </div>
            </Card>

            <Card padding="lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Valid Items</p>
                  <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
                    {preview.valid_items}
                  </p>
                </div>
                <FiCheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </Card>

            <Card padding="lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Invalid Items</p>
                  <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
                    {preview.invalid_items}
                  </p>
                </div>
                <FiXCircle className="h-8 w-8 text-red-500" />
              </div>
            </Card>

            <Card padding="lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Amount</p>
                  <p className="mt-1 text-2xl font-bold text-brand-500">
                    ${preview.total_amount.toFixed(2)}
                  </p>
                </div>
                <FiShoppingCart className="h-8 w-8 text-brand-500" />
              </div>
            </Card>
          </div>

          {/* Items Table */}
          <Card padding="lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-navy-700 dark:text-white">Order Preview</h2>
              <Button
                variant="primary"
                icon={<FiShoppingCart />}
                onClick={handleSubmitOrder}
                loading={submitting}
                disabled={preview.invalid_items > 0}
              >
                Submit Order
              </Button>
            </div>

            {preview.invalid_items > 0 && (
              <div className="mb-4 rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                <p className="text-sm text-red-800 dark:text-red-400">
                  ⚠️ Please fix {preview.invalid_items} invalid item(s) before submitting
                </p>
              </div>
            )}

            <DataTable data={preview.items} columns={columns} />
          </Card>
        </>
      )}

      {/* Success Modal */}
      <Modal
        isOpen={successModal}
        onClose={() => {
          setSuccessModal(false);
          router.push('/orders');
        }}
        title="Order Submitted!"
        size="sm"
      >
        <div className="space-y-4 text-center">
          <FiCheckCircle className="mx-auto h-16 w-16 text-green-500" />
          <p className="text-gray-700 dark:text-gray-300">
            Your bulk order has been submitted successfully!
          </p>
          <Button
            variant="primary"
            className="w-full"
            onClick={() => router.push('/orders')}
          >
            View Orders
          </Button>
        </div>
      </Modal>
    </div>
  );
}
