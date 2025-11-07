'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAdmin } from '@/lib/hooks/useAdmin';
import { Card, Badge, DataTable, Button } from '@/components/b2b';
import { FiToggleLeft, FiToggleRight, FiFlag, FiInfo } from 'react-icons/fi';
import { fadeIn, fast } from '@/lib/animations';

interface FeatureFlag {
  id: string;
  feature_name: string;
  enabled: boolean;
  description: string;
  config: any;
  created_at: string;
  updated_at: string;
}

export default function AdminFeaturesPage() {
  const router = useRouter();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [features, setFeatures] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      router.push('/');
    } else if (isAdmin) {
      loadFeatures();
    }
  }, [isAdmin, adminLoading, router]);

  const loadFeatures = async () => {
    try {
      const supabase = createClient();
      
      // Check if user is super admin
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        setIsSuperAdmin(profile?.role === 'super_admin');
      }

      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('feature_name');

      if (error) throw error;

      setFeatures(data || []);
    } catch (error) {
      console.error('Error loading features:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFeature = async (featureName: string, currentlyEnabled: boolean) => {
    if (!isSuperAdmin) {
      alert('Only super admins can toggle feature flags');
      return;
    }

    setToggling(featureName);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('feature_flags')
        .update({ enabled: !currentlyEnabled, updated_at: new Date().toISOString() })
        .eq('feature_name', featureName);

      if (error) throw error;

      // Update local state
      setFeatures(features.map(f => 
        f.feature_name === featureName 
          ? { ...f, enabled: !currentlyEnabled, updated_at: new Date().toISOString() }
          : f
      ));
    } catch (error) {
      console.error('Error toggling feature:', error);
      alert('Failed to toggle feature flag');
    } finally {
      setToggling(null);
    }
  };

  const columns = [
    {
      key: 'feature_name',
      header: 'Feature',
      render: (feature: FeatureFlag) => (
        <div>
          <div className="font-semibold text-navy-700 dark:text-white">
            {feature.feature_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </div>
          <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {feature.description}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (feature: FeatureFlag) => (
        <Badge variant={feature.enabled ? 'success' : 'default'}>
          {feature.enabled ? 'Enabled' : 'Disabled'}
        </Badge>
      ),
    },
    {
      key: 'config',
      header: 'Priority',
      render: (feature: FeatureFlag) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {feature.config?.priority || 'N/A'}
        </span>
      ),
    },
    {
      key: 'updated',
      header: 'Last Updated',
      render: (feature: FeatureFlag) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {new Date(feature.updated_at).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (feature: FeatureFlag) => (
        <Button
          size="sm"
          variant={feature.enabled ? 'outline' : 'primary'}
          icon={feature.enabled ? <FiToggleRight /> : <FiToggleLeft />}
          onClick={() => toggleFeature(feature.feature_name, feature.enabled)}
          loading={toggling === feature.feature_name}
          disabled={!isSuperAdmin || toggling !== null}
        >
          {feature.enabled ? 'Disable' : 'Enable'}
        </Button>
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

  const enabledCount = features.filter(f => f.enabled).length;
  const disabledCount = features.filter(f => !f.enabled).length;

  return (
    <div className="mt-3">
      {/* Header Card */}
      <Card className="mb-5 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-700 dark:text-white">
              Feature Flags
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Manage feature toggles and system capabilities
            </p>
          </div>
          <FiFlag className="h-12 w-12 text-b2b-yellow" />
        </div>
      </Card>

      {/* Permission Notice */}
      {!isSuperAdmin && (
        <Card className="mb-5 border-l-4 border-b2b-yellow bg-yellow-50 p-4 dark:bg-yellow-900/20">
          <div className="flex items-start gap-3">
            <FiInfo className="mt-0.5 h-5 w-5 text-b2b-yellow" />
            <div>
              <p className="font-semibold text-navy-700 dark:text-white">View Only Mode</p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Only super administrators can toggle feature flags. Contact a super admin to enable or disable features.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Summary Stats */}
      <div className="mb-5 grid grid-cols-1 gap-5 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Features</p>
              <p className="mt-1 text-2xl font-bold text-navy-700 dark:text-white">{features.length}</p>
            </div>
            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/30">
              <FiFlag className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Enabled</p>
              <p className="mt-1 text-2xl font-bold text-navy-700 dark:text-white">{enabledCount}</p>
            </div>
            <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/30">
              <FiToggleRight className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Disabled</p>
              <p className="mt-1 text-2xl font-bold text-navy-700 dark:text-white">{disabledCount}</p>
            </div>
            <div className="rounded-full bg-gray-100 p-3 dark:bg-gray-900/30">
              <FiToggleLeft className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Features Table */}
      <DataTable data={features} columns={columns} />
    </div>
  );
}

