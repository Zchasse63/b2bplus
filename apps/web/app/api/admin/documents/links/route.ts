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
import { checkAdminRole } from '@/lib/auth-helpers';

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
    const authCheck = await checkAdminRole();
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: authCheck.message },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    const body = await request.json();

    const { document_id, entity_type, entity_id, link_type, notes } = body;

    // Validate required fields
    if (!document_id || !entity_type || !entity_id) {
      return NextResponse.json(
        { error: 'document_id, entity_type, and entity_id are required' },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: `Invalid entity_type. Must be one of: ${validEntityTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Check if document exists
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, name')
      .eq('id', document_id)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
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
      return NextResponse.json(
        { error: 'Link already exists' },
        { status: 409 }
      );
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
        created_by: authCheck.userId,
      })
      .select()
      .single();

    if (linkError) {
      throw new Error(`Failed to create link: ${linkError.message}`);
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

  } catch (error: any) {
    console.error('Document link creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
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
    const authCheck = await checkAdminRole();
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: authCheck.message },
        { status: 401 }
      );
    }

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
        throw new Error(`Failed to fetch links: ${error.message}`);
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
        throw new Error(`Failed to fetch linked documents: ${error.message}`);
      }

      return NextResponse.json({
        success: true,
        documents: documents || [],
      });

    } else {
      return NextResponse.json(
        { error: 'Either document_id or (entity_type + entity_id) must be provided' },
        { status: 400 }
      );
    }

  } catch (error: any) {
    console.error('Document links fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
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
    const authCheck = await checkAdminRole();
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: authCheck.message },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get('link_id');

    if (!linkId) {
      return NextResponse.json(
        { error: 'link_id is required' },
        { status: 400 }
      );
    }

    // Get link details before deleting
    const { data: link, error: fetchError } = await supabase
      .from('document_links')
      .select('*')
      .eq('id', linkId)
      .single();

    if (fetchError || !link) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      );
    }

    // Delete link
    const { error: deleteError } = await supabase
      .from('document_links')
      .delete()
      .eq('id', linkId);

    if (deleteError) {
      throw new Error(`Failed to delete link: ${deleteError.message}`);
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

  } catch (error: any) {
    console.error('Document link deletion error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

