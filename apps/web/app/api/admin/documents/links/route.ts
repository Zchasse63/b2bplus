/**
 * Document Links API Route
 *
 * Manage relationships between documents and other entities
 * (customers, orders, vendors, invoices, products, etc.)
 *
 * Phase 5: Operational AI - Week 20
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAdminRole } from '@/lib/middleware/admin';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { handleError, ValidationError, NotFoundError, ConflictError, DatabaseError } from '@/lib/middleware/error-handler';

export const runtime = 'nodejs';

/**
 * POST /api/admin/documents/links
 *
 * Create a link between a document and an entity
 *
 * Request body:
 * {
 *   document_id: string (UUID),
 *   entity_type: string (customer, order, vendor, etc.),
 *   entity_id: string (UUID),
 *   link_type?: string (attachment, reference, related),
 *   notes?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'admin');
    if (!allowed) return rateLimitResponse!;

    const { user, error: authError } = await checkAdminRole();
    if (authError) return authError;

    const supabase = await createClient();
    const body = await request.json();

    const { document_id, entity_type, entity_id, link_type, notes } = body;

    // Validate required fields
    if (!document_id || !entity_type || !entity_id) {
      throw new ValidationError('Missing required fields', {
        document_id: !document_id ? ['document_id is required'] : [],
        entity_type: !entity_type ? ['entity_type is required'] : [],
        entity_id: !entity_id ? ['entity_id is required'] : [],
      });
    }

    // Validate entity_type
    const validEntityTypes = [
      'customer',
      'order',
      'vendor',
      'vendor_invoice',
      'purchase_order',
      'product',
      'contact',
      'organization',
    ];

    if (!validEntityTypes.includes(entity_type)) {
      throw new ValidationError(`Invalid entity_type. Must be one of: ${validEntityTypes.join(', ')}`, {
        entity_type: [`Must be one of: ${validEntityTypes.join(', ')}`],
      });
    }

    // Check if document exists
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, name')
      .eq('id', document_id)
      .single();

    if (docError || !document) {
      throw new NotFoundError('Document', document_id);
    }

    // Check if link already exists
    const { data: existingLink } = await supabase
      .from('document_links')
      .select('id')
      .eq('document_id', document_id)
      .eq('entity_type', entity_type)
      .eq('entity_id', entity_id)
      .single();

    if (existingLink) {
      throw ConflictError.alreadyExists('Document link');
    }

    // Create link
    const { data: link, error: linkError } = await supabase
      .from('document_links')
      .insert({
        document_id,
        entity_type,
        entity_id,
        link_type: link_type || 'attachment',
        notes,
        created_by: user!.id,
      })
      .select()
      .single();

    if (linkError) {
      throw DatabaseError.queryFailed('document_links', 'insert');
    }

    // Log activity
    await supabase.rpc('log_admin_activity', {
      p_action: 'link_document',
      p_entity_type: 'document_link',
      p_entity_id: link.id,
      p_details: {
        document_id,
        document_name: document.name,
        entity_type,
        entity_id,
        link_type: link_type || 'attachment',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Document linked successfully',
      link,
    });

  } catch (error) {
    return handleError(error);
  }
}

/**
 * GET /api/admin/documents/links
 *
 * Get links for a document or entity
 *
 * Query parameters:
 * - document_id: Get all links for a document
 * - entity_type + entity_id: Get all documents linked to an entity
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'admin');
    if (!allowed) return rateLimitResponse!;

    const { user, error: authError } = await checkAdminRole();
    if (authError) return authError;

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const documentId = searchParams.get('document_id');
    const entityType = searchParams.get('entity_type');
    const entityId = searchParams.get('entity_id');

    if (documentId) {
      // Get all links for a document
      const { data: links, error } = await supabase
        .from('document_links')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false });

      if (error) {
        throw DatabaseError.queryFailed('document_links', 'fetch');
      }

      return NextResponse.json({
        success: true,
        links: links || [],
      });

    } else if (entityType && entityId) {
      // Get all documents linked to an entity using the helper function
      const { data: documents, error } = await supabase
        .rpc('get_linked_documents', {
          p_entity_type: entityType,
          p_entity_id: entityId,
        });

      if (error) {
        throw DatabaseError.queryFailed('linked_documents', 'fetch');
      }

      return NextResponse.json({
        success: true,
        documents: documents || [],
      });

    } else {
      throw new ValidationError('Either document_id or (entity_type + entity_id) must be provided', {
        query: ['Either document_id or (entity_type + entity_id) must be provided'],
      });
    }

  } catch (error) {
    return handleError(error);
  }
}

/**
 * DELETE /api/admin/documents/links
 *
 * Remove a link between a document and an entity
 *
 * Query parameters:
 * - link_id: ID of the link to delete
 */
export async function DELETE(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'admin');
    if (!allowed) return rateLimitResponse!;

    const { user, error: authError } = await checkAdminRole();
    if (authError) return authError;

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get('link_id');

    if (!linkId) {
      throw new ValidationError('link_id is required', { link_id: ['link_id is required'] });
    }

    // Get link details before deleting
    const { data: link, error: fetchError } = await supabase
      .from('document_links')
      .select('*')
      .eq('id', linkId)
      .single();

    if (fetchError || !link) {
      throw new NotFoundError('Document link', linkId);
    }

    // Delete link
    const { error: deleteError } = await supabase
      .from('document_links')
      .delete()
      .eq('id', linkId);

    if (deleteError) {
      throw DatabaseError.queryFailed('document_links', 'delete');
    }

    // Log activity
    await supabase.rpc('log_admin_activity', {
      p_action: 'unlink_document',
      p_entity_type: 'document_link',
      p_entity_id: linkId,
      p_details: {
        document_id: link.document_id,
        entity_type: link.entity_type,
        entity_id: link.entity_id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Document link removed successfully',
    });

  } catch (error) {
    return handleError(error);
  }
}
