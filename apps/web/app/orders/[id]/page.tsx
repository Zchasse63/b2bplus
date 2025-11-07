'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Card, Button, DataTable, Modal, PageHeader } from '@/components/b2b';
import { toast } from '@/hooks/use-toast';
import {
  FiArrowLeft,
  FiShoppingCart,
  FiTruck,
  FiCheckCircle,
  FiFileText,
  FiCopy,
} from 'react-icons/fi';
import { format } from 'date-fns';

interface OrderItem {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

interface ShippingAddress {
  header: string;
  contact_name: string;
  phone: string;
  street_address: string;
  street_address2?: string;
  city: string;
  state: string;
  postal_code: string;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  subtotal: number;
  tax: number;
  shipping_cost: number;
  total: number;
  po_number?: string;
  notes?: string;
  submitted_at: string;
  shipped_at?: string;
  delivered_at?: string;
  shipping_tracking_number?: string;
  shipping_carrier?: string;
  created_at: string;
  order_items: OrderItem[];
  shipping_addresses: ShippingAddress;
}

const statusConfig: Record<string, { header: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  draft: { header: 'Draft', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300', icon: FiShoppingCart },
  submitted: { header: 'Submitted', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: FiFileText },
  processing: { header: 'Processing', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: FiShoppingCart },
  shipped: { header: 'Shipped', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400', icon: FiTruck },
  delivered: { header: 'Delivered', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: FiCheckCircle },
  cancelled: { header: 'Cancelled', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: FiArrowLeft },
};

export default function OrderDetailsPage({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [hasInvoice, setHasInvoice] = useState(false);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [reorderModal, setReorderModal] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const loadOrder = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/login');
      return;
    }

    const { data, error } = await supabase
      .from('orders')
      .select(
        `
        *,
        order_items (
          id,
          product_id,
          quantity,
          unit_price,
          line_total,
          products (sku, name)
        ),
        shipping_addresses (*)
      `
      )
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      console.error('Error loading order:', error);
      router.push('/orders');
      return;
    }

    interface RawOrderItem {
      id: string;
      quantity: number;
      unit_price: number;
      line_total: number;
      products: {
        sku: string;
        name: string;
      };
    }

    const formattedOrder: Order = {
      ...data,
      order_items: data.order_items.map((item: RawOrderItem) => ({
        id: item.id,
        sku: item.products.sku,
        name: item.products.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.line_total,
      })),
    };

    setOrder(formattedOrder);
    setLoading(false);
  }, [params.id, router, supabase]);

  const checkInvoice = useCallback(async () => {
    const { data } = await supabase
      .from('invoices')
      .select('id')
      .eq('order_id', params.id)
      .maybeSingle();

    if (data) {
      setHasInvoice(true);
      setInvoiceId(data.id);
    }
  }, [params.id, supabase]);

  useEffect(() => {
    loadOrder();
    checkInvoice();
  }, [loadOrder, checkInvoice]);

  async function handleReorder() {
    if (!order) return;

    setReordering(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      for (const item of order.order_items) {
        const { data: product } = await supabase
          .from('products')
          .select('id')
          .eq('sku', item.sku)
          .single();

        if (product) {
          await supabase.from('cart_items').upsert(
            {
              user_id: user.id,
              product_id: product.id,
              quantity: item.quantity,
            },
            { onConflict: 'user_id,product_id' }
          );
        }
      }

      setReorderModal(true);
    } catch (error) {
      console.error('Error reordering:', error);
      toast({
        title: 'Error',
        description: 'Failed to add items to cart',
        variant: 'destructive',
      });
    } finally {
      setReordering(false);
    }
  }

