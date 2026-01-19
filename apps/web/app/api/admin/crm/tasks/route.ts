/**
 * CRM Tasks API
 * CRUD operations for CRM tasks
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRole } from '@/lib/middleware/admin';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { validateRequestBody } from '@/lib/middleware/validation';
import { CRMTaskSchema } from '@/lib/validation/schemas';
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
    const status = searchParams.get('status');
    const leadId = searchParams.get('leadId');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabase
      .from('tasks')
      .select('*')
      .order('due_date', { ascending: true })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    if (leadId) {
      query = query.eq('lead_id', leadId);
    }

    const { data: tasks, error } = await query;

    if (error) {
      throw DatabaseError.queryFailed('tasks', 'fetch');
    }

    return NextResponse.json({
      success: true,
      tasks: tasks || [],
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
    const validation = await validateRequestBody(request, CRMTaskSchema);
    if (!validation.valid) return validation.response!;

    const supabase = await createClient();
    const { title, description, dueDate, priority, status = 'pending', relatedTo, assignedTo } = validation.data!;

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        related_to_id: relatedTo?.id,
        related_to_type: relatedTo?.type,
        title,
        description,
        due_date: dueDate,
        priority: priority || 'medium',
        status,
        assigned_to: assignedTo || user?.id,
      })
      .select('*')
      .single();

    if (error) {
      throw DatabaseError.queryFailed('tasks', 'insert');
    }

    return NextResponse.json({
      success: true,
      task,
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
      throw new ValidationError('Task ID is required', { id: ['Task ID is required'] });
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw DatabaseError.queryFailed('tasks', 'update');
    }

    return NextResponse.json({
      success: true,
      task,
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
      throw new ValidationError('Task ID is required', { id: ['Task ID is required'] });
    }

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      throw DatabaseError.queryFailed('tasks', 'delete');
    }

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    return handleError(error);
  }
}
