/**
 * CRM Contacts API
 * CRUD operations for CRM contacts
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRole } from '@/lib/middleware/admin';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { validateRequestBody } from '@/lib/middleware/validation';
import { CRMContactSchema } from '@/lib/validation/schemas';
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
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (leadId) {
      query = query.eq('lead_id', leadId);
    }

    const { data: contacts, error } = await query;

    if (error) {
      throw DatabaseError.queryFailed('contacts', 'fetch');
    }

    return NextResponse.json({
      success: true,
      contacts: contacts || [],
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
    const validation = await validateRequestBody(request, CRMContactSchema);
    if (!validation.valid) return validation.response!;

    const supabase = await createClient();
    const { leadId, name, email, phone, customerId, title, notes } = validation.data!;

    const { data: contact, error } = await supabase
      .from('contacts')
      .insert({
        lead_id: leadId,
        customer_id: customerId,
        name,
        email,
        phone,
        title,
        notes,
      })
      .select('*')
      .single();

    if (error) {
      throw DatabaseError.queryFailed('contacts', 'insert');
    }

    return NextResponse.json({
      success: true,
      contact,
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
      throw new ValidationError('Contact ID is required', { id: ['Contact ID is required'] });
    }

    const { data: contact, error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw DatabaseError.queryFailed('contacts', 'update');
    }

    return NextResponse.json({
      success: true,
      contact,
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
      throw new ValidationError('Contact ID is required', { id: ['Contact ID is required'] });
    }

    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id);

    if (error) {
      throw DatabaseError.queryFailed('contacts', 'delete');
    }

    return NextResponse.json({
      success: true,
      message: 'Contact deleted successfully',
    });
  } catch (error) {
    return handleError(error);
  }
}
