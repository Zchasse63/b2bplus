/**
 * Document Search API Route
 * 
 * Provides semantic search, keyword search, and filtering for documents.
 * Supports both AI-powered semantic search and traditional filters.
 * 
 * Phase 5: Operational AI - Week 20
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAdminRole } from '@/lib/auth-helpers';
import { searchDocuments } from '@/lib/ai/document-processing';

export const runtime = 'nodejs';

/**
 * GET /api/admin/documents/search
 * 
 * Search documents with semantic search and filters
 * 
 * Query parameters:
 * - q: Search query (semantic search if provided)
 * - document_type: Filter by document type (comma-separated)
 * - extraction_status: Filter by extraction status
 * - organization_id: Filter by organization
 * - contact_id: Filter by contact
 * - entity_type: Filter by linked entity type
 * - entity_id: Filter by linked entity ID
 * - from_date: Filter by created_at >= date (YYYY-MM-DD)
 * - to_date: Filter by created_at <= date (YYYY-MM-DD)
 * - is_public: Filter by public/private
 * - match_threshold: Semantic search threshold (0.0-1.0, default 0.7)
 * - limit: Max results (default 20, max 100)
 * - offset: Pagination offset (default 0)
 * - sort: Sort field (created_at, name, file_size)
 * - order: Sort order (asc, desc, default desc)
 * 
 * Response:
 * {
 *   success: true,
 *   documents: Array<Document>,
 *   total: number,
 *   query: string,
 *   filters: object
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authorization
    const authCheck = await checkAdminRole();
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: authCheck.message },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    const body = await request.json();

    const {
      q,
      document_type,
      extraction_status,
      organization_id,
      contact_id,
      entity_type,
      entity_id,
      from_date,
      to_date,
      is_public,
      match_threshold = 0.7,
      limit = 20,
      offset = 0,
      sort = 'created_at',
      order = 'desc',
    } = body;

    // If semantic search query provided, use AI search
    if (q && q.trim().length > 0) {
      const documentTypes = document_type
        ? document_type.split(',').map((t: string) => t.trim())
        : undefined;

      const semanticResults = await searchDocuments(q, {
        documentTypes,
        matchThreshold: parseFloat(match_threshold),
        matchCount: parseInt(limit),
      });

      // Apply additional filters to semantic results
      let filteredResults = semanticResults;

      if (extraction_status) {
        filteredResults = filteredResults.filter(
          (doc: any) => doc.extraction_status === extraction_status
        );
      }

      if (organization_id) {
        filteredResults = filteredResults.filter(
          (doc: any) => doc.organization_id === organization_id
        );
      }

      if (contact_id) {
        filteredResults = filteredResults.filter(
          (doc: any) => doc.contact_id === contact_id
        );
      }

      if (is_public !== undefined) {
        filteredResults = filteredResults.filter(
          (doc: any) => doc.is_public === (is_public === 'true' || is_public === true)
        );
      }

      // Fetch full document details for results
      const documentIds = filteredResults.map((doc: any) => doc.id);
      
      if (documentIds.length === 0) {
        return NextResponse.json({
          success: true,
          documents: [],
          total: 0,
          query: q,
          search_type: 'semantic',
          filters: body,
        });
      }

      const { data: documents, error } = await supabase
        .from('documents')
        .select('*')
        .in('id', documentIds)
        .order(sort, { ascending: order === 'asc' });

      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      // Merge similarity scores with document data
      const documentsWithScores = documents.map((doc: any) => {
        const semanticResult = filteredResults.find((r: any) => r.id === doc.id);
        return {
          ...doc,
          similarity_score: semanticResult?.similarity || 0,
        };
      });

      return NextResponse.json({
        success: true,
        documents: documentsWithScores,
        total: documentsWithScores.length,
        query: q,
        search_type: 'semantic',
        filters: body,
      });
    }

    // Traditional database search with filters
    let query = supabase
      .from('documents')
      .select('*', { count: 'exact' });

    // Apply filters
    if (document_type) {
      const types = document_type.split(',').map((t: string) => t.trim());
      query = query.in('document_type', types);
    }

    if (extraction_status) {
      query = query.eq('extraction_status', extraction_status);
    }

    if (organization_id) {
      query = query.eq('organization_id', organization_id);
    }

    if (contact_id) {
      query = query.eq('contact_id', contact_id);
    }

    if (is_public !== undefined) {
      query = query.eq('is_public', is_public === 'true' || is_public === true);
    }

    if (from_date) {
      query = query.gte('created_at', from_date);
    }

    if (to_date) {
      query = query.lte('created_at', to_date);
    }

    // Filter by linked entity
    if (entity_type && entity_id) {
      // Get document IDs linked to this entity
      const { data: links, error: linkError } = await supabase
        .from('document_links')
        .select('document_id')
        .eq('entity_type', entity_type)
        .eq('entity_id', entity_id);

      if (linkError) {
        throw new Error(`Failed to fetch document links: ${linkError.message}`);
      }

      const linkedDocIds = links.map((link: any) => link.document_id);
      
      if (linkedDocIds.length === 0) {
        return NextResponse.json({
          success: true,
          documents: [],
          total: 0,
          search_type: 'filtered',
          filters: body,
        });
      }

      query = query.in('id', linkedDocIds);
    }

    // Apply sorting
    query = query.order(sort, { ascending: order === 'asc' });

    // Apply pagination
    const limitNum = Math.min(parseInt(limit), 100);
    const offsetNum = parseInt(offset);
    query = query.range(offsetNum, offsetNum + limitNum - 1);

    const { data: documents, error, count } = await query;

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      documents: documents || [],
      total: count || 0,
      search_type: 'filtered',
      filters: body,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        has_more: (count || 0) > offsetNum + limitNum,
      },
    });

  } catch (error: any) {
    console.error('Document search error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/documents/search
 * 
 * Get search configuration and available filters
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

    // Get available document types
    const { data: types } = await supabase
      .from('documents')
      .select('document_type')
      .not('document_type', 'is', null);

    const uniqueTypes = [...new Set(types?.map((t: any) => t.document_type) || [])];

    // Get available extraction statuses
    const { data: statuses } = await supabase
      .from('documents')
      .select('extraction_status')
      .not('extraction_status', 'is', null);

    const uniqueStatuses = [...new Set(statuses?.map((s: any) => s.extraction_status) || [])];

    return NextResponse.json({
      success: true,
      config: {
        available_document_types: uniqueTypes,
        available_extraction_statuses: uniqueStatuses,
        available_entity_types: [
          'customer',
          'order',
          'vendor',
          'vendor_invoice',
          'purchase_order',
          'product',
          'contact',
          'organization',
        ],
        sort_fields: ['created_at', 'name', 'file_size', 'extraction_confidence'],
        default_match_threshold: 0.7,
        max_limit: 100,
      },
    });

  } catch (error: any) {
    console.error('Search config error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

