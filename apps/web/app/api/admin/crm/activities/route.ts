/**
 * CRM Activities API
 * CRUD operations for CRM activities (calls, emails, meetings, notes)
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRole } from '@/lib/middleware/admin';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { validateRequestBody } from '@/lib/middleware/validation';
import { CRMActivitySchema } from '@/lib/validation/schemas';
import { handleError, ValidationError, DatabaseError } from '@/lib/middleware/error-handler';

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'admin');
    if (!allowed) return rateLimitResponse!;

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

    if (error) {
      throw DatabaseError.queryFailed('lead_activities', 'fetch');
    }

    return NextResponse.json({
      success: true,
      activities: activities || [],
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'admin');
    if (!allowed) return rateLimitResponse!;

    const { user, error: authError } = await checkAdminRole();
    if (authError) return authError;

    // Validate request body
    const validation = await validateRequestBody(request, CRMActivitySchema);
    if (!validation.valid) return validation.response!;

    const supabase = await createClient();
    const { type, subject, description, relatedTo } = validation.data!;

    const { data: activity, error } = await supabase
      .from('lead_activities')
      .insert({
        lead_id: relatedTo.id,
        activity_type: type,
        subject,
        description,
        metadata: { relatedToType: relatedTo.type },
        created_by: user?.id,
      })
      .select('*')
      .single();

    if (error) {
      throw DatabaseError.queryFailed('lead_activities', 'insert');
    }

    return NextResponse.json({
      success: true,
      activity,
    });
  } catch (error) {
    return handleError(error);
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
      throw new ValidationError('Activity ID is required', { id: ['Activity ID is required'] });
    }

    const { data: activity, error } = await supabase
      .from('lead_activities')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw DatabaseError.queryFailed('lead_activities', 'update');
    }

    return NextResponse.json({
      success: true,
      activity,
    });
  } catch (error) {
    return handleError(error);
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
      throw new ValidationError('Activity ID is required', { id: ['Activity ID is required'] });
    }

    const { error } = await supabase
      .from('lead_activities')
      .delete()
      .eq('id', id);

    if (error) {
      throw DatabaseError.queryFailed('lead_activities', 'delete');
    }

    return NextResponse.json({
      success: true,
      message: 'Activity deleted successfully',
    });
  } catch (error) {
    return handleError(error);
  }
}
