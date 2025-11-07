'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { PageHeader, Card, Button, Input, Badge, DataTable } from '@/components/b2b';
import { FiDownload, FiRefreshCw, FiSearch, FiCalendar, FiPackage } from 'react-icons/fi';
import { useToast } from '@/hooks/use-toast';

interface HistoricalOrder {
  id: string;
  order_number: string;
  order_date: string;
  total_amount: number;
  status: string;
  items_count: number;
  historical_order_items?: HistoricalOrderItem[];
}

interface HistoricalOrderItem {
  id: string;
  old_sku: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  current_product_id: string | null;
  products?: {
    id: string;
    name: string;
    sku: string;
    base_price: number;
  };
}

export default function HistoricalOrdersPage() {
  const [orders, setOrders] = useState<HistoricalOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<HistoricalOrder | null>(null);
  const [exporting, setExporting] = useState(false);
  const supabase = createClient();
  const router = useRouter();
  const { toast } = useToast();

  const loadHistoricalOrders = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Get user's organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.current_organization_id) {
        throw new Error('No organization found');
      }

      // Fetch historical orders
      const { data, error } = await supabase
        .from('historical_orders')
        .select(`
          *,
          historical_order_items (
            *,
            products (id, name, sku, base_price)
          )
        `)
        .eq('organization_id', profile.current_organization_id)
        .order('order_date', { ascending: false });

      if (error) throw error;

      setOrders(data || []);
    } catch (error) {
      console.error('Error loading historical orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to load historical orders',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [router, supabase, toast]);

  useEffect(() => {
    loadHistoricalOrders();
  }, [loadHistoricalOrders]);

  async function handleReorder(order: HistoricalOrder) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Get user's organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_organization_id')
        .eq('id', user.id)
        .single();

      const organizationId = profile?.current_organization_id;

      if (!organizationId) {
        throw new Error('No organization found for user');
      }

      // Get order items with current product mappings
      const itemsToAdd = order.historical_order_items?.filter(
        (item) => item.current_product_id
      );

      if (!itemsToAdd || itemsToAdd.length === 0) {
        toast({
          title: 'Cannot Reorder',
          description: 'No items from this order are currently available',
          variant: 'destructive',
        });
        return;
      }

      // ATOMIC: Add items to cart using database function to prevent race conditions
      const upsertPromises = itemsToAdd.map(async (item) => {
        const { data, error } = await supabase.rpc('upsert_cart_item_atomic', {
          p_user_id: user.id,
          p_product_id: item.current_product_id,
          p_quantity: item.quantity,
          p_organization_id: organizationId
        });

        if (error) throw error;
        return data?.[0]?.success || false;
      });

      const results = await Promise.all(upsertPromises);
      const successCount = results.filter(success => success).length;

      toast({
        title: 'Items Added to Cart',
        description: `${successCount} items from order ${order.order_number} have been added to your cart`,
      });

      router.push('/cart');
    } catch (error) {
      console.error('Error reordering:', error);
      toast({
        title: 'Error',
        description: 'Failed to add items to cart',
        variant: 'destructive',
      });
    }
  }

  function exportToCSV() {
    setExporting(true);

    try {
      // Create CSV content
      const headers = ['Order Number', 'Order Date', 'Total Amount', 'Status', 'Items Count'];
      const rows = filteredOrders.map((order) => [
        order.order_number,
        new Date(order.order_date).toLocaleDateString(),
        `$${order.total_amount.toFixed(2)}`,
        order.status,
        order.items_count.toString(),
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.join(',')),
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `historical-orders-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Export Successful',
        description: 'Historical orders have been exported to CSV',
      });
    } catch (error) {
      console.error('Error exporting:', error);
      toast({
        title: 'Error',
        description: 'Failed to export orders',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  }

  const filteredOrders = orders.filter(
    (order) =>
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    {
      key: 'order_number',
      label: 'Order Number',
      render: (order: HistoricalOrder) => (
        <span className="font-semibold text-b2b-blue">{order.order_number}</span>
      ),
    },
    {
      key: 'order_date',
      label: 'Order Date',
      render: (order: HistoricalOrder) => (
        <div className="flex items-center gap-2">
          <FiCalendar className="h-4 w-4 text-b2b-gray-400" />
          <span>{new Date(order.order_date).toLocaleDateString()}</span>
        </div>
      ),
    },
    {
      key: 'total_amount',
      label: 'Total',
      render: (order: HistoricalOrder) => (
        <span className="font-semibold">${order.total_amount.toFixed(2)}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (order: HistoricalOrder) => (
        <Badge
          variant={
            order.status === 'delivered'
              ? 'success'
              : order.status === 'cancelled'
              ? 'error'
              : 'default'
          }
        >
          {order.status}
        </Badge>
      ),
    },
    {
      key: 'items_count',
      label: 'Items',
      render: (order: HistoricalOrder) => (
        <div className="flex items-center gap-2">
          <FiPackage className="h-4 w-4 text-b2b-gray-400" />
          <span>{order.items_count}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (order: HistoricalOrder) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedOrder(order)}
          >
            View Details
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<FiRefreshCw />}
            onClick={() => handleReorder(order)}
          >
            Reorder
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-b2b-gray-500">Loading historical orders...</div>
      </div>
    );
  }

  return (
    <div className="mt-3 animate-fadeIn">
      <PageHeader
        title="Order History"
        subtitle="View your past orders from previous systems"
        icon={<FiCalendar />}
      />

      <Card className="p-6 mt-5">
        {/* Search and Export */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search by order number or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<FiSearch />}
            />
          </div>
          <Button
            variant="secondary"
            icon={<FiDownload />}
            onClick={exportToCSV}
            loading={exporting}
          >
            Export to CSV
          </Button>
        </div>

        {/* Orders Table */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <FiCalendar className="h-16 w-16 text-b2b-gray-300 mx-auto mb-4" />
            <p className="text-b2b-gray-500">
              {searchTerm ? 'No orders found matching your search' : 'No historical orders found'}
            </p>
          </div>
        ) : (
          <DataTable columns={columns} data={filteredOrders} />
        )}
      </Card>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-b2b-text">
                Order {selectedOrder.order_number}
              </h2>
              <Button variant="ghost" onClick={() => setSelectedOrder(null)}>
                Close
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-b2b-gray-500">Order Date</p>
                <p className="font-semibold">{new Date(selectedOrder.order_date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-b2b-gray-500">Status</p>
                <Badge variant={selectedOrder.status === 'delivered' ? 'success' : 'default'}>
                  {selectedOrder.status}
                </Badge>
              </div>
            </div>

            <h3 className="text-lg font-semibold mb-4">Order Items</h3>
            <div className="space-y-3">
              {selectedOrder.historical_order_items?.map((item) => (
                <div key={item.id} className="flex justify-between items-start p-4 bg-b2b-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-semibold text-b2b-text">{item.product_name}</p>
                    <p className="text-sm text-b2b-gray-500">Old SKU: {item.old_sku}</p>
                    {item.products && (
                      <p className="text-sm text-b2b-green">
                        ✓ Mapped to: {item.products.name} ({item.products.sku})
                      </p>
                    )}
                    {!item.current_product_id && (
                      <p className="text-sm text-b2b-error">
                        ⚠ No current product mapping
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-b2b-gray-500">Qty: {item.quantity}</p>
                    <p className="font-semibold">${(item.unit_price * item.quantity).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-b2b-gray-200">
              <div className="flex justify-between text-xl font-bold">
                <span>Total</span>
                <span className="text-b2b-blue">${selectedOrder.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

