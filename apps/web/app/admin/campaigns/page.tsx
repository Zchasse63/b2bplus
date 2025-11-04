'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAdmin } from '@/lib/hooks/useAdmin';
import { Card, Badge, DataTable } from '@/components/b2b';
import { FiMail, FiSend, FiUsers, FiTrendingUp } from 'react-icons/fi';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: string;
  sent_count: number;
  opened_count: number;
  clicked_count: number;
  created_at: string;
  sent_at: string | null;
}

export default function AdminCampaignsPage() {
  const router = useRouter();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
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
      
      // Check if email campaigns feature is enabled
      const { data: featureFlag } = await supabase
        .from('feature_flags')
        .select('enabled')
        .eq('feature_name', 'email_campaigns')
        .single();

      const enabled = featureFlag?.enabled || false;
      setFeatureEnabled(enabled);

      if (!enabled) {
        setLoading(false);
        return;
      }

      // Load campaigns (mock data for now since table might not exist)
      // In production, this would fetch from email_campaigns table
      setCampaigns([]);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Campaign',
      render: (campaign: Campaign) => (
        <div>
          <div className="font-semibold text-navy-700 dark:text-white">{campaign.name}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">{campaign.subject}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (campaign: Campaign) => {
        const variants: Record<string, 'success' | 'warning' | 'info' | 'default'> = {
          sent: 'success',
          draft: 'default',
          scheduled: 'info',
          sending: 'warning',
        };
        return (
          <Badge variant={variants[campaign.status] || 'default'}>
            {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
          </Badge>
        );
      },
    },
    {
      key: 'sent',
      header: 'Sent',
      render: (campaign: Campaign) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">{campaign.sent_count}</span>
      ),
    },
    {
      key: 'opened',
      header: 'Opened',
      render: (campaign: Campaign) => {
        const rate = campaign.sent_count > 0 
          ? ((campaign.opened_count / campaign.sent_count) * 100).toFixed(1)
          : '0.0';
        return (
          <div>
            <div className="font-semibold text-navy-700 dark:text-white">{campaign.opened_count}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{rate}%</div>
          </div>
        );
      },
    },
    {
      key: 'clicked',
      header: 'Clicked',
      render: (campaign: Campaign) => {
        const rate = campaign.sent_count > 0 
          ? ((campaign.clicked_count / campaign.sent_count) * 100).toFixed(1)
          : '0.0';
        return (
          <div>
            <div className="font-semibold text-navy-700 dark:text-white">{campaign.clicked_count}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{rate}%</div>
          </div>
        );
      },
    },
    {
      key: 'date',
      header: 'Date',
      render: (campaign: Campaign) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {campaign.sent_at 
            ? new Date(campaign.sent_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
            : 'Not sent'}
        </span>
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
                Email Campaigns
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Create and manage email marketing campaigns
              </p>
            </div>
            <FiMail className="h-12 w-12 text-b2b-yellow" />
          </div>
        </Card>

        <Card className="p-12 text-center">
          <FiMail className="mx-auto mb-4 h-16 w-16 text-gray-400" />
          <h2 className="text-xl font-bold text-navy-700 dark:text-white">
            Email Campaigns Disabled
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            This feature is currently disabled. Contact a super administrator to enable email campaigns.
          </p>
        </Card>
      </div>
    );
  }

  const totalSent = campaigns.reduce((sum, c) => sum + c.sent_count, 0);
  const totalOpened = campaigns.reduce((sum, c) => sum + c.opened_count, 0);
  const totalClicked = campaigns.reduce((sum, c) => sum + c.clicked_count, 0);
  const avgOpenRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : '0.0';

  return (
    <div className="mt-3 animate-fadeIn">
      {/* Header Card */}
      <Card className="mb-5 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-700 dark:text-white">
              Email Campaigns
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Create and manage email marketing campaigns
            </p>
          </div>
          <FiMail className="h-12 w-12 text-b2b-yellow" />
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="mb-5 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Campaigns</p>
              <p className="mt-1 text-2xl font-bold text-navy-700 dark:text-white">{campaigns.length}</p>
            </div>
            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/30">
              <FiMail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Emails Sent</p>
              <p className="mt-1 text-2xl font-bold text-navy-700 dark:text-white">{totalSent}</p>
            </div>
            <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/30">
              <FiSend className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Open Rate</p>
              <p className="mt-1 text-2xl font-bold text-navy-700 dark:text-white">{avgOpenRate}%</p>
            </div>
            <div className="rounded-full bg-purple-100 p-3 dark:bg-purple-900/30">
              <FiUsers className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Clicks</p>
              <p className="mt-1 text-2xl font-bold text-navy-700 dark:text-white">{totalClicked}</p>
            </div>
            <div className="rounded-full bg-yellow-100 p-3 dark:bg-yellow-900/30">
              <FiTrendingUp className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Campaigns Table */}
      {campaigns.length === 0 ? (
        <Card className="p-12 text-center">
          <FiMail className="mx-auto mb-3 h-16 w-16 text-gray-400" />
          <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            No campaigns yet
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Create your first email campaign to get started
          </p>
        </Card>
      ) : (
        <DataTable data={campaigns} columns={columns} />
      )}
    </div>
  );
}

