/**
 * Invoice Discrepancy Check API
 * 
 * POST /api/admin/invoices/check-discrepancies
 * Check for discrepancies between invoice and purchase order
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRole } from '@/lib/middleware/admin';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/admin/invoices/check-discrepancies
 * 
 * Request body:
 * {
 *   invoiceId: string
 * }
 * 
 * Response:
 * {
 *   discrepancies: Array<{
 *     type: 'amount' | 'date' | 'line_items' | 'vendor',
 *     description: string,
 *     severity: 'low' | 'medium' | 'high',
 *     invoiceValue: any,
 *     poValue: any
 *   }>,
 *   hasDiscrepancies: boolean,
 *   requiresReview: boolean
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

    const supabase = await createClient();

    // Fetch invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('vendor_invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // If no matched PO, no discrepancies to check
    if (!invoice.matched_po_id) {
      return NextResponse.json({
        discrepancies: [],
        hasDiscrepancies: false,
        requiresReview: false,
        message: 'No matched purchase order to compare against',
      });
    }

    // Fetch matched PO
    const { data: po, error: poError } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('id', invoice.matched_po_id)
      .single();

    if (poError || !po) {
      return NextResponse.json(
        { error: 'Matched purchase order not found' },
        { status: 404 }
      );
    }

    // Check for discrepancies
    const discrepancies = [];

    // Amount discrepancy
    const amountDiff = Math.abs(invoice.total_amount - po.total_amount);
    const amountDiffPercent = (amountDiff / po.total_amount) * 100;
    if (amountDiffPercent > 2) {
      discrepancies.push({
        type: 'amount',
        description: `Invoice total (${invoice.total_amount}) differs from PO total (${po.total_amount}) by ${amountDiffPercent.toFixed(2)}%`,
        severity: amountDiffPercent > 10 ? 'high' : 'medium',
        invoiceValue: invoice.total_amount,
        poValue: po.total_amount,
      });
    }

    // Date discrepancy
    const invoiceDate = new Date(invoice.invoice_date);
    const poDate = new Date(po.po_date);
    const daysDiff = Math.abs((invoiceDate.getTime() - poDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 90) {
      discrepancies.push({
        type: 'date',
        description: `Invoice date (${invoice.invoice_date}) is ${daysDiff.toFixed(0)} days from PO date (${po.po_date})`,
        severity: daysDiff > 180 ? 'high' : 'medium',
        invoiceValue: invoice.invoice_date,
        poValue: po.po_date,
      });
    }

    return NextResponse.json({
      discrepancies,
      hasDiscrepancies: discrepancies.length > 0,
      requiresReview: discrepancies.some(d => d.severity === 'high'),
    });
  } catch (error: any) {
    console.error('Discrepancy check error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

