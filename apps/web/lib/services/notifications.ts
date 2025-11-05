import { Expo, ExpoPushMessage, ExpoPushTicket, ExpoPushSuccessTicket } from 'expo-server-sdk';

// Create a new Expo SDK client
const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN,
  useFcmV1: true, // Use FCM HTTP v1 API
});

export interface PushNotificationData {
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
  categoryId?: string;
  priority?: 'default' | 'normal' | 'high';
}

/**
 * Send a push notification to a single device
 * @param pushToken - Expo push token
 * @param notification - Notification data
 * @returns Success status and ticket or error
 */
export async function sendPushNotification(
  pushToken: string,
  notification: PushNotificationData
): Promise<{ success: boolean; ticket?: ExpoPushTicket; error?: string }> {
  // Check that the token is a valid Expo push token
  if (!Expo.isExpoPushToken(pushToken)) {
    return {
      success: false,
      error: `Push token ${pushToken} is not a valid Expo push token`,
    };
  }

  const message: ExpoPushMessage = {
    to: pushToken,
    sound: notification.sound ?? 'default',
    title: notification.title,
    body: notification.body,
    data: notification.data,
    badge: notification.badge,
    channelId: notification.channelId,
    categoryId: notification.categoryId,
    priority: notification.priority ?? 'high',
  };

  try {
    const ticketChunk = await expo.sendPushNotificationsAsync([message]);
    const ticket = ticketChunk[0];

    if (ticket.status === 'error') {
      console.error(`Error sending push notification:`, ticket.message);
      return {
        success: false,
        error: ticket.message,
      };
    }

    return {
      success: true,
      ticket,
    };
  } catch (error: any) {
    console.error('Exception while sending push notification:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Send push notifications to multiple devices
 * @param messages - Array of push token and notification pairs
 * @returns Results array with success/error for each notification
 */
export async function sendBatchPushNotifications(
  messages: Array<{ pushToken: string; notification: PushNotificationData }>
): Promise<Array<{ success: boolean; ticket?: ExpoPushTicket; error?: string }>> {
  const expoPushMessages: ExpoPushMessage[] = [];
  const invalidTokens: number[] = [];

  // Build messages and track invalid tokens
  messages.forEach((msg, index) => {
    if (!Expo.isExpoPushToken(msg.pushToken)) {
      invalidTokens.push(index);
      return;
    }

    expoPushMessages.push({
      to: msg.pushToken,
      sound: msg.notification.sound ?? 'default',
      title: msg.notification.title,
      body: msg.notification.body,
      data: msg.notification.data,
      badge: msg.notification.badge,
      channelId: msg.notification.channelId,
      categoryId: msg.notification.categoryId,
      priority: msg.notification.priority ?? 'high',
    });
  });

  // Send in chunks (Expo recommends chunks of 100)
  const chunks = expo.chunkPushNotifications(expoPushMessages);
  const tickets: ExpoPushTicket[] = [];

  try {
    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }

    // Map results back to original messages
    const results: Array<{ success: boolean; ticket?: ExpoPushTicket; error?: string }> = [];
    let ticketIndex = 0;

    for (let i = 0; i < messages.length; i++) {
      if (invalidTokens.includes(i)) {
        results.push({
          success: false,
          error: `Invalid Expo push token: ${messages[i].pushToken}`,
        });
      } else {
        const ticket = tickets[ticketIndex++];
        if (ticket.status === 'error') {
          results.push({
            success: false,
            error: ticket.message,
          });
        } else {
          results.push({
            success: true,
            ticket,
          });
        }
      }
    }

    return results;
  } catch (error: any) {
    console.error('Exception while sending batch push notifications:', error);
    // Return error for all messages
    return messages.map(() => ({
      success: false,
      error: error.message,
    }));
  }
}

/**
 * Send notification to all users in an organization
 * @param organizationId - Organization ID
 * @param notification - Notification data
 * @param supabase - Supabase client instance
 * @returns Number of notifications sent and failed
 */
export async function sendOrganizationNotification(
  organizationId: string,
  notification: PushNotificationData,
  supabase: any
): Promise<{ sent: number; failed: number }> {
  // Get all users in the organization with push tokens
  const { data: members, error } = await supabase
    .from('organization_members')
    .select(`
      user_id,
      profiles!inner(expo_push_token)
    `)
    .eq('organization_id', organizationId)
    .not('profiles.expo_push_token', 'is', null);

  if (error || !members || members.length === 0) {
    console.error('Error fetching organization members:', error);
    return { sent: 0, failed: 0 };
  }

  const messages = members
    .filter((member: any) => member.profiles?.expo_push_token)
    .map((member: any) => ({
      pushToken: member.profiles.expo_push_token,
      notification,
    }));

  const results = await sendBatchPushNotifications(messages);

  const sent = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return { sent, failed };
}

/**
 * Notification templates for common events
 */
export const NotificationTemplates = {
  orderSubmitted: (orderNumber: string): PushNotificationData => ({
    title: 'Order Submitted',
    body: `Your order #${orderNumber} has been submitted successfully`,
    data: { type: 'order_submitted', orderNumber },
    channelId: 'orders',
    priority: 'high',
  }),

  orderShipped: (orderNumber: string, trackingNumber?: string): PushNotificationData => ({
    title: 'Order Shipped',
    body: trackingNumber
      ? `Your order #${orderNumber} has shipped. Tracking: ${trackingNumber}`
      : `Your order #${orderNumber} has shipped`,
    data: { type: 'order_shipped', orderNumber, trackingNumber },
    channelId: 'orders',
    priority: 'high',
  }),

  orderDelivered: (orderNumber: string): PushNotificationData => ({
    title: 'Order Delivered',
    body: `Your order #${orderNumber} has been delivered`,
    data: { type: 'order_delivered', orderNumber },
    channelId: 'orders',
    priority: 'high',
  }),

  invoiceGenerated: (invoiceNumber: string, amount: number): PushNotificationData => ({
    title: 'Invoice Ready',
    body: `Invoice #${invoiceNumber} for $${amount.toFixed(2)} is ready`,
    data: { type: 'invoice_generated', invoiceNumber },
    channelId: 'invoices',
    priority: 'default',
  }),

  lowStock: (productName: string): PushNotificationData => ({
    title: 'Low Stock Alert',
    body: `${productName} is running low on stock`,
    data: { type: 'low_stock', productName },
    channelId: 'inventory',
    priority: 'default',
  }),

  promotionAvailable: (title: string, message: string): PushNotificationData => ({
    title,
    body: message,
    data: { type: 'promotion' },
    channelId: 'marketing',
    priority: 'normal',
  }),
};
