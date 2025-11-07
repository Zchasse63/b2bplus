/**
 * Phase 2: AI Backend Logic - Invoice Reconciliation API
 * 
 * POST /api/admin/invoices/reconcile
 * Process and reconcile invoices with purchase orders
 * 
 * GET /api/admin/invoices/reconcile
 * Retrieve invoice reconciliation records
 * 
 * PATCH /api/admin/invoices/reconcile
 * Update reconciliation status
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { validateAdminAIRequest } from '@/lib/middleware/ai-security';
import {
  extractInvoiceData,
  findMatchingOrder,
  reconcileInvoice,
} from '@/lib/ai/invoice-processing';
import { logAIUsage } from '@/lib/ai/usage-tracking';

interface ReconcileInvoiceRequest {
  invoiceText: string;
  invoiceFileUrl?: string;
}

interface UpdateReconciliationRequest {
  reconciliationId: string;
  status: 'approved' | 'rejected';
  reviewNotes?: string;
}

/**
 * POST /api/admin/invoices/reconcile
 * Process and reconcile an invoice
 */
export async function POST(request: NextRequest) {
  try {
    // Validate admin request
    const validation = await validateAdminAIRequest(request);
    if (!validation.authorized) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    const supabase = await createClient();
    const body: ReconcileInvoiceRequest = await request.json();
    const { invoiceText, invoiceFileUrl } = body;

    if (!invoiceText || invoiceText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invoice text is required' },
        { status: 400 }
      );
    }

    // Step 1: Extract invoice data using AI
    const invoiceData = await extractInvoiceData(invoiceText);

    // Step 2: Find matching purchase order
    const matchedOrder = await findMatchingOrder(invoiceData);

    if (!matchedOrder) {
      // No matching order found
      const { data: reconciliation, error } = await supabase
        .from('invoice_reconciliation')
        .insert({
          invoice_number: invoiceData.invoiceNumber,
          invoice_date: invoiceData.invoiceDate,
          invoice_total: invoiceData.totalAmount,
          vendor_name: invoiceData.vendorName,
          vendor_id: invoiceData.vendorId,
          order_id: null,
          order_number: null,
          status: 'no_match',
          match_confidence: 0,
          amount_difference: 0,
          ai_notes: 'No matching purchase order found within ±30 days of invoice date',
          recommended_action: 'Manual review required - verify invoice details and search for matching order',
          invoice_file_url: invoiceFileUrl,
        })
        .select('id')
        .single();

      if (error || !reconciliation) {
        throw new Error('Failed to save reconciliation record');
      }

      return NextResponse.json({
        success: true,
        reconciliationId: reconciliation.id,
        status: 'no_match',
        message: 'No matching purchase order found',
        invoiceData,
      });
    }

    // Step 3: Reconcile invoice with order
    const reconciliationResult = await reconcileInvoice(
      invoiceData,
      matchedOrder.orderId
    );

    // Step 4: Save reconciliation to database
    const { data: reconciliation, error } = await supabase
      .from('invoice_reconciliation')
      .insert({
        invoice_number: reconciliationResult.invoiceNumber,
        invoice_date: reconciliationResult.invoiceDate,
        invoice_total: reconciliationResult.invoiceTotal,
        vendor_name: reconciliationResult.vendorName,
        vendor_id: reconciliationResult.vendorId,
        order_id: reconciliationResult.matchedOrderId,
        order_number: reconciliationResult.matchedOrderNumber,
        status: reconciliationResult.status,
        match_confidence: reconciliationResult.matchConfidence,
        amount_difference: reconciliationResult.amountDifference,
        quantity_discrepancies: reconciliationResult.quantityDiscrepancies,
        price_discrepancies: reconciliationResult.priceDiscrepancies,
        missing_items: reconciliationResult.missingItems,
        extra_items: reconciliationResult.extraItems,
        ai_notes: reconciliationResult.aiNotes,
        recommended_action: reconciliationResult.recommendedAction,
        invoice_file_url: invoiceFileUrl,
      })
      .select('id')
      .single();

    if (error || !reconciliation) {
      throw new Error('Failed to save reconciliation record');
    }

    // Log AI usage
    await logAIUsage({
      user_id: validation.userId,
      organization_id: null,
      endpoint: '/api/admin/invoices/reconcile',
      model: 'gemini-2.0-flash-exp',
      input_tokens: invoiceText.length / 4, // Rough estimate
      output_tokens: 500,
      total_tokens: invoiceText.length / 4 + 500,
      cost: 0.0003,
      success: true,
    });

    return NextResponse.json({
      success: true,
      reconciliationId: reconciliation.id,
      status: reconciliationResult.status,
      matchConfidence: reconciliationResult.matchConfidence,
      matchedOrder: {
        orderId: reconciliationResult.matchedOrderId,
        orderNumber: reconciliationResult.matchedOrderNumber,
      },
      discrepancies: {
        amountDifference: reconciliationResult.amountDifference,
        quantityDiscrepancies: reconciliationResult.quantityDiscrepancies.length,
        priceDiscrepancies: reconciliationResult.priceDiscrepancies.length,
        missingItems: reconciliationResult.missingItems.length,
        extraItems: reconciliationResult.extraItems.length,
      },
      aiNotes: reconciliationResult.aiNotes,
      recommendedAction: reconciliationResult.recommendedAction,
    });

  } catch (error) {
    console.error('Invoice reconciliation error:', error);
    return NextResponse.json(
      { error: 'Failed to reconcile invoice' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/invoices/reconcile
 * Get invoice reconciliation records
 */
export async function GET(request: NextRequest) {
  try {
    // Validate admin request
    const validation = await validateAdminAIRequest(request);
    if (!validation.authorized) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabase
      .from('invoice_reconciliation')
      .select(`
        *,
        orders(id, order_number, total, status)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: reconciliations, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      reconciliations: reconciliations || [],
    });

  } catch (error) {
    console.error('Get invoice reconciliations error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice reconciliations' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/invoices/reconcile
 * Update reconciliation status
 */
export async function PATCH(request: NextRequest) {
  try {
    // Validate admin request
    const validation = await validateAdminAIRequest(request);
    if (!validation.authorized) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    const supabase = await createClient();
    const body: UpdateReconciliationRequest = await request.json();
    const { reconciliationId, status, reviewNotes } = body;

    if (!reconciliationId || !status) {
      return NextResponse.json(
        { error: 'Reconciliation ID and status are required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('invoice_reconciliation')
      .update({
        status,
        reviewed_by: validation.userId,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes,
      })
      .eq('id', reconciliationId);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: `Reconciliation ${status}`,
    });

  } catch (error) {
    console.error('Update invoice reconciliation error:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice reconciliation' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/invoices/reconcile?id=xxx
 * Delete an invoice reconciliation record
 */
export async function DELETE(request: NextRequest) {
  try {
    // Validate admin request
    const validation = await validateAdminAIRequest(request);
    if (!validation.authorized) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const reconciliationId = searchParams.get('id');

    if (!reconciliationId) {
      return NextResponse.json(
        { error: 'Reconciliation ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('invoice_reconciliation')
      .delete()
      .eq('id', reconciliationId);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Reconciliation record deleted',
    });

  } catch (error) {
    console.error('Delete invoice reconciliation error:', error);
    return NextResponse.json(
      { error: 'Failed to delete reconciliation record' },
      { status: 500 }
    );
  }
}

