'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/b2b/Button';
import { Card } from '@/components/b2b/Card';
import { MdSave, MdNotifications } from 'react-icons/md';
import { useRouter } from 'next/navigation';

interface NotificationPreferences {
  reorder_notifications_enabled: boolean;
  reorder_frequency: 'daily' | 'weekly' | 'monthly';
  reorder_threshold: number; // Percentage through usage cycle (0-100)
  email_notifications: boolean;
  push_notifications: boolean;
  low_stock_alerts: boolean;
  price_drop_alerts: boolean;
  new_product_alerts: boolean;
}

export default function NotificationPreferencesPage() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    reorder_notifications_enabled: true,
    reorder_frequency: 'weekly',
    reorder_threshold: 80,
    email_notifications: true,
    push_notifications: false,
    low_stock_alerts: true,
    price_drop_alerts: true,
    new_product_alerts: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
      } else {
        setUser(user);
        await loadPreferences(user.id);
      }
    };
    checkAuth();
  }, [router, supabase.auth]);

  const loadPreferences = async (userId: string) => {
    setLoading(true);
    try {
      // Get user's organization
      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', userId)
        .single();

      if (!membership) {
        setLoading(false);
        return;
      }

      setOrganizationId(membership.organization_id);

      // Get organization preferences (stored in metadata)
      const { data: org } = await supabase
        .from('organizations')
        .select('metadata')
        .eq('id', membership.organization_id)
        .single();

      if (org?.metadata?.notification_preferences) {
        setPreferences({
          ...preferences,
          ...org.metadata.notification_preferences,
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!organizationId) return;

    setSaving(true);
    try {
      // Get current metadata
      const { data: org } = await supabase
        .from('organizations')
        .select('metadata')
        .eq('id', organizationId)
        .single();

      const currentMetadata = org?.metadata || {};

      // Update metadata with new preferences
      const { error } = await supabase
        .from('organizations')
        .update({
          metadata: {
            ...currentMetadata,
            notification_preferences: preferences,
          },
        })
        .eq('id', organizationId);

      if (error) throw error;

      alert('Preferences saved successfully!');
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-b2b-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <p className="text-center text-b2b-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-b2b-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-b2b-dark mb-2">
            Notification Preferences
          </h1>
          <p className="text-b2b-gray-500">
            Customize how and when you receive notifications
          </p>
        </div>

        {/* Reorder Notifications */}
        <Card className="p-6 mb-6">
          <div className="flex items-start gap-3 mb-6">
            <MdNotifications className="text-b2b-blue text-2xl mt-1" />
            <div className="flex-1">
              <h2 className="text-xl font-bold text-b2b-dark mb-2">
                Reorder Notifications
              </h2>
              <p className="text-sm text-b2b-gray-500">
                Get AI-powered predictions for when to reorder products
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.reorder_notifications_enabled}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    reorder_notifications_enabled: e.target.checked,
                  })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-b2b-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-b2b-blue/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-b2b-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-b2b-blue"></div>
            </label>
          </div>

          {preferences.reorder_notifications_enabled && (
            <div className="space-y-4 pl-11">
              {/* Frequency */}
              <div>
                <label className="block text-sm font-medium text-b2b-dark mb-2">
                  Notification Frequency
                </label>
                <select
                  value={preferences.reorder_frequency}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      reorder_frequency: e.target.value as 'daily' | 'weekly' | 'monthly',
                    })
                  }
                  className="w-full border border-b2b-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-b2b-blue"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <p className="text-xs text-b2b-gray-500 mt-1">
                  How often to check for reorder predictions
                </p>
              </div>

              {/* Threshold */}
              <div>
                <label className="block text-sm font-medium text-b2b-dark mb-2">
                  Notification Threshold: {preferences.reorder_threshold}%
                </label>
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="5"
                  value={preferences.reorder_threshold}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      reorder_threshold: parseInt(e.target.value),
                    })
                  }
                  className="w-full h-2 bg-b2b-gray-200 rounded-lg appearance-none cursor-pointer accent-b2b-blue"
                />
                <p className="text-xs text-b2b-gray-500 mt-1">
                  Notify when {preferences.reorder_threshold}% through typical usage cycle
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* Notification Channels */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-bold text-b2b-dark mb-4">
            Notification Channels
          </h2>

          <div className="space-y-4">
            {/* Email */}
            <label className="flex items-center justify-between p-3 border border-b2b-gray-200 rounded-lg hover:bg-b2b-gray-50 cursor-pointer">
              <div>
                <p className="font-medium text-b2b-dark">Email Notifications</p>
                <p className="text-sm text-b2b-gray-500">
                  Receive notifications via email
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.email_notifications}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    email_notifications: e.target.checked,
                  })
                }
                className="w-5 h-5 text-b2b-blue border-b2b-gray-300 rounded focus:ring-b2b-blue"
              />
            </label>

            {/* Push */}
            <label className="flex items-center justify-between p-3 border border-b2b-gray-200 rounded-lg hover:bg-b2b-gray-50 cursor-pointer">
              <div>
                <p className="font-medium text-b2b-dark">Push Notifications</p>
                <p className="text-sm text-b2b-gray-500">
                  Receive browser push notifications
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.push_notifications}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    push_notifications: e.target.checked,
                  })
                }
                className="w-5 h-5 text-b2b-blue border-b2b-gray-300 rounded focus:ring-b2b-blue"
              />
            </label>
          </div>
        </Card>

        {/* Notification Types */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-bold text-b2b-dark mb-4">
            Notification Types
          </h2>

          <div className="space-y-4">
            <label className="flex items-center justify-between p-3 border border-b2b-gray-200 rounded-lg hover:bg-b2b-gray-50 cursor-pointer">
              <div>
                <p className="font-medium text-b2b-dark">Low Stock Alerts</p>
                <p className="text-sm text-b2b-gray-500">
                  Get notified when products are running low
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.low_stock_alerts}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    low_stock_alerts: e.target.checked,
                  })
                }
                className="w-5 h-5 text-b2b-blue border-b2b-gray-300 rounded focus:ring-b2b-blue"
              />
            </label>

            <label className="flex items-center justify-between p-3 border border-b2b-gray-200 rounded-lg hover:bg-b2b-gray-50 cursor-pointer">
              <div>
                <p className="font-medium text-b2b-dark">Price Drop Alerts</p>
                <p className="text-sm text-b2b-gray-500">
                  Get notified when prices decrease on products you order
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.price_drop_alerts}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    price_drop_alerts: e.target.checked,
                  })
                }
                className="w-5 h-5 text-b2b-blue border-b2b-gray-300 rounded focus:ring-b2b-blue"
              />
            </label>

            <label className="flex items-center justify-between p-3 border border-b2b-gray-200 rounded-lg hover:bg-b2b-gray-50 cursor-pointer">
              <div>
                <p className="font-medium text-b2b-dark">New Product Alerts</p>
                <p className="text-sm text-b2b-gray-500">
                  Get notified about new products in your categories
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.new_product_alerts}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    new_product_alerts: e.target.checked,
                  })
                }
                className="w-5 h-5 text-b2b-blue border-b2b-gray-300 rounded focus:ring-b2b-blue"
              />
            </label>
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            variant="primary"
            size="md"
            icon={<MdSave />}
            onClick={savePreferences}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </div>
    </div>
  );
}