  async function handleGenerateInvoice() {
    setGeneratingInvoice(true);

    try {
      const response = await fetch('/api/invoices/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: params.id }),
      });

      if (!response.ok) throw new Error('Failed to generate invoice');

      const { invoiceId: newInvoiceId } = await response.json();
      setHasInvoice(true);
      setInvoiceId(newInvoiceId);
      router.push(`/invoices/${newInvoiceId}`);
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate invoice',
        variant: 'destructive',
      });
    } finally {
      setGeneratingInvoice(false);
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading order...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-gray-600 dark:text-gray-400">Order not found</div>
      </div>
    );
  }

  const statusInfo = statusConfig[order.status] || statusConfig.draft;
  const StatusIcon = statusInfo.icon;

  const columns = [
    { key: 'sku', header: 'SKU' },
    { key: 'name', header: 'Product' },
    {
      key: 'quantity',
      header: 'Quantity',
      render: (item: OrderItem) => <span className="font-semibold">{item.quantity}</span>,
    },
    {
      key: 'unit_price',
      header: 'Unit Price',
      render: (item: OrderItem) => `$${item.unit_price.toFixed(2)}`,
    },
    {
      key: 'line_total',
      header: 'Total',
      render: (item: OrderItem) => (
        <span className="font-bold text-brand-500">${item.line_total.toFixed(2)}</span>
      ),
    },
  ];

  return (
    <div className="mt-3 animate-fadeIn">
      {/* Header */}
      <Card className="mb-5 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              icon={<FiArrowLeft />}
              onClick={() => router.push('/orders')}
            />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-navy-700 dark:text-white">
                  Order #{order.order_number}
                </h1>
                <div className={`flex items-center gap-2 rounded-full px-4 py-1 text-sm font-semibold ${statusInfo.color}`}>
                  <StatusIcon className="h-4 w-4" />
                  {statusInfo.header}
                </div>
              </div>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Placed on {format(new Date(order.created_at), 'MMMM d, yyyy')}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            {hasInvoice && invoiceId && (
              <Button
                variant="outline"
                icon={<FiFileText />}
                onClick={() => router.push(`/invoices/${invoiceId}`)}
              >
                View Invoice
              </Button>
            )}
            {!hasInvoice && order.status !== 'draft' && (
              <Button
                variant="outline"
                icon={<FiFileText />}
                onClick={handleGenerateInvoice}
                loading={generatingInvoice}
              >
                Generate Invoice
              </Button>
            )}
            <Button variant="primary" icon={<FiShoppingCart />} onClick={handleReorder} loading={reordering}>
              Reorder
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Order Items */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h2 className="mb-4 text-xl font-bold text-navy-700 dark:text-white">Order Items</h2>
            <DataTable
              data={order.order_items}
              columns={columns}
            />
          </Card>
        </div>

        {/* Order Summary & Details */}
        <div className="space-y-5">
          {/* Order Summary */}
          <Card className="p-6">
            <h2 className="mb-4 text-xl font-bold text-navy-700 dark:text-white">Order Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-gray-700 dark:text-gray-300">
                <span>Subtotal</span>
                <span>${order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-700 dark:text-gray-300">
                <span>Tax</span>
                <span>${order.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-700 dark:text-gray-300">
                <span>Shipping</span>
                <span>${order.shipping_cost.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-200 pt-3 dark:border-white/10">
                <div className="flex justify-between text-lg font-bold text-navy-700 dark:text-white">
                  <span>Total</span>
                  <span className="text-brand-500">${order.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Shipping Address */}
          {order.shipping_addresses && (
            <Card className="p-6">
              <h2 className="mb-4 text-xl font-bold text-navy-700 dark:text-white">
                Shipping Address
              </h2>
              <div className="space-y-2 text-gray-700 dark:text-gray-300">
                <p className="font-semibold">{order.shipping_addresses.header}</p>
                <p>{order.shipping_addresses.contact_name}</p>
                <p>{order.shipping_addresses.phone}</p>
                <p>{order.shipping_addresses.street_address}</p>
                {order.shipping_addresses.street_address2 && (
                  <p>{order.shipping_addresses.street_address2}</p>
                )}
                <p>
                  {order.shipping_addresses.city}, {order.shipping_addresses.state}{' '}
                  {order.shipping_addresses.postal_code}
                </p>
              </div>
            </Card>
          )}

          {/* Tracking Info */}
          {order.shipping_tracking_number && (
            <Card className="p-6">
              <h2 className="mb-4 text-xl font-bold text-navy-700 dark:text-white">
                Tracking Information
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Carrier</p>
                  <p className="font-semibold text-navy-700 dark:text-white">
                    {order.shipping_carrier}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Tracking Number</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-navy-700 dark:text-white">
                      {order.shipping_tracking_number}
                    </p>
                    <button
                      onClick={() => copyToClipboard(order.shipping_tracking_number!)}
                      className="text-brand-500 hover:text-brand-600"
                    >
                      <FiCopy />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* PO Number */}
          {order.po_number && (
            <Card className="p-6">
              <h2 className="mb-4 text-xl font-bold text-navy-700 dark:text-white">PO Number</h2>
              <p className="font-mono text-navy-700 dark:text-white">{order.po_number}</p>
            </Card>
          )}
        </div>
      </div>

      {/* Reorder Success Modal */}
      <Modal
        isOpen={reorderModal}
        onClose={() => setReorderModal(false)}
        title="Items Added to Cart!"
        size="sm"
      >
        <div className="space-y-4 text-center">
          <FiCheckCircle className="mx-auto h-16 w-16 text-green-500" />
          <p className="text-gray-700 dark:text-gray-300">
            All items from this order have been added to your cart.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setReorderModal(false)}
            >
              Continue Shopping
            </Button>
            <Button variant="primary" className="flex-1" onClick={() => router.push('/cart')}>
              View Cart
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
