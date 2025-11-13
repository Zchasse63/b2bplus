/**
 * Order Auto-Approval Engine
 * 
 * Evaluates orders against configurable rules and AI risk assessment
 * to determine if they can be automatically approved.
 * 
 * Phase 5: Operational AI - Week 21
 */

import { createClient } from '@/lib/supabase/server';
import { assessOrderRisk, RiskAssessment } from './order-risk-assessment';

/**
 * Auto-approval rule from database
 */
interface AutoApprovalRule {
  id: string;
  name: string;
  priority: number;
  is_active: boolean;
  
  // Amount limits
  max_order_amount: number | null;
  min_order_amount: number | null;
  
  // Customer criteria
  min_customer_lifetime_value: number | null;
  min_orders_count: number | null;
  min_account_age_days: number | null;
  trusted_customers_only: boolean;
  allowed_customer_ids: string[] | null;
  blocked_customer_ids: string[] | null;
  
  // Payment criteria
  require_payment_on_file: boolean;
  allowed_payment_methods: string[] | null;
  max_outstanding_balance: number | null;
  
  // Order criteria
  require_all_items_in_stock: boolean;
  max_custom_items: number;
  allowed_shipping_methods: string[] | null;
  
  // Risk assessment
  min_risk_score: number | null;
  max_risk_score: number | null;
  
  // Time-based
  business_hours_only: boolean;
  excluded_days: string[] | null;
}

/**
 * Auto-approval evaluation result
 */
export interface AutoApprovalResult {
  eligible: boolean;
  matched_rule: AutoApprovalRule | null;
  risk_assessment: RiskAssessment;
  reasons: string[];
  recommendation: 'auto_approve' | 'manual_review' | 'reject';
}

/**
 * Evaluate an order for auto-approval
 */
