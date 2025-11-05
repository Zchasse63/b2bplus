import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { sendPushNotification, NotificationTemplates } from '@/lib/services/notifications';

/**
 * Send notification when order status changes
 * POST /api/notifications/order-update
 *
 * This is called internally when orders are updated
 * Can also be triggered by database webhooks/triggers
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify this is an authenticated request (could also use service role key)
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Allow service role key for internal/automated calls
    const authHeader = request.headers.get('authorization');
    const isServiceRole = authHeader?.includes(process.env.SUPABASE_SERVICE_ROLE_KEY || '');

    if (!user && !isServiceRole) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, status } = body;

    if (!orderId || !status) {
      return NextResponse.json(
        { error: 'orderId and status are required' },
        { status: 400 }
      );
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        user:profiles!orders_user_id_fkey(id, expo_push_token, full_name)
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if user has push token enabled
    if (!order.user?.expo_push_token) {
      return NextResponse.json({
        success: false,
        message: 'User does not have push notifications enabled',
      });
    }

    // Select appropriate notification based on status
    let notification;
    switch (status) {
      case 'submitted':
        notification = NotificationTemplates.orderSubmitted(order.order_number);
        break;
      case 'processing':
        notification = {
          title: 'Order Processing',
          body: `Your order #${order.order_number} is being processed`,
          data: { type: 'order_processing', orderNumber: order.order_number, orderId },
          channelId: 'orders',
          priority: 'default' as const,
        };
        break;
      case 'shipped':
        notification = NotificationTemplates.orderShipped(
          order.order_number,
          order.tracking_number
        );
        break;
      case 'delivered':
        notification = NotificationTemplates.orderDelivered(order.order_number);
        break;
      case 'cancelled':
        notification = {
          title: 'Order Cancelled',
          body: `Your order #${order.order_number} has been cancelled`,
          data: { type: 'order_cancelled', orderNumber: order.order_number, orderId },
          channelId: 'orders',
          priority: 'high' as const,
        };
        break;
      default:
        return NextResponse.json({
          success: false,
          message: `No notification template for status: ${status}`,
        });
    }

    // Send the notification
    const result = await sendPushNotification(order.user.expo_push_token, notification);

    if (!result.success) {
      console.error('Failed to send order notification:', result.error);
      return NextResponse.json({
        success: false,
        error: result.error,
      });
    }

    // Log notification sent
    await supabase.from('notification_logs').insert({
      user_id: order.user.id,
      type: 'order_update',
      title: notification.title,
      body: notification.body,
      data: notification.data,
      sent_at: new Date().toISOString(),
      status: 'sent',
    });

    return NextResponse.json({
      success: true,
      message: 'Notification sent successfully',
    });
  } catch (error: any) {
    console.error('Error in order update notification:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
