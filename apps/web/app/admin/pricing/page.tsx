'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAdmin } from '@/lib/hooks/useAdmin';
import { Card, Badge, DataTable, Button, Select } from '@/components/b2b';
import { FiDollarSign, FiTrendingUp, FiUsers, FiTag, FiPercent } from 'react-icons/fi';

interface PricingTier {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  discount_percentage: number;
  priority: number;
  is_active: boolean;
  created_at: string;
}

interface CustomerTierAssignment {
  id: string;
  customer_id: string;
  tier_id: string;
  effective_from: string;
  effective_to: string | null;
  profiles?: {
    full_name: string;
    email: string;
  };
  pricing_tiers?: {
    name: string;
    discount_percentage: number;
  };
}

interface VolumeDiscount {
  id: string;
  product_id: string;
  min_quantity: number;
  max_quantity: number | null;
  discount_percentage: number;
  is_active: boolean;
  products?: {
    name: string;
    sku: string;
  };
}

export default function AdminPricingPage() {
  const router = useRouter();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [assignments, setAssignments] = useState<CustomerTierAssignment[]>([]);
  const [volumeDiscounts, setVolumeDiscounts] = useState<VolumeDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tiers' | 'assignments' | 'volume'>('tiers');
  const [featureEnabled, setFeatureEnabled] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      router.push('/');
    } else if (isAdmin) {
      checkFeatureAndLoadData();
    }
  }, [isAdmin, adminLoading, router]);

  const checkFeatureAndLoadData = async () => {
    try {
      const supabase = createClient();
      
      // Check if advanced pricing is enabled
      const { data: featureFlag } = await supabase
        .from('feature_flags')
        .select('enabled')
        .eq('feature_name', 'advanced_pricing')
        .single();

      const enabled = featureFlag?.enabled || false;
      setFeatureEnabled(enabled);

      if (!enabled) {
        setLoading(false);
        return;
      }

      // Load pricing tiers
      const { data: tiersData, error: tiersError } = await supabase
        .from('pricing_tiers')
        .select('*')
        .order('priority');

      if (tiersError) throw tiersError;
      setTiers(tiersData || []);

      // Load customer tier assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('customer_pricing_tiers')
        .select(`
          *,
          profiles (full_name, email),
          pricing_tiers (name, discount_percentage)
        `)
        .order('effective_from', { ascending: false })
        .limit(50);

      if (assignmentsError) throw assignmentsError;
      setAssignments(assignmentsData || []);

      // Load volume discounts
      const { data: volumeData, error: volumeError } = await supabase
        .from('volume_discounts')
        .select(`
          *,
          products (name, sku)
        `)
        .eq('is_active', true)
        .order('min_quantity')
        .limit(50);

      if (volumeError) throw volumeError;
      setVolumeDiscounts(volumeData || []);
    } catch (error) {
      console.error('Error loading pricing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const tiersColumns = [
    {
      key: 'name',
      header: 'Tier Name',
      render: (tier: PricingTier) => (
        <div>
          <div className="font-semibold text-navy-700 dark:text-white">{tier.name}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">{tier.description}</div>
        </div>
      ),
    },
    {
      key: 'discount',
      header: 'Discount',
      render: (tier: PricingTier) => (
        <Badge variant="success">
          {tier.discount_percentage}%
        </Badge>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (tier: PricingTier) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">{tier.priority}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (tier: PricingTier) => (
        <Badge variant={tier.is_active ? 'success' : 'default'}>
          {tier.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ];

  const assignmentsColumns = [
    {
      key: 'customer',
      header: 'Customer',
      render: (assignment: CustomerTierAssignment) => (
        <div>
          <div className="font-semibold text-navy-700 dark:text-white">
            {assignment.profiles?.full_name || 'Unknown'}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {assignment.profiles?.email || 'N/A'}
          </div>
        </div>
      ),
    },
    {
      key: 'tier',
      header: 'Tier',
      render: (assignment: CustomerTierAssignment) => (
        <div>
          <div className="font-semibold text-navy-700 dark:text-white">
            {assignment.pricing_tiers?.name || 'Unknown'}
          </div>
          <Badge variant="info">
            {assignment.pricing_tiers?.discount_percentage}% off
          </Badge>
        </div>
      ),
    },
    {
      key: 'effective',
      header: 'Effective Period',
      render: (assignment: CustomerTierAssignment) => (
        <div className="text-sm text-gray-700 dark:text-gray-300">
          <div>From: {new Date(assignment.effective_from).toLocaleDateString()}</div>
          {assignment.effective_to && (
            <div>To: {new Date(assignment.effective_to).toLocaleDateString()}</div>
          )}
        </div>
      ),
    },
  ];

  const volumeColumns = [
    {
      key: 'product',
      header: 'Product',
      render: (discount: VolumeDiscount) => (
        <div>
          <div className="font-semibold text-navy-700 dark:text-white">
            {discount.products?.name || 'Unknown'}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            SKU: {discount.products?.sku || 'N/A'}
          </div>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Quantity Range',
      render: (discount: VolumeDiscount) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {discount.min_quantity} - {discount.max_quantity || '∞'}
        </span>
      ),
    },
    {
      key: 'discount',
      header: 'Discount',
      render: (discount: VolumeDiscount) => (
        <Badge variant="success">
          {discount.discount_percentage}%
        </Badge>
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

  // If feature is not enabled, show message
  if (!featureEnabled) {
    return (
      <div className="mt-3 animate-fadeIn">
        <Card className="mb-5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-navy-700 dark:text-white">
                Advanced Pricing
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Manage pricing tiers, volume discounts, and customer-specific pricing
              </p>
            </div>
            <FiDollarSign className="h-12 w-12 text-b2b-yellow" />
          </div>
        </Card>

        <Card className="p-12 text-center">
          <FiDollarSign className="mx-auto mb-4 h-16 w-16 text-gray-400" />
          <h2 className="text-xl font-bold text-navy-700 dark:text-white">
            Advanced Pricing Disabled
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            This feature is currently disabled. Contact a super administrator to enable advanced pricing.
          </p>
        </Card>
      </div>
    );
  }

  const activeTiers = tiers.filter(t => t.is_active).length;
  const totalAssignments = assignments.length;
  const activeVolumeDiscounts = volumeDiscounts.filter(d => d.is_active).length;

  return (
    <div className="mt-3 animate-fadeIn">
      {/* Header Card */}
      <Card className="mb-5 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-700 dark:text-white">
              Advanced Pricing
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Manage pricing tiers, volume discounts, and customer-specific pricing
            </p>
          </div>
          <FiDollarSign className="h-12 w-12 text-b2b-yellow" />
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="mb-5 grid grid-cols-1 gap-5 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Tiers</p>
              <p className="mt-1 text-2xl font-bold text-navy-700 dark:text-white">{activeTiers}</p>
            </div>
            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/30">
              <FiTag className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Customer Assignments</p>
              <p className="mt-1 text-2xl font-bold text-navy-700 dark:text-white">{totalAssignments}</p>
            </div>
            <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/30">
              <FiUsers className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Volume Discounts</p>
              <p className="mt-1 text-2xl font-bold text-navy-700 dark:text-white">{activeVolumeDiscounts}</p>
            </div>
            <div className="rounded-full bg-purple-100 p-3 dark:bg-purple-900/30">
              <FiPercent className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Card className="mb-5 p-4">
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'tiers' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('tiers')}
          >
            Pricing Tiers
          </Button>
          <Button
            variant={activeTab === 'assignments' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('assignments')}
          >
            Customer Assignments
          </Button>
          <Button
            variant={activeTab === 'volume' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('volume')}
          >
            Volume Discounts
          </Button>
        </div>
      </Card>

      {/* Content based on active tab */}
      {activeTab === 'tiers' && (
        <DataTable data={tiers} columns={tiersColumns} />
      )}

      {activeTab === 'assignments' && (
        <DataTable data={assignments} columns={assignmentsColumns} />
      )}

      {activeTab === 'volume' && (
        <DataTable data={volumeDiscounts} columns={volumeColumns} />
      )}
    </div>
  );
}

