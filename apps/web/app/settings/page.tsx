'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/b2b';
import { Card } from '@/components/b2b';
import { Button } from '@/components/b2b';
import { Input } from '@/components/b2b';
import { Select } from '@/components/b2b';
import { Modal } from '@/components/b2b';
import {
  FiMapPin,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiCheckCircle,
  FiStar,
} from 'react-icons/fi';

interface ShippingAddress {
  id: string;
  header: string;
  contact_name: string;
  phone: string;
  street_address: string;
  street_address2?: string;
  city: string;
  state: string;
  postal_code: string;
  is_default: boolean;
}

export default function SettingsPage() {
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<ShippingAddress | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  const [formData, setFormData] = useState({
    header: '',
    contact_name: '',
    phone: '',
    street_address: '',
    street_address2: '',
    city: '',
    state: '',
    postal_code: '',
    is_default: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('current_organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.current_organization_id) {
        throw new Error('No organization found');
      }

      setOrganizationId(profile.current_organization_id);

      const { data: addressData, error: addressError } = await supabase
        .from('shipping_addresses')
        .select('*')
        .eq('organization_id', profile.current_organization_id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (addressError) throw addressError;
      setAddresses(addressData || []);
    } catch (error) {
      console.error('Error loading settings:', error);
      alert('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      header: '',
      contact_name: '',
      phone: '',
      street_address: '',
      street_address2: '',
      city: '',
      state: '',
      postal_code: '',
      is_default: false,
    });
    setEditingAddress(null);
  };

  const handleOpenModal = (address?: ShippingAddress) => {
    if (address) {
      setEditingAddress(address);
      setFormData({
        header: address.header,
        contact_name: address.contact_name,
        phone: address.phone,
        street_address: address.street_address,
        street_address2: address.street_address2 || '',
        city: address.city,
        state: address.state,
        postal_code: address.postal_code,
        is_default: address.is_default,
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!organizationId) return;

    setSaving(true);

    try {
      const addressData = {
        ...formData,
        organization_id: organizationId,
      };

      if (editingAddress) {
        const { error } = await supabase
          .from('shipping_addresses')
          .update(addressData)
          .eq('id', editingAddress.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('shipping_addresses').insert(addressData);

        if (error) throw error;
      }

      await loadSettings();
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving address:', error);
      alert('Failed to save address');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!addressToDelete) return;

    setDeleting(true);

    try {
      const { error } = await supabase
        .from('shipping_addresses')
        .delete()
        .eq('id', addressToDelete);

      if (error) throw error;

      await loadSettings();
      setDeleteModal(false);
      setAddressToDelete(null);
    } catch (error) {
      console.error('Error deleting address:', error);
      alert('Failed to delete address');
    } finally {
      setDeleting(false);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    if (!organizationId) return;

    try {
      await supabase
        .from('shipping_addresses')
        .update({ is_default: false })
        .eq('organization_id', organizationId);

      await supabase
        .from('shipping_addresses')
        .update({ is_default: true })
        .eq('id', addressId);

      await loadSettings();
    } catch (error) {
      console.error('Error setting default address:', error);
      alert('Failed to set default address');
    }
  };

  const stateOptions = [
    { value: '', label: 'Select State' },
    { value: 'AL', label: 'Alabama' },
    { value: 'AK', label: 'Alaska' },
    { value: 'AZ', label: 'Arizona' },
    { value: 'AR', label: 'Arkansas' },
    { value: 'CA', label: 'California' },
    { value: 'CO', label: 'Colorado' },
    { value: 'CT', label: 'Connecticut' },
    { value: 'DE', label: 'Delaware' },
    { value: 'FL', label: 'Florida' },
    { value: 'GA', label: 'Georgia' },
    // Add more states as needed
  ];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-b2b-gray-500 dark:text-b2b-gray-500">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="mt-3 animate-fadeIn">
      {/* Header */}
      <Card padding="lg" className="mb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-b2b-dark dark:text-white">Settings</h1>
            <p className="mt-1 text-sm text-b2b-gray-500 dark:text-b2b-gray-500">
              Manage your account preferences and shipping addresses
            </p>
          </div>
          <Button variant="primary" icon={<FiPlus />} onClick={() => handleOpenModal()}>
            Add Address
          </Button>
        </div>
      </Card>

      {/* Shipping Addresses */}
      <Card padding="lg">
        <h2 className="mb-5 text-xl font-bold text-b2b-dark dark:text-white">
          Shipping Addresses
        </h2>
        {addresses.length === 0 ? (
          <div className="py-12 text-center">
            <FiMapPin className="mx-auto mb-3 h-16 w-16 text-b2b-gray-500" />
            <p className="mb-4 text-b2b-gray-500 dark:text-b2b-gray-500">No shipping addresses yet</p>
            <Button variant="primary" icon={<FiPlus />} onClick={() => handleOpenModal()}>
              Add Your First Address
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {addresses.map((address) => (
              <Card key={address.id} className="p-5 border border-gray-200 dark:border-white/10">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-b2b-dark dark:text-white">{address.header}</h3>
                    {address.is_default && (
                      <span className="flex items-center gap-1 rounded-full bg-brand-100 px-2 py-1 text-xs font-semibold text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                        <FiStar className="h-3 w-3" />
                        Default
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenModal(address)}
                      className="text-b2b-gray-500 hover:text-b2b-yellow dark:text-b2b-gray-500"
                    >
                      <FiEdit2 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => {
                        setAddressToDelete(address.id);
                        setDeleteModal(true);
                      }}
                      className="text-b2b-gray-500 hover:text-red-500 dark:text-b2b-gray-500"
                    >
                      <FiTrash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  <p>{address.contact_name}</p>
                  <p>{address.phone}</p>
                  <p>{address.street_address}</p>
                  {address.street_address2 && <p>{address.street_address2}</p>}
                  <p>
                    {address.city}, {address.state} {address.postal_code}
                  </p>
                </div>
                {!address.is_default && (
                  <button
                    onClick={() => handleSetDefault(address.id)}
                    className="mt-3 flex items-center gap-1 text-sm text-b2b-yellow hover:text-brand-600"
                  >
                    <FiStar className="h-4 w-4" />
                    Set as Default
                  </button>
                )}
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* Add/Edit Address Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingAddress ? 'Edit Address' : 'Add New Address'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Address Label"
            value={formData.header}
            onChange={(e) => setFormData({ ...formData, header: e.target.value })}
            placeholder="e.g., Main Warehouse, Office"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Contact Name"
              value={formData.contact_name}
              onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
              required
            />
            <Input
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
          </div>
          <Input
            label="Street Address"
            value={formData.street_address}
            onChange={(e) => setFormData({ ...formData, street_address: e.target.value })}
            required
          />
          <Input
            label="Street Address 2 (Optional)"
            value={formData.street_address2}
            onChange={(e) => setFormData({ ...formData, street_address2: e.target.value })}
          />
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="City"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              required
            />
            <Select
              label="State"
              options={stateOptions}
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              required
            />
            <Input
              label="Postal Code"
              value={formData.postal_code}
              onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
              required
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_default}
              onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-b2b-yellow focus:ring-brand-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Set as default address</span>
          </label>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>
              {editingAddress ? 'Update' : 'Add'} Address
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        title="Delete Address"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            Are you sure you want to delete this address? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteModal(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="primary" className="bg-red-500 hover:bg-red-600" onClick={handleDelete} loading={deleting}>
              Delete Address
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
