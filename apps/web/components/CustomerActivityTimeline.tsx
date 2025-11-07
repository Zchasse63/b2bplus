'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/b2b/Card';
import { Badge } from '@/components/b2b/Badge';
import {
  MdShoppingCart,
  MdEmail,
  MdAttachMoney,
  MdNotifications,
  MdAutorenew,
  MdTrendingUp,
  MdWarning,
} from 'react-icons/md';

interface TimelineEvent {
  id: string;
  type: 'order' | 'email' | 'price_change' | 'notification' | 'ai_event';
  title: string;
  description: string;
  timestamp: string;
  metadata?: any;
}

interface CustomerActivityTimelineProps {
  customerId: string;
}

export function CustomerActivityTimeline({ customerId }: CustomerActivityTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchActivityTimeline();
  }, [customerId]);

  const fetchActivityTimeline = async () => {
    setLoading(true);
    try {
      const timeline: TimelineEvent[] = [];

      // Fetch orders
      const { data: orders } = await supabase
        .from('orders')
        .select('id, order_number, total, status, created_at')
        .eq('organization_id', customerId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (orders) {
        orders.forEach((order) => {
          timeline.push({
            id: `order-${order.id}`,
            type: 'order',
            title: `Order ${order.order_number}`,
            description: `Placed order for $${order.total.toFixed(2)} - ${order.status}`,
            timestamp: order.created_at,
            metadata: order,
          });
        });
      }

      // Fetch reorder notifications
      const { data: notifications } = await supabase
        .from('reorder_notifications')
        .select('id, status, created_at, product:products(name)')
        .eq('organization_id', customerId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (notifications) {
        notifications.forEach((notification: any) => {
          timeline.push({
            id: `notification-${notification.id}`,
            type: 'notification',
            title: 'Reorder Notification Sent',
            description: `AI predicted reorder needed for ${notification.product?.name || 'product'}`,
            timestamp: notification.created_at,
            metadata: notification,
          });
        });
      }

      // Add mock AI events (in production, these would come from an AI events table)
      if (orders && orders.length > 0) {
        const lastOrder = orders[0];
        const daysSinceLastOrder = Math.floor(
          (Date.now() - new Date(lastOrder.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceLastOrder > 60) {
          timeline.push({
            id: 'ai-churn-risk',
            type: 'ai_event',
            title: 'Churn Risk Detected',
            description: 'AI detected increased churn risk due to inactivity',
            timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          });
        }

        // Pattern detection
        if (orders.length >= 5) {
          timeline.push({
            id: 'ai-pattern',
            type: 'ai_event',
            title: 'Purchase Pattern Identified',
            description: 'AI identified regular monthly ordering pattern',
            timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          });
        }
      }

      // Sort by timestamp (most recent first)
      timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setEvents(timeline.slice(0, 15)); // Show last 15 events
    } catch (error) {
      console.error('Error fetching activity timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <MdShoppingCart className="text-b2b-blue" />;
      case 'email':
        return <MdEmail className="text-green-600" />;
      case 'price_change':
        return <MdAttachMoney className="text-yellow-600" />;
      case 'notification':
        return <MdNotifications className="text-purple-600" />;
      case 'ai_event':
        return <MdAutorenew className="text-orange-600" />;
      default:
        return <MdTrendingUp className="text-b2b-gray-500" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'order':
        return 'bg-b2b-blue';
      case 'email':
        return 'bg-green-600';
      case 'price_change':
        return 'bg-yellow-600';
      case 'notification':
        return 'bg-purple-600';
      case 'ai_event':
        return 'bg-orange-600';
      default:
        return 'bg-b2b-gray-400';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      return `${Math.floor(diffDays / 7)} weeks ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-center text-b2b-gray-500">Loading activity timeline...</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold text-b2b-dark mb-6">Activity Timeline</h2>

      {events.length > 0 ? (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-b2b-gray-200"></div>

          {/* Events */}
          <div className="space-y-6">
            {events.map((event, index) => (
              <div key={event.id} className="relative pl-12">
                {/* Icon */}
                <div
                  className={`absolute left-0 w-8 h-8 rounded-full ${getEventColor(
                    event.type
                  )} flex items-center justify-center text-white`}
                >
                  {getEventIcon(event.type)}
                </div>

                {/* Content */}
                <div className="bg-b2b-gray-50 rounded-lg p-4 hover:bg-b2b-gray-100 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-b2b-dark">{event.title}</h3>
                    <span className="text-xs text-b2b-gray-500">
                      {formatTimestamp(event.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-b2b-gray-600">{event.description}</p>

                  {/* Additional metadata */}
                  {event.type === 'order' && event.metadata && (
                    <div className="mt-2">
                      <Badge
                        variant={
                          event.metadata.status === 'completed' ? 'success' : 'default'
                        }
                        className="text-xs"
                      >
                        {event.metadata.status}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-center text-b2b-gray-500 py-8">No activity yet</p>
      )}
    </Card>
  );
}

