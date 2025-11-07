'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/b2b/Button';
import { Card } from '@/components/b2b/Card';
import { Badge } from '@/components/b2b/Badge';
import { MdCheckCircle, MdClose, MdFilterList, MdShoppingCart } from 'react-icons/md';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Notification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  status: 'pending' | 'sent' | 'viewed' | 'acted_on' | 'dismissed' | 'expired';
  predicted_reorder_date: string | null;
  predicted_quantity: number | null;
  confidence_level: number | null;
  created_at: string;
  products?: {
    id: string;
    name: string;
    sku: string;
    price: number;
    image_url: string | null;
  };
}

type FilterType = 'all' | 'reorder_reminder' | 'low_stock_alert' | 'price_drop' | 'new_product';
type StatusFilter = 'all' | 'pending' | 'viewed' | 'dismissed';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
      } else {
        setUser(user);
        fetchNotifications(user.id);
      }
    };
    checkAuth();
  }, [router, supabase.auth]);

  const fetchNotifications = async (userId: string) => {
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

      let query = supabase
        .from('reorder_notifications')
        .select(`
          *,
          products(id, name, sku, price, image_url)
        `)
        .eq('organization_id', membership.organization_id)
        .order('created_at', { ascending: false });

      // Apply filters
      if (typeFilter !== 'all') {
        query = query.eq('notification_type', typeFilter);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsViewed = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('reorder_notifications')
        .update({
          status: 'viewed',
          viewed_at: new Date().toISOString(),
        })
        .eq('id', notificationId);

      if (error) throw error;

      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, status: 'viewed' as const } : n
        )
      );
    } catch (error) {
      console.error('Error marking as viewed:', error);
    }
  };

  const dismissNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('reorder_notifications')
        .update({
          status: 'dismissed',
          dismissed_at: new Date().toISOString(),
        })
        .eq('id', notificationId);

      if (error) throw error;

      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, status: 'dismissed' as const } : n
        )
      );
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'warning' as const, label: 'New' },
      sent: { variant: 'info' as const, label: 'Sent' },
      viewed: { variant: 'default' as const, label: 'Viewed' },
      acted_on: { variant: 'success' as const, label: 'Acted On' },
      dismissed: { variant: 'default' as const, label: 'Dismissed' },
      expired: { variant: 'default' as const, label: 'Expired' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      reorder_reminder: 'Reorder Reminder',
      low_stock_alert: 'Low Stock Alert',
      price_drop: 'Price Drop',
      new_product: 'New Product',
    };
    return labels[type as keyof typeof labels] || type;
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-b2b-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-b2b-dark mb-2">Notifications</h1>
          <p className="text-b2b-gray-500">
            Stay updated with reorder reminders, price changes, and more
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6 p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <MdFilterList className="text-b2b-gray-500" />
              <span className="text-sm font-medium text-b2b-dark">Filters:</span>
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as FilterType);
                if (user) fetchNotifications(user.id);
              }}
              className="border border-b2b-gray-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-b2b-blue"
            >
              <option value="all">All Types</option>
              <option value="reorder_reminder">Reorder Reminders</option>
              <option value="low_stock_alert">Low Stock Alerts</option>
              <option value="price_drop">Price Drops</option>
              <option value="new_product">New Products</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusFilter);
                if (user) fetchNotifications(user.id);
              }}
              className="border border-b2b-gray-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-b2b-blue"
            >
              <option value="all">All Status</option>
              <option value="pending">Unread</option>
              <option value="viewed">Read</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>
        </Card>

        {/* Notifications List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-b2b-gray-500">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-b2b-gray-500 mb-4">No notifications found</p>
            <Link href="/products">
              <Button variant="primary" size="sm">
                Browse Products
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <Card key={notification.id} className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-b2b-dark">
                        {notification.title}
                      </h3>
                      {getStatusBadge(notification.status)}
                      <Badge variant="default">
                        {getTypeLabel(notification.notification_type)}
                      </Badge>
                    </div>

                    <p className="text-b2b-gray-600 mb-4">{notification.message}</p>

                    {notification.products && (
                      <div className="flex items-center gap-4 p-3 bg-b2b-gray-50 rounded-lg mb-4">
                        {notification.products.image_url && (
                          <img
                            src={notification.products.image_url}
                            alt={notification.products.name}
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-b2b-dark">
                            {notification.products.name}
                          </p>
                          <p className="text-sm text-b2b-gray-500">
                            SKU: {notification.products.sku}
                          </p>
                          {notification.predicted_quantity && (
                            <p className="text-sm text-b2b-gray-600 mt-1">
                              Recommended quantity: {notification.predicted_quantity}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-b2b-dark">
                            ${notification.products.price.toFixed(2)}
                          </p>
                          {notification.confidence_level && (
                            <p className="text-xs text-b2b-gray-500">
                              {Math.round(notification.confidence_level * 100)}% confidence
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-b2b-gray-400">
                      <span>
                        {new Date(notification.created_at).toLocaleDateString()}
                      </span>
                      {notification.predicted_reorder_date && (
                        <>
                          <span>•</span>
                          <span>
                            Predicted reorder:{' '}
                            {new Date(notification.predicted_reorder_date).toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {notification.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<MdCheckCircle />}
                        onClick={() => markAsViewed(notification.id)}
                      >
                        Mark Read
                      </Button>
                    )}
                    {notification.status !== 'dismissed' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<MdClose />}
                        onClick={() => dismissNotification(notification.id)}
                      >
                        Dismiss
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

