/**
 * Invoice-PO Matching AI Module
 * 
 * Intelligent matching of vendor invoices to purchase orders using Gemini Pro.
 * Provides confidence scoring and discrepancy detection.
 * 
 * Phase 5: Operational AI - Week 19
 */

import { generateJSONPro } from '@/lib/gemini';
import { createClient } from '@/lib/supabase/server';

/**
 * Vendor Invoice structure (from database)
 */
export interface VendorInvoice {
  id: string;
  invoice_number: string;
  vendor_id: string | null;
  vendor_name: string;
  invoice_date: string;
  due_date: string | null;
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  total_amount: number;
  line_items: InvoiceLineItem[];
}

/**
 * Purchase Order structure (from database)
 */
export interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_id: string | null;
  vendor_name: string;
  po_date: string;
  expected_delivery_date: string | null;
  status: string;
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  total_amount: number;
  line_items: POLineItem[];
}

/**
 * Invoice line item
 */
export interface InvoiceLineItem {
  sku?: string;
  product_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total: number;
}

/**
 * PO line item
 */
export interface POLineItem {
  sku?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

/**
 * Matching result with confidence and discrepancies
 */
export interface MatchingResult {
  matched_po_id: string | null;
  match_status: 'matched' | 'partial_match' | 'no_match' | 'unmatched';
  match_confidence: number; // 0.00 to 1.00
  match_notes: string;
  discrepancies: Discrepancy[];
  auto_approval_eligible: boolean;
  auto_approval_reason: string;
}

/**
 * Discrepancy details
 */
export interface Discrepancy {
  type: 'amount' | 'quantity' | 'price' | 'item_missing' | 'item_extra' | 'vendor_mismatch' | 'date_mismatch';
  severity: 'critical' | 'major' | 'minor';
  description: string;
  invoice_value?: any;
  po_value?: any;
  difference?: number;
}

/**
 * Find matching purchase orders for an invoice
 * 
 * Searches for POs that could match the invoice based on:
 * - Vendor match
 * - Amount similarity
 * - Date proximity
 * - Line item overlap
 * 
 * @param invoice - Vendor invoice to match
 * @returns Array of potential PO matches
 */
export async function findPotentialPOMatches(invoice: VendorInvoice): Promise<PurchaseOrder[]> {
  const supabase = await createClient();

  // Search for POs from the same vendor within a reasonable time window
  const invoiceDate = new Date(invoice.invoice_date);
  const searchStartDate = new Date(invoiceDate);
  searchStartDate.setDate(searchStartDate.getDate() - 90); // 90 days before invoice
  const searchEndDate = new Date(invoiceDate);
  searchEndDate.setDate(searchEndDate.getDate() + 30); // 30 days after invoice

  let query = supabase
    .from('purchase_orders')
    .select('*')
    .gte('po_date', searchStartDate.toISOString().split('T')[0])
    .lte('po_date', searchEndDate.toISOString().split('T')[0])
    .in('status', ['pending', 'partial', 'received']) // Only active POs
    .order('po_date', { ascending: false })
    .limit(10);

  // If vendor_id is known, filter by vendor
  if (invoice.vendor_id) {
    query = query.eq('vendor_id', invoice.vendor_id);
  } else {
    // Fuzzy match on vendor name
    query = query.ilike('vendor_name', `%${invoice.vendor_name}%`);
  }

  const { data: pos, error } = await query;

  if (error) {
    console.error('Error fetching potential PO matches:', error);
    return [];
  }

  return pos || [];
}

/**
 * Match invoice to purchase order using AI
 * 
 * Uses Gemini Pro to intelligently match invoice to PO and detect discrepancies.
 * 
 * @param invoice - Vendor invoice
 * @param purchaseOrders - Potential PO matches
 * @returns Matching result with confidence and discrepancies
 */
export async function matchInvoiceToPO(
  invoice: VendorInvoice,
  purchaseOrders: PurchaseOrder[]
): Promise<MatchingResult> {
  // If no POs found, return unmatched
  if (purchaseOrders.length === 0) {
    return {
      matched_po_id: null,
      match_status: 'no_match',
      match_confidence: 0.0,
      match_notes: 'No purchase orders found for this vendor in the relevant time period.',
      discrepancies: [],
      auto_approval_eligible: false,
      auto_approval_reason: 'No matching purchase order found.',
    };
  }

  // Use Gemini Pro to analyze and match
  const prompt = `
You are an expert invoice reconciliation system. Analyze this vendor invoice and match it to the most appropriate purchase order.

INVOICE:
${JSON.stringify(invoice, null, 2)}

POTENTIAL PURCHASE ORDERS:
${JSON.stringify(purchaseOrders, null, 2)}

Your task:
1. Identify the best matching purchase order (if any)
2. Calculate a confidence score (0.00 to 1.00)
3. Detect all discrepancies between invoice and PO
4. Determine if auto-approval is appropriate

Return a JSON object with this structure:
{
  "matched_po_id": "string or null (UUID of best matching PO)",
  "match_status": "matched | partial_match | no_match",
  "match_confidence": number (0.00 to 1.00),
  "match_notes": "string (explanation of matching decision)",
  "discrepancies": [
    {
      "type": "amount | quantity | price | item_missing | item_extra | vendor_mismatch | date_mismatch",
      "severity": "critical | major | minor",
      "description": "string (clear description)",
      "invoice_value": any (optional),
      "po_value": any (optional),
      "difference": number (optional)
    }
  ],
  "auto_approval_eligible": boolean,
  "auto_approval_reason": "string (why auto-approval is or isn't appropriate)"
}

Matching criteria:
- Vendor must match (critical)
- Total amount should be within 5% (major discrepancy if not)
- Line items should substantially overlap (check SKUs and product names)
- Quantities and prices should match or be close
- Invoice date should be after PO date

Confidence scoring:
- 1.00: Perfect match (all fields match exactly)
- 0.90-0.99: Excellent match (minor discrepancies like rounding)
- 0.75-0.89: Good match (some acceptable differences)
- 0.50-0.74: Partial match (significant discrepancies but likely correct PO)
- 0.00-0.49: Poor match (major discrepancies, may be wrong PO)

Auto-approval eligibility:
- Confidence >= 0.95
- No critical discrepancies
- Amount difference <= 2%
- All line items match

Be thorough and precise in your analysis.
`;

  try {
    const result = await generateJSONPro<MatchingResult>(prompt, {
      temperature: 0.2, // Low temperature for consistency
      systemPrompt: 'You are a financial reconciliation expert with deep knowledge of invoice and purchase order matching.',
    });

    return result;
  } catch (error) {
    console.error('Error matching invoice to PO:', error);
    
    // Return a safe default result
    return {
      matched_po_id: null,
      match_status: 'unmatched',
      match_confidence: 0.0,
      match_notes: `AI matching failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      discrepancies: [],
      auto_approval_eligible: false,
      auto_approval_reason: 'AI matching failed.',
    };
  }
}

/**
 * Process invoice matching workflow
 * 
 * Complete workflow:
 * 1. Find potential PO matches
 * 2. Use AI to match and analyze
 * 3. Update invoice record with results
 * 4. Create reconciliation record
 * 
 * @param invoiceId - Vendor invoice ID
 * @returns Matching result
 */
export async function processInvoiceMatching(invoiceId: string): Promise<MatchingResult> {
  const supabase = await createClient();

  // Fetch invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from('vendor_invoices')
    .select('*')
    .eq('id', invoiceId)
    .single();

  if (invoiceError || !invoice) {
    throw new Error('Invoice not found');
  }

  // Find potential PO matches
  const potentialPOs = await findPotentialPOMatches(invoice);

  // Match using AI
  const matchingResult = await matchInvoiceToPO(invoice, potentialPOs);

  // Update invoice with matching results
  await supabase
    .from('vendor_invoices')
    .update({
      matched_po_id: matchingResult.matched_po_id,
      match_status: matchingResult.match_status,
      match_confidence: matchingResult.match_confidence,
      match_notes: matchingResult.match_notes,
      matched_at: new Date().toISOString(),
    })
    .eq('id', invoiceId);

  // Create reconciliation record
  await supabase
    .from('invoice_reconciliation')
    .insert({
      invoice_id: invoiceId,
      vendor_invoice_id: invoiceId,
      reconciliation_status: matchingResult.match_status === 'matched' ? 'matched' : 'discrepancy',
      match_confidence: matchingResult.match_confidence,
      discrepancies: matchingResult.discrepancies,
      auto_approval_eligible: matchingResult.auto_approval_eligible,
      auto_approval_reason: matchingResult.auto_approval_reason,
      discrepancy_details: {
        discrepancies: matchingResult.discrepancies,
        match_notes: matchingResult.match_notes,
      },
    });

  return matchingResult;
}

