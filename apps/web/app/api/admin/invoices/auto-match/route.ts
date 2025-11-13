/**
 * Invoice Auto-Match API
 * 
 * POST /api/admin/invoices/auto-match
 * Automatically match an invoice to a purchase order
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRole } from '@/lib/middleware/admin';
import { processInvoiceMatching } from '@/lib/ai/invoice-po-matching';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/admin/invoices/auto-match
 * 
 * Request body:
 * {
 *   invoiceId: string
 * }
 * 
 * Response:
 * {
 *   matched: boolean,
 *   purchaseOrder?: { id, po_number, total_amount, ... },
 *   confidence?: number,
 *   discrepancies?: Array<{ type, description, severity }>
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authorization
    const { user, error: authError } = await checkAdminRole();
    if (authError) return authError;

    const body = await request.json();
    const { invoiceId } = body;

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'invoiceId is required' },
        { status: 400 }
      );
    }

    // Process invoice matching
    const matchingResult = await processInvoiceMatching(invoiceId);

    const supabase = await createClient();

    // Fetch the matched PO if found
    let purchaseOrder = null;
    if (matchingResult.matched_po_id) {
      const { data: po } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('id', matchingResult.matched_po_id)
        .single();
      purchaseOrder = po;
    }

    return NextResponse.json({
      matched: matchingResult.match_status === 'matched',
      purchaseOrder,
      confidence: matchingResult.match_confidence,
      discrepancies: matchingResult.discrepancies,
      notes: matchingResult.match_notes,
      autoApprovalEligible: matchingResult.auto_approval_eligible,
    });
  } catch (error: any) {
    console.error('Invoice auto-match error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

