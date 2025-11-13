/**
 * CRM Activities API
 * CRUD operations for CRM activities (calls, emails, meetings, notes)
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRole } from '@/lib/middleware/admin';

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await checkAdminRole();
    if (authError) return authError;

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabase
      .from('lead_activities')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (leadId) {
      query = query.eq('lead_id', leadId);
    }

    if (type) {
      query = query.eq('activity_type', type);
    }

    const { data: activities, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      activities: activities || [],
    });
  } catch (error) {
    console.error('Get activities error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await checkAdminRole();
    if (authError) return authError;

    const supabase = await createClient();
    const body = await request.json();
    const { leadId, type, subject, description, metadata } = body;

    if (!leadId || !type || !subject) {
      return NextResponse.json(
        { error: 'Lead ID, type, and subject are required' },
        { status: 400 }
      );
    }

    const validTypes = ['call', 'email', 'meeting', 'note', 'task_completed', 'status_change'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid activity type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const { data: activity, error } = await supabase
      .from('lead_activities')
      .insert({
        lead_id: leadId,
        activity_type: type,
        subject,
        description,
        metadata: metadata || {},
        created_by: user?.id,
      })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      activity,
    });
  } catch (error) {
    console.error('Create activity error:', error);
    return NextResponse.json(
      { error: 'Failed to create activity' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, error: authError } = await checkAdminRole();
    if (authError) return authError;

    const supabase = await createClient();
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }

    const { data: activity, error } = await supabase
      .from('lead_activities')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      activity,
    });
  } catch (error) {
    console.error('Update activity error:', error);
    return NextResponse.json(
      { error: 'Failed to update activity' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, error: authError } = await checkAdminRole();
    if (authError) return authError;

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('lead_activities')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Activity deleted successfully',
    });
  } catch (error) {
    console.error('Delete activity error:', error);
    return NextResponse.json(
      { error: 'Failed to delete activity' },
      { status: 500 }
    );
  }
}