export async function evaluateOrderForAutoApproval(
  orderId: string
): Promise<AutoApprovalResult> {
  const supabase = await createClient();

  // Fetch order with related data
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(`
      id,
      customer_id,
      total_amount,
      shipping_method,
      payment_method,
      created_at,
      order_items (
        product_id,
        quantity,
        unit_price
      )
    `)
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    throw new Error(`Failed to fetch order: ${orderError?.message}`);
  }

  // Perform AI risk assessment
  const riskAssessment = await assessOrderRisk(orderId);

  // If AI recommends rejection, don't auto-approve
  if (riskAssessment.recommendation === 'reject') {
    return {
      eligible: false,
      matched_rule: null,
      risk_assessment: riskAssessment,
      reasons: ['AI risk assessment recommends rejection', ...riskAssessment.risk_factors.map(f => f.description)],
      recommendation: 'reject',
    };
  }

  // Fetch active auto-approval rules (ordered by priority)
  const { data: rules, error: rulesError } = await supabase
    .from('order_auto_approval_rules')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: false });

  if (rulesError) {
    throw new Error(`Failed to fetch auto-approval rules: ${rulesError.message}`);
  }

  if (!rules || rules.length === 0) {
    return {
      eligible: false,
      matched_rule: null,
      risk_assessment: riskAssessment,
      reasons: ['No active auto-approval rules configured'],
      recommendation: 'manual_review',
    };
  }

  // Fetch customer data
  const { data: customer } = await supabase
    .from('customers')
    .select('id, created_at, is_verified')
    .eq('id', order.customer_id)
    .single();

  // Calculate customer metrics
  const { data: customerOrders } = await supabase
    .from('orders')
    .select('total_amount')
    .eq('customer_id', order.customer_id)
    .neq('status', 'cancelled');

  const customerOrdersCount = customerOrders?.length || 0;
  const customerLifetimeValue = customerOrders?.reduce((sum, o) => sum + parseFloat(o.total_amount), 0) || 0;
  const accountAgeDays = customer
    ? Math.floor((Date.now() - new Date(customer.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Check time-based criteria
  const now = new Date();
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const hour = now.getHours();
  const isBusinessHours = hour >= 9 && hour < 17; // 9 AM to 5 PM

  // Evaluate each rule (OR logic - any matching rule approves)
  for (const rule of rules) {
    const failureReasons: string[] = [];

    // Check amount limits
    if (rule.max_order_amount && order.total_amount > rule.max_order_amount) {
      failureReasons.push(`Order amount $${order.total_amount} exceeds rule maximum $${rule.max_order_amount}`);
      continue;
    }

    if (rule.min_order_amount && order.total_amount < rule.min_order_amount) {
      failureReasons.push(`Order amount $${order.total_amount} below rule minimum $${rule.min_order_amount}`);
      continue;
    }

    // Check customer criteria
    if (rule.min_customer_lifetime_value && customerLifetimeValue < rule.min_customer_lifetime_value) {
      failureReasons.push(`Customer LTV $${customerLifetimeValue.toFixed(2)} below minimum $${rule.min_customer_lifetime_value}`);
      continue;
    }

    if (rule.min_orders_count && customerOrdersCount < rule.min_orders_count) {
      failureReasons.push(`Customer has ${customerOrdersCount} orders, minimum ${rule.min_orders_count} required`);
      continue;
    }

    if (rule.min_account_age_days && accountAgeDays < rule.min_account_age_days) {
      failureReasons.push(`Account age ${accountAgeDays} days below minimum ${rule.min_account_age_days} days`);
      continue;
    }

    // Check customer whitelist/blacklist
    if (rule.allowed_customer_ids && rule.allowed_customer_ids.length > 0) {
      if (!rule.allowed_customer_ids.includes(order.customer_id)) {
        failureReasons.push('Customer not in allowed list');
        continue;
      }
    }

    if (rule.blocked_customer_ids && rule.blocked_customer_ids.includes(order.customer_id)) {
      failureReasons.push('Customer is blocked');
      continue;
    }

    // Check payment method
    if (rule.allowed_payment_methods && rule.allowed_payment_methods.length > 0) {
      if (!rule.allowed_payment_methods.includes(order.payment_method)) {
        failureReasons.push(`Payment method ${order.payment_method} not allowed`);
        continue;
      }
    }

    // Check shipping method
    if (rule.allowed_shipping_methods && rule.allowed_shipping_methods.length > 0) {
      if (!rule.allowed_shipping_methods.includes(order.shipping_method)) {
        failureReasons.push(`Shipping method ${order.shipping_method} not allowed`);
        continue;
      }
    }

    // Check risk score
    if (rule.min_risk_score && riskAssessment.risk_score < rule.min_risk_score) {
      failureReasons.push(`Risk score ${riskAssessment.risk_score} below minimum ${rule.min_risk_score}`);
      continue;
    }

    if (rule.max_risk_score && riskAssessment.risk_score > rule.max_risk_score) {
      failureReasons.push(`Risk score ${riskAssessment.risk_score} exceeds maximum ${rule.max_risk_score}`);
      continue;
    }

    // Check time-based criteria
    if (rule.business_hours_only && !isBusinessHours) {
      failureReasons.push('Order placed outside business hours');
      continue;
    }

    if (rule.excluded_days && rule.excluded_days.includes(dayOfWeek)) {
      failureReasons.push(`Orders not auto-approved on ${dayOfWeek}`);
      continue;
    }

    // If we got here, the rule matches!
    return {
      eligible: true,
      matched_rule: rule,
      risk_assessment: riskAssessment,
      reasons: [
        `Matched rule: ${rule.name}`,
        `Risk score: ${riskAssessment.risk_score} (${riskAssessment.risk_level})`,
        `Customer trust score: ${riskAssessment.customer_trust_score}`,
      ],
      recommendation: 'auto_approve',
    };
  }

  // No rules matched
  return {
    eligible: false,
    matched_rule: null,
    risk_assessment: riskAssessment,
    reasons: ['No auto-approval rules matched for this order'],
    recommendation: riskAssessment.recommendation,
  };
}

/**
 * Process auto-approval for an order
 * Creates order_approval record and updates order status if approved
 */
export async function processOrderAutoApproval(
  orderId: string,
  userId?: string
): Promise<{
  success: boolean;
  approval_id: string;
  auto_approved: boolean;
  message: string;
}> {
  const supabase = await createClient();

  // Evaluate order
  const evaluation = await evaluateOrderForAutoApproval(orderId);

  // Create order approval record
  const { data: approval, error: approvalError } = await supabase
    .from('order_approvals')
    .insert({
      order_id: orderId,
      status: evaluation.eligible ? 'approved' : 'pending',
      auto_approval_eligible: evaluation.eligible,
      auto_approval_reason: evaluation.reasons.join('; '),
      matched_rule_id: evaluation.matched_rule?.id,
      matched_rule_name: evaluation.matched_rule?.name,
      risk_score: evaluation.risk_assessment.risk_score,
      risk_factors: evaluation.risk_assessment.risk_factors,
      risk_assessment_details: {
        risk_level: evaluation.risk_assessment.risk_level,
        customer_trust_score: evaluation.risk_assessment.customer_trust_score,
        order_anomaly_score: evaluation.risk_assessment.order_anomaly_score,
        reasoning: evaluation.risk_assessment.reasoning,
      },
      requires_manual_review: !evaluation.eligible,
      manual_review_reason: !evaluation.eligible ? evaluation.reasons.join('; ') : null,
      approved_by: evaluation.eligible ? userId : null,
      approved_at: evaluation.eligible ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (approvalError) {
    throw new Error(`Failed to create approval record: ${approvalError.message}`);
  }

  // If auto-approved, update order status
  if (evaluation.eligible) {
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'approved' })
      .eq('id', orderId);

    if (updateError) {
      console.error('Failed to update order status:', updateError);
    }

    // Log admin activity
    await supabase.rpc('log_admin_activity', {
      p_action: 'auto_approve_order',
      p_entity_type: 'order',
      p_entity_id: orderId,
      p_details: {
        approval_id: approval.id,
        matched_rule: evaluation.matched_rule?.name,
        risk_score: evaluation.risk_assessment.risk_score,
      },
    });
  }

  return {
    success: true,
    approval_id: approval.id,
    auto_approved: evaluation.eligible,
    message: evaluation.eligible
      ? `Order auto-approved via rule: ${evaluation.matched_rule?.name}`
      : `Order requires manual review: ${evaluation.reasons.join('; ')}`,
  };
}

