'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAdmin } from '@/lib/hooks/useAdmin';
import { DataTable, Button, Card, Badge, Input, Modal } from '@/components/b2b';
import { FiTruck, FiMapPin, FiPhone, FiMail, FiEdit, FiTrash2, FiPlus, FiSearch } from 'react-icons/fi';
import { fadeIn, fast } from '@/lib/animations';

interface ShippingAddress {
  id: string;
  organization_id: string;
  label: string;
  contact_name: string;
  phone: string;
  street_address: string;
  street_address2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  delivery_instructions: string | null;
  is_default: boolean;
  last_used_at: string | null;
  created_at: string;
  organizations?: {
    name: string;
  };
}

export default function AdminShippingPage() {
  const router = useRouter();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; address?: ShippingAddress }>({
    open: false,
  });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      router.push('/');
    } else if (isAdmin) {
      loadAddresses();
    }
  }, [isAdmin, adminLoading, router]);

  const loadAddresses = async () => {
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('shipping_addresses')
        .select(`
          *,
          organizations (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAddresses(data || []);
    } catch (error) {
      console.error('Error loading shipping addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.address) return;

    setDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('shipping_addresses')
        .delete()
        .eq('id', deleteModal.address.id);

      if (error) throw error;

      setAddresses(addresses.filter((a) => a.id !== deleteModal.address!.id));
      setDeleteModal({ open: false });
    } catch (error) {
      console.error('Error deleting address:', error);
      alert('Failed to delete shipping address');
    } finally {
      setDeleting(false);
    }
  };

  const filteredAddresses = addresses.filter((address) =>
    address.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    address.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    address.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    address.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
    address.organizations?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns = [
    {
      key: 'label',
      header: 'Label',
      render: (address: ShippingAddress) => (
        <div>
          <div className="font-semibold text-navy-700 dark:text-white">{address.label}</div>
          {address.is_default && (
            <Badge variant="success" className="mt-1">Default</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (address: ShippingAddress) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {address.organizations?.name || 'Unknown'}
        </span>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (address: ShippingAddress) => (
        <div className="space-y-1 text-sm">
          <div className="font-medium text-navy-700 dark:text-white">{address.contact_name}</div>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <FiPhone className="h-3 w-3" />
            {address.phone}
          </div>
        </div>
      ),
    },
    {
      key: 'address',
      header: 'Address',
      render: (address: ShippingAddress) => (
        <div className="text-sm text-gray-700 dark:text-gray-300">
          <div>{address.street_address}</div>
          {address.street_address2 && <div>{address.street_address2}</div>}
          <div>
            {address.city}, {address.state} {address.postal_code}
          </div>
        </div>
      ),
    },
    {
      key: 'last_used',
      header: 'Last Used',
      render: (address: ShippingAddress) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {address.last_used_at
            ? new Date(address.last_used_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
            : 'Never'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (address: ShippingAddress) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            icon={<FiTrash2 />}
            onClick={() => setDeleteModal({ open: true, address })}
          >
            Delete
          </Button>
        </div>
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
  const totalAddresses = addresses.length;
  const uniqueCustomers = new Set(addresses.map(a => a.organization_id)).size;
  const defaultAddresses = addresses.filter(a => a.is_default).length;
  const recentlyUsed = addresses.filter(a => {
    if (!a.last_used_at) return false;
    const daysSinceUsed = (Date.now() - new Date(a.last_used_at).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUsed <= 30;
  }).length;

  return (
    <div className="mt-3">
      {/* Header Card */}
      <Card className="mb-5 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-700 dark:text-white">
              Shipping Management
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Manage customer shipping addresses and delivery preferences
            </p>
          </div>
          <FiTruck className="h-12 w-12 text-b2b-yellow" />
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="mb-5 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Addresses</p>
              <p className="mt-1 text-2xl font-bold text-navy-700 dark:text-white">{totalAddresses}</p>
            </div>
            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/30">
              <FiMapPin className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Unique Customers</p>
              <p className="mt-1 text-2xl font-bold text-navy-700 dark:text-white">{uniqueCustomers}</p>
            </div>
            <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/30">
              <FiTruck className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Default Addresses</p>
              <p className="mt-1 text-2xl font-bold text-navy-700 dark:text-white">{defaultAddresses}</p>
            </div>
            <div className="rounded-full bg-purple-100 p-3 dark:bg-purple-900/30">
              <FiMapPin className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Used (Last 30 Days)</p>
              <p className="mt-1 text-2xl font-bold text-navy-700 dark:text-white">{recentlyUsed}</p>
            </div>
            <div className="rounded-full bg-yellow-100 p-3 dark:bg-yellow-900/30">
              <FiTruck className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card className="mb-5 p-4">
        <Input
          placeholder="Search by label, contact, city, state, or customer..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={<FiSearch />}
        />
      </Card>

      {/* Addresses Table */}
      {filteredAddresses.length === 0 ? (
        <Card className="p-12 text-center">
          <FiMapPin className="mx-auto mb-3 h-16 w-16 text-gray-400" />
          <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            {searchQuery ? 'No addresses found' : 'No shipping addresses yet'}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchQuery ? 'Try adjusting your search query' : 'Shipping addresses will appear here once customers add them'}
          </p>
        </Card>
      ) : (
        <DataTable data={filteredAddresses} columns={columns} />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false })}
        title="Delete Shipping Address"
      >
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            Are you sure you want to delete the shipping address &quot;{deleteModal.address?.label}&quot;?
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setDeleteModal({ open: false })}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleDelete}
              loading={deleting}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

