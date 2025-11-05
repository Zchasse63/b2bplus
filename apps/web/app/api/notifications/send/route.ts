import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRole } from '@/lib/middleware/admin';
import {
  sendPushNotification,
  sendBatchPushNotifications,
  sendOrganizationNotification,
} from '@/lib/services/notifications';

/**
 * Send push notifications (Admin only)
 * POST /api/notifications/send
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authorization
    const { user, error: authError } = await checkAdminRole();
    if (authError) return authError;

    const supabase = await createClient();
    const body = await request.json();
    const { type, recipients, title, message, data } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: 'title and message are required' },
        { status: 400 }
      );
    }

    const notification = {
      title,
      body: message,
      data: data || {},
      priority: 'high' as const,
    };

    let result;

    switch (type) {
      case 'single':
        // Send to a single user
        if (!recipients?.userId) {
          return NextResponse.json(
            { error: 'userId is required for single notification' },
            { status: 400 }
          );
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('expo_push_token')
          .eq('id', recipients.userId)
          .single();

        if (!profile?.expo_push_token) {
          return NextResponse.json(
            { error: 'User does not have push notifications enabled' },
            { status: 404 }
          );
        }

        result = await sendPushNotification(profile.expo_push_token, notification);
        break;

      case 'organization':
        // Send to all users in an organization
        if (!recipients?.organizationId) {
          return NextResponse.json(
            { error: 'organizationId is required for organization notification' },
            { status: 400 }
          );
        }

        result = await sendOrganizationNotification(
          recipients.organizationId,
          notification,
          supabase
        );
        break;

      case 'broadcast':
        // Send to all users with push tokens
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('expo_push_token')
          .not('expo_push_token', 'is', null);

        if (!allProfiles || allProfiles.length === 0) {
          return NextResponse.json(
            { error: 'No users with push notifications enabled' },
            { status: 404 }
          );
        }

        const messages = allProfiles.map((p: any) => ({
          pushToken: p.expo_push_token,
          notification,
        }));

        const results = await sendBatchPushNotifications(messages);
        const sent = results.filter((r) => r.success).length;
        const failed = results.filter((r) => !r.success).length;

        result = { sent, failed };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid notification type. Must be: single, organization, or broadcast' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
