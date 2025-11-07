'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAdmin } from '@/lib/hooks/useAdmin';
import { Card, Badge, DataTable, Input } from '@/components/b2b';
import { FiPackage, FiAlertTriangle, FiSearch, FiMapPin } from 'react-icons/fi';
import { fadeIn, fast } from '@/lib/animations';

interface InventoryItem {
  id: string;
  product_id: string;
  location_id: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
  reorder_point: number;
  reorder_quantity: number;
  last_updated_at: string;
  products?: {
    name: string;
    sku: string;
    category: string;
  };
  inventory_locations?: {
    name: string;
    code: string;
  };
}

export default function AdminInventoryPage() {
  const router = useRouter();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [featureEnabled, setFeatureEnabled] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      router.push('/');
    } else if (isAdmin) {
      checkFeatureAndLoadInventory();
    }
  }, [isAdmin, adminLoading, router]);

  const checkFeatureAndLoadInventory = async () => {
    try {
      const supabase = createClient();
      
      // Check if inventory management is enabled
      const { data: featureFlag } = await supabase
        .from('feature_flags')
        .select('enabled')
        .eq('feature_name', 'inventory_management')
        .single();

      const enabled = featureFlag?.enabled || false;
      setFeatureEnabled(enabled);

      if (!enabled) {
        setLoading(false);
        return;
      }

      // Load inventory data
      const { data, error } = await supabase
        .from('product_inventory')
        .select(`
          *,
          products (name, sku, category),
          inventory_locations (name, code)
        `)
        .order('last_updated_at', { ascending: false });

      if (error) throw error;

      setInventory(data || []);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInventory = inventory.filter((item) =>
    item.products?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.products?.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.inventory_locations?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns = [
    {
      key: 'product',
      header: 'Product',
      render: (item: InventoryItem) => (
        <div>
          <div className="font-semibold text-navy-700 dark:text-white">
            {item.products?.name || 'Unknown'}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            SKU: {item.products?.sku || 'N/A'}
          </div>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (item: InventoryItem) => (
        <div className="flex items-center gap-2">
          <FiMapPin className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {item.inventory_locations?.name || 'Unknown'}
          </span>
        </div>
      ),
    },
    {
      key: 'on_hand',
      header: 'On Hand',
      render: (item: InventoryItem) => (
        <span className="font-semibold text-navy-700 dark:text-white">
          {item.quantity_on_hand}
        </span>
      ),
    },
    {
      key: 'reserved',
      header: 'Reserved',
      render: (item: InventoryItem) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {item.quantity_reserved}
        </span>
      ),
    },
    {
      key: 'available',
      header: 'Available',
      render: (item: InventoryItem) => {
        const needsReorder = item.quantity_available <= item.reorder_point;
        return (
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${needsReorder ? 'text-red-600' : 'text-green-600'}`}>
              {item.quantity_available}
            </span>
            {needsReorder && (
              <FiAlertTriangle className="h-4 w-4 text-red-600" />
            )}
          </div>
        );
      },
    },
    {
      key: 'reorder',
      header: 'Reorder Point',
      render: (item: InventoryItem) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {item.reorder_point}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: InventoryItem) => {
        const needsReorder = item.quantity_available <= item.reorder_point;
        const isLow = item.quantity_available <= item.reorder_point * 1.5 && !needsReorder;
        
        if (needsReorder) {
          return <Badge variant="error">Reorder Needed</Badge>;
        } else if (isLow) {
          return <Badge variant="warning">Low Stock</Badge>;
        } else {
          return <Badge variant="success">In Stock</Badge>;
        }
      },
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

  // If feature is not enabled, show message
  if (!featureEnabled) {
    return (
      <div className="mt-3">
        <Card className="mb-5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-navy-700 dark:text-white">
                Inventory Management
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Track stock levels and manage inventory across locations
              </p>
            </div>
            <FiPackage className="h-12 w-12 text-b2b-yellow" />
          </div>
        </Card>

        <Card className="p-12 text-center">
          <FiPackage className="mx-auto mb-4 h-16 w-16 text-gray-400" />
          <h2 className="text-xl font-bold text-navy-700 dark:text-white">
            Inventory Management Disabled
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            This feature is currently disabled. Contact a super administrator to enable inventory management.
          </p>
        </Card>
      </div>
    );
  }

  // Calculate summary stats
  const totalProducts = new Set(inventory.map(i => i.product_id)).size;
  const totalLocations = new Set(inventory.map(i => i.location_id)).size;
  const lowStockItems = inventory.filter(i => i.quantity_available <= i.reorder_point * 1.5).length;
  const reorderNeeded = inventory.filter(i => i.quantity_available <= i.reorder_point).length;

  return (
    <div className="mt-3">
      {/* Header Card */}
      <Card className="mb-5 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-700 dark:text-white">
              Inventory Management
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Track stock levels and manage inventory across locations
            </p>
          </div>
          <FiPackage className="h-12 w-12 text-b2b-yellow" />
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="mb-5 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Products</p>
              <p className="mt-1 text-2xl font-bold text-navy-700 dark:text-white">{totalProducts}</p>
            </div>
            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/30">
              <FiPackage className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Locations</p>
              <p className="mt-1 text-2xl font-bold text-navy-700 dark:text-white">{totalLocations}</p>
            </div>
            <div className="rounded-full bg-purple-100 p-3 dark:bg-purple-900/30">
              <FiMapPin className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Low Stock</p>
              <p className="mt-1 text-2xl font-bold text-navy-700 dark:text-white">{lowStockItems}</p>
            </div>
            <div className="rounded-full bg-yellow-100 p-3 dark:bg-yellow-900/30">
              <FiAlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Reorder Needed</p>
              <p className="mt-1 text-2xl font-bold text-navy-700 dark:text-white">{reorderNeeded}</p>
            </div>
            <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/30">
              <FiAlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card className="mb-5 p-4">
        <Input
          placeholder="Search by product name, SKU, or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={<FiSearch />}
        />
      </Card>

      {/* Inventory Table */}
      {filteredInventory.length === 0 ? (
        <Card className="p-12 text-center">
          <FiPackage className="mx-auto mb-3 h-16 w-16 text-gray-400" />
          <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            {searchQuery ? 'No inventory found' : 'No inventory data yet'}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchQuery ? 'Try adjusting your search query' : 'Inventory data will appear here once products are stocked'}
          </p>
        </Card>
      ) : (
        <DataTable data={filteredInventory} columns={columns} />
      )}
    </div>
  );
}

