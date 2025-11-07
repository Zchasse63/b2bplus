'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAdmin } from '@/lib/hooks/useAdmin';
import { Card, Button, Badge } from '@/components/b2b';
import { FiMail, FiSend, FiArrowLeft, FiCheck } from 'react-icons/fi';
import { fadeIn, fast } from '@/lib/animations';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  status: string;
  sent_count: number;
  opened_count: number;
  clicked_count: number;
  created_at: string;
  sent_at: string | null;
  campaign_type: string;
  total_recipients: number;
}

export default function CampaignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [useAI, setUseAI] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      router.push('/');
    } else if (isAdmin) {
      loadCampaign();
    }
  }, [isAdmin, adminLoading, router, campaignId]);

  const loadCampaign = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (error) throw error;
      setCampaign(data);
    } catch (error) {
      console.error('Error loading campaign:', error);
      setMessage({ type: 'error', text: 'Failed to load campaign' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendCampaign = async () => {
    if (!campaign) return;

    setSending(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/campaigns/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
          useAI,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send campaign');
      }

      setMessage({ type: 'success', text: 'Campaign sent successfully' });
      
      // Reload campaign to get updated status
      await loadCampaign();
    } catch (error: any) {
      console.error('Error sending campaign:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to send campaign' });
    } finally {
      setSending(false);
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!isAdmin || !campaign) {
    return null;
  }

  const statusVariants: Record<string, 'success' | 'warning' | 'info' | 'default'> = {
    sent: 'success',
    draft: 'default',
    scheduled: 'info',
    sending: 'warning',
  };

  return (
    <div className="mt-3">
      {/* Header */}
      <Card className="mb-5 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/campaigns')}
              className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <FiArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-navy-700 dark:text-white">
                {campaign.name}
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {campaign.subject}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={statusVariants[campaign.status] || 'default'}>
              {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
            </Badge>
            <FiMail className="h-12 w-12 text-b2b-yellow" />
          </div>
        </div>
      </Card>

      {/* Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-5 rounded-lg p-4 ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
          }`}
        >
          {message.text}
        </motion.div>
      )}

      {/* Campaign Stats */}
      {campaign.status === 'sent' && (
        <div className="mb-5 grid grid-cols-1 gap-5 md:grid-cols-3">
          <Card className="p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">Sent</p>
            <p className="mt-1 text-2xl font-bold text-navy-700 dark:text-white">
              {campaign.sent_count}
            </p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">Opened</p>
            <p className="mt-1 text-2xl font-bold text-navy-700 dark:text-white">
              {campaign.opened_count}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {campaign.sent_count > 0
                ? ((campaign.opened_count / campaign.sent_count) * 100).toFixed(1)
                : '0.0'}%
            </p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">Clicked</p>
            <p className="mt-1 text-2xl font-bold text-navy-700 dark:text-white">
              {campaign.clicked_count}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {campaign.sent_count > 0
                ? ((campaign.clicked_count / campaign.sent_count) * 100).toFixed(1)
                : '0.0'}%
            </p>
          </Card>
        </div>
      )}

      {/* Campaign Content */}
      <Card className="mb-5 p-6">
        <h2 className="mb-4 text-lg font-bold text-navy-700 dark:text-white">
          Email Content
        </h2>
        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <div
            className="prose dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: campaign.html_content }}
          />
        </div>
      </Card>

      {/* Send Campaign Section */}
      {campaign.status === 'draft' && (
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-bold text-navy-700 dark:text-white">
            Send Campaign
          </h2>
          
          <div className="mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="useAI"
                checked={useAI}
                onChange={(e) => setUseAI(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-b2b-blue focus:ring-b2b-blue"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Use AI personalization (Gemini)
              </span>
            </label>
            <p className="ml-6 mt-1 text-xs text-gray-500 dark:text-gray-400">
              Personalize email content for each recipient using AI
            </p>
          </div>

          <Button
            variant="primary"
            icon={<FiSend />}
            onClick={handleSendCampaign}
            disabled={sending}
            className="w-full md:w-auto"
          >
            {sending ? 'Sending...' : 'Send Campaign'}
          </Button>
        </Card>
      )}
    </div>
  );
}

