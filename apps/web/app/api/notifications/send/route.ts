import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRole } from '@/lib/middleware/admin';
import {
  sendPushNotification,
  sendBatchPushNotifications,
  sendOrganizationNotification,
} from '@/lib/services/notifications';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { handleError, ValidationError, NotFoundError } from '@/lib/middleware/error-handler';

/**
 * Send push notifications (Admin only)
 * POST /api/notifications/send
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'admin');
    if (!allowed) return rateLimitResponse!;

    // Check admin authorization
    const { user, error: authError } = await checkAdminRole();
    if (authError) return authError;

    const supabase = await createClient();
    const body = await request.json();
    const { type, recipients, title, message, data } = body;

    if (!title || !message) {
      throw new ValidationError('title and message are required');
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
          throw new ValidationError('userId is required for single notification');
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('expo_push_token')
          .eq('id', recipients.userId)
          .single();

        if (!profile?.expo_push_token) {
          throw new NotFoundError('User with push notifications enabled', recipients.userId);
        }

        result = await sendPushNotification(profile.expo_push_token, notification);
        break;

      case 'organization':
        // Send to all users in an organization
        if (!recipients?.organizationId) {
          throw new ValidationError('organizationId is required for organization notification');
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
          throw new NotFoundError('Users with push notifications enabled');
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
        throw new ValidationError('Invalid notification type. Must be: single, organization, or broadcast');
    }

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    return handleError(error);
  }
}
