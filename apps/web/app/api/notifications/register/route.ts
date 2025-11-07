import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Register or update a user's Expo push token
 * POST /api/notifications/register
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { pushToken } = body;

    if (!pushToken) {
      return NextResponse.json(
        { error: 'pushToken is required' },
        { status: 400 }
      );
    }

    // Validate push token format (Expo push tokens start with ExponentPushToken[])
    if (!pushToken.startsWith('ExponentPushToken[') && !pushToken.startsWith('ExpoPushToken[')) {
      return NextResponse.json(
        { error: 'Invalid Expo push token format' },
        { status: 400 }
      );
    }

    // Update user's push token in profiles
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ expo_push_token: pushToken })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating push token:', updateError);
      return NextResponse.json(
        { error: 'Failed to register push token' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Push token registered successfully',
    });
  } catch (error: unknown) {
    console.error('Error in push token registration:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Unregister a user's push token (for logout or opt-out)
 * DELETE /api/notifications/register
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Remove user's push token
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ expo_push_token: null })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error removing push token:', updateError);
      return NextResponse.json(
        { error: 'Failed to unregister push token' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Push token unregistered successfully',
    });
  } catch (error: unknown) {
    console.error('Error in push token unregistration:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
