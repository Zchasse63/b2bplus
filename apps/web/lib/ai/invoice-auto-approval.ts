/**
 * Invoice Auto-Approval Rules Engine
 * 
 * Evaluates vendor invoices against configurable rules to determine
 * if they can be automatically approved without manual review.
 * 
 * Phase 5: Operational AI - Week 19
 */

import { createClient } from '@/lib/supabase/server';
import { MatchingResult } from './invoice-po-matching';

/**
 * Auto-approval rule from database
 */
export interface AutoApprovalRule {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  priority: number;
  max_amount: number | null;
  min_confidence: number;
  trusted_vendors_only: boolean;
  require_po_match: boolean;
  allowed_vendor_ids: string[] | null;
  blocked_vendor_ids: string[] | null;
}

/**
 * Auto-approval evaluation result
 */
export interface AutoApprovalEvaluation {
  approved: boolean;
  reason: string;
  matched_rules: string[]; // Rule names that passed
  failed_rules: string[]; // Rule names that failed
  confidence_score: number;
}

/**
 * Vendor invoice for approval evaluation
 */
export interface VendorInvoiceForApproval {
  id: string;
  vendor_id: string | null;
  vendor_name: string;
  total_amount: number;
  match_status: string;
  match_confidence: number | null;
  matched_po_id: string | null;
}

/**
 * Fetch active auto-approval rules
 * 
 * Returns rules ordered by priority (highest first)
 */
export async function getActiveAutoApprovalRules(): Promise<AutoApprovalRule[]> {
  const supabase = await createClient();

  const { data: rules, error } = await supabase
    .from('invoice_auto_approval_rules')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: false });

  if (error) {
    console.error('Error fetching auto-approval rules:', error);
    return [];
  }

  return rules || [];
}

/**
 * Check if vendor is trusted
 */
async function isVendorTrusted(vendorId: string | null): Promise<boolean> {
  if (!vendorId) return false;

  const supabase = await createClient();

  const { data: vendor, error } = await supabase
    .from('vendors')
    .select('is_trusted')
    .eq('id', vendorId)
    .single();

  if (error || !vendor) return false;

  return vendor.is_trusted === true;
}

/**
 * Evaluate invoice against a single rule
 */
async function evaluateRule(
  invoice: VendorInvoiceForApproval,
  rule: AutoApprovalRule
): Promise<{ passed: boolean; reason: string }> {
  // Check max amount
  if (rule.max_amount !== null && invoice.total_amount > rule.max_amount) {
    return {
      passed: false,
      reason: `Invoice amount $${invoice.total_amount} exceeds rule limit $${rule.max_amount}`,
    };
  }

  // Check min confidence
  const confidence = invoice.match_confidence || 0;
  if (confidence < rule.min_confidence) {
    return {
      passed: false,
      reason: `Match confidence ${(confidence * 100).toFixed(1)}% is below required ${(rule.min_confidence * 100).toFixed(1)}%`,
    };
  }

  // Check PO match requirement
  if (rule.require_po_match && invoice.match_status !== 'matched') {
    return {
      passed: false,
      reason: `Rule requires PO match, but invoice status is '${invoice.match_status}'`,
    };
  }

  // Check trusted vendors only
  if (rule.trusted_vendors_only) {
    const isTrusted = await isVendorTrusted(invoice.vendor_id);
    if (!isTrusted) {
      return {
        passed: false,
        reason: `Rule requires trusted vendor, but '${invoice.vendor_name}' is not marked as trusted`,
      };
    }
  }

  // Check vendor whitelist
  if (rule.allowed_vendor_ids && rule.allowed_vendor_ids.length > 0) {
    if (!invoice.vendor_id || !rule.allowed_vendor_ids.includes(invoice.vendor_id)) {
      return {
        passed: false,
        reason: `Vendor '${invoice.vendor_name}' is not in the allowed vendor list for this rule`,
      };
    }
  }

  // Check vendor blacklist
  if (rule.blocked_vendor_ids && rule.blocked_vendor_ids.length > 0) {
    if (invoice.vendor_id && rule.blocked_vendor_ids.includes(invoice.vendor_id)) {
      return {
        passed: false,
        reason: `Vendor '${invoice.vendor_name}' is blocked by this rule`,
      };
    }
  }

  // All checks passed
  return {
    passed: true,
    reason: `Invoice meets all criteria for rule '${rule.name}'`,
  };
}

