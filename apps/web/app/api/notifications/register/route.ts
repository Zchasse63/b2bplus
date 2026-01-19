import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { handleError, AuthError, ValidationError, DatabaseError } from '@/lib/middleware/error-handler';

/**
 * Register or update a user's Expo push token
 * POST /api/notifications/register
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'authenticated');
    if (!allowed) return rateLimitResponse!;

    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new AuthError('Unauthorized');
    }

    const body = await request.json();
    const { pushToken } = body;

    if (!pushToken) {
      throw new ValidationError('pushToken is required');
    }

    // Validate push token format (Expo push tokens start with ExponentPushToken[])
    if (!pushToken.startsWith('ExponentPushToken[') && !pushToken.startsWith('ExpoPushToken[')) {
      throw new ValidationError('Invalid Expo push token format');
    }

    // Update user's push token in profiles
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ expo_push_token: pushToken })
      .eq('id', user.id);

    if (updateError) {
      throw DatabaseError.queryFailed('profiles', 'update');
    }

    return NextResponse.json({
      success: true,
      message: 'Push token registered successfully',
    });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Unregister a user's push token (for logout or opt-out)
 * DELETE /api/notifications/register
 */
export async function DELETE(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'authenticated');
    if (!allowed) return rateLimitResponse!;

    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new AuthError('Unauthorized');
    }

    // Remove user's push token
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ expo_push_token: null })
      .eq('id', user.id);

    if (updateError) {
      throw DatabaseError.queryFailed('profiles', 'update');
    }

    return NextResponse.json({
      success: true,
      message: 'Push token unregistered successfully',
    });
  } catch (error) {
    return handleError(error);
  }
}