/**
 * Evaluate invoice for auto-approval
 * 
 * Checks invoice against all active rules. Invoice is approved if it passes
 * at least one rule (rules are OR'd, not AND'd).
 * 
 * @param invoice - Vendor invoice to evaluate
 * @returns Auto-approval evaluation result
 */
export async function evaluateInvoiceForAutoApproval(
  invoice: VendorInvoiceForApproval
): Promise<AutoApprovalEvaluation> {
  const rules = await getActiveAutoApprovalRules();

  if (rules.length === 0) {
    return {
      approved: false,
      reason: 'No active auto-approval rules configured',
      matched_rules: [],
      failed_rules: [],
      confidence_score: invoice.match_confidence || 0,
    };
  }

  const matchedRules: string[] = [];
  const failedRules: string[] = [];
  const failureReasons: string[] = [];

  // Evaluate against each rule
  for (const rule of rules) {
    const { passed, reason } = await evaluateRule(invoice, rule);

    if (passed) {
      matchedRules.push(rule.name);
    } else {
      failedRules.push(rule.name);
      failureReasons.push(`${rule.name}: ${reason}`);
    }
  }

  // Invoice is approved if it passes at least one rule
  const approved = matchedRules.length > 0;

  return {
    approved,
    reason: approved
      ? `Invoice approved by rule(s): ${matchedRules.join(', ')}`
      : `Invoice failed all rules:\n${failureReasons.join('\n')}`,
    matched_rules: matchedRules,
    failed_rules: failedRules,
    confidence_score: invoice.match_confidence || 0,
  };
}

/**
 * Process auto-approval for an invoice
 * 
 * Complete workflow:
 * 1. Fetch invoice details
 * 2. Evaluate against auto-approval rules
 * 3. Update invoice approval status
 * 4. Log approval decision
 * 
 * @param invoiceId - Vendor invoice ID
 * @returns Auto-approval evaluation result
 */
export async function processInvoiceAutoApproval(invoiceId: string): Promise<AutoApprovalEvaluation> {
  const supabase = await createClient();

  // Fetch invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from('vendor_invoices')
    .select('id, vendor_id, vendor_name, total_amount, match_status, match_confidence, matched_po_id')
    .eq('id', invoiceId)
    .single();

  if (invoiceError || !invoice) {
    throw new Error('Invoice not found');
  }

  // Evaluate for auto-approval
  const evaluation = await evaluateInvoiceForAutoApproval(invoice);

  // Update invoice approval status
  if (evaluation.approved) {
    await supabase
      .from('vendor_invoices')
      .update({
        approval_status: 'auto_approved',
        approved_at: new Date().toISOString(),
        // Note: approved_by would be null for auto-approval, or we could set it to a system user
      })
      .eq('id', invoiceId);

    // Log admin activity
    await supabase.rpc('log_admin_activity', {
      p_action: 'auto_approve_invoice',
      p_entity_type: 'vendor_invoice',
      p_entity_id: invoiceId,
      p_details: {
        vendor_name: invoice.vendor_name,
        total_amount: invoice.total_amount,
        matched_rules: evaluation.matched_rules,
        confidence_score: evaluation.confidence_score,
      },
    });
  } else {
    // Keep as pending for manual review
    await supabase
      .from('vendor_invoices')
      .update({
        approval_status: 'pending',
      })
      .eq('id', invoiceId);
  }

  return evaluation;
}

/**
 * Create a default auto-approval rule
 * 
 * Helper function to create a sensible default rule for new installations.
 */
export async function createDefaultAutoApprovalRule(): Promise<void> {
  const supabase = await createClient();

  const { data: existingRules } = await supabase
    .from('invoice_auto_approval_rules')
    .select('id')
    .limit(1);

  // Only create if no rules exist
  if (!existingRules || existingRules.length === 0) {
    await supabase
      .from('invoice_auto_approval_rules')
      .insert({
        name: 'Default Auto-Approval Rule',
        description: 'Conservative default rule for auto-approving invoices',
        is_active: true,
        priority: 100,
        max_amount: 5000, // Max $5,000
        min_confidence: 0.95, // 95% confidence required
        trusted_vendors_only: false,
        require_po_match: true, // Must match a PO
      });
  }
}

