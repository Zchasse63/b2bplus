/**
 * Order Risk Assessment Module
 *
 * AI-powered risk assessment for order auto-approval decisions.
 * Analyzes customer history, order patterns, and fraud indicators.
 *
 * Phase 5: Operational AI - Week 21
 */

import { createClient } from '@/lib/supabase/server';
import { generateJSONPro } from '@/lib/gemini';

/**
 * Risk factors that can be identified
 */
export interface RiskFactor {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  score_impact: number; // -1.0 to 1.0
}

/**
 * Risk assessment result
 */
export interface RiskAssessment {
  risk_score: number; // 0.0 to 1.0 (0 = no risk, 1 = high risk)
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_factors: RiskFactor[];
  recommendation: 'auto_approve' | 'manual_review' | 'reject';
  reasoning: string;
  customer_trust_score: number; // 0.0 to 1.0
  order_anomaly_score: number; // 0.0 to 1.0
}

/**
 * Customer history data for risk assessment
 */
interface CustomerHistory {
  total_orders: number;
  total_spent: number;
  avg_order_value: number;
  account_age_days: number;
  last_order_date: string | null;
  payment_failures: number;
  returns_count: number;
  disputes_count: number;
  has_payment_method: boolean;
  outstanding_balance: number;
}

/**
 * Order data for risk assessment
 */
interface OrderData {
  order_id: string;
  customer_id: string;
  total_amount: number;
  item_count: number;
  shipping_method: string;
  payment_method: string;
  items: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
    is_custom: boolean;
  }>;
}

/**
 * Assess risk for an order using AI and rule-based analysis
 */
export async function assessOrderRisk(
  orderId: string
): Promise<RiskAssessment> {
  const supabase = await createClient();

  // Fetch order data
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(`
      id,
      customer_id,
      total_amount,
      shipping_method,
      payment_method,
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

  // Fetch customer history
  const customerHistory = await getCustomerHistory(order.customer_id);

  // Fetch customer profile
  const { data: customer } = await supabase
    .from('customers')
    .select('email, created_at, is_verified')
    .eq('id', order.customer_id)
    .single();

  // Calculate rule-based risk factors
  const riskFactors: RiskFactor[] = [];

  // 1. New customer risk
  if (customerHistory.total_orders === 0) {
    riskFactors.push({
      type: 'new_customer',
      severity: 'medium',
      description: 'First order from this customer',
      score_impact: 0.3,
    });
  }

  // 2. High order value for new customer
  if (customerHistory.total_orders < 3 && order.total_amount > 1000) {
    riskFactors.push({
      type: 'high_value_new_customer',
      severity: 'high',
      description: `High order value ($${order.total_amount}) for customer with only ${customerHistory.total_orders} previous orders`,
      score_impact: 0.4,
    });
  }

  // 3. Order value significantly higher than average
  if (customerHistory.avg_order_value > 0) {
    const valueRatio = order.total_amount / customerHistory.avg_order_value;
    if (valueRatio > 3) {
      riskFactors.push({
        type: 'unusual_order_value',
        severity: 'medium',
        description: `Order value is ${valueRatio.toFixed(1)}x higher than customer's average`,
        score_impact: 0.25,
      });
    }
  }

  // 4. Payment failures
  if (customerHistory.payment_failures > 0) {
    riskFactors.push({
      type: 'payment_history',
      severity: customerHistory.payment_failures > 2 ? 'high' : 'medium',
      description: `Customer has ${customerHistory.payment_failures} previous payment failures`,
      score_impact: Math.min(customerHistory.payment_failures * 0.15, 0.5),
    });
  }

  // 5. High return rate
  if (customerHistory.total_orders > 0) {
    const returnRate = customerHistory.returns_count / customerHistory.total_orders;
    if (returnRate > 0.3) {
      riskFactors.push({
        type: 'high_return_rate',
        severity: 'medium',
        description: `Customer has ${(returnRate * 100).toFixed(0)}% return rate`,
        score_impact: 0.2,
      });
    }
  }

  // 6. Disputes
  if (customerHistory.disputes_count > 0) {
    riskFactors.push({
      type: 'disputes',
      severity: 'high',
      description: `Customer has ${customerHistory.disputes_count} previous disputes`,
      score_impact: Math.min(customerHistory.disputes_count * 0.2, 0.6),
    });
  }

  // 7. Outstanding balance
  if (customerHistory.outstanding_balance > 0) {
    riskFactors.push({
      type: 'outstanding_balance',
      severity: customerHistory.outstanding_balance > 500 ? 'high' : 'medium',
      description: `Customer has $${customerHistory.outstanding_balance.toFixed(2)} outstanding balance`,
      score_impact: Math.min(customerHistory.outstanding_balance / 1000, 0.4),
    });
  }

  // 8. No payment method on file
  if (!customerHistory.has_payment_method) {
    riskFactors.push({
      type: 'no_payment_method',
      severity: 'low',
      description: 'No payment method on file',
      score_impact: 0.1,
    });
  }

  // 9. Unverified email
  if (!customer?.is_verified) {
    riskFactors.push({
      type: 'unverified_email',
      severity: 'low',
      description: 'Email address not verified',
      score_impact: 0.15,
    });
  }

  // Calculate base risk score from factors
  const baseRiskScore = Math.min(
    riskFactors.reduce((sum, factor) => sum + factor.score_impact, 0),
    1.0
  );

  // Calculate customer trust score (inverse of risk)
  const trustScore = Math.max(
    0,
    1.0 - (baseRiskScore * 0.5) +
    Math.min(customerHistory.total_orders / 20, 0.3) + // Loyalty bonus
    Math.min(customerHistory.account_age_days / 365, 0.2) // Account age bonus
  );

  // Use AI for advanced pattern detection
  const aiAssessment = await performAIRiskAssessment(
    order,
    customerHistory,
    riskFactors
  );

  // Combine rule-based and AI scores
  const finalRiskScore = (baseRiskScore * 0.6) + (aiAssessment.ai_risk_score * 0.4);

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' | 'critical';
  if (finalRiskScore < 0.25) riskLevel = 'low';
  else if (finalRiskScore < 0.5) riskLevel = 'medium';
  else if (finalRiskScore < 0.75) riskLevel = 'high';
  else riskLevel = 'critical';

  // Determine recommendation
  let recommendation: 'auto_approve' | 'manual_review' | 'reject';
  if (finalRiskScore < 0.3 && trustScore > 0.6) {
    recommendation = 'auto_approve';
  } else if (finalRiskScore > 0.7 || riskFactors.some(f => f.severity === 'critical')) {
    recommendation = 'reject';
  } else {
    recommendation = 'manual_review';
  }

  return {
    risk_score: parseFloat(finalRiskScore.toFixed(2)),
    risk_level: riskLevel,
    risk_factors: [...riskFactors, ...aiAssessment.additional_factors],
    recommendation,
    reasoning: aiAssessment.reasoning,
    customer_trust_score: parseFloat(trustScore.toFixed(2)),
    order_anomaly_score: parseFloat(aiAssessment.anomaly_score.toFixed(2)),
  };
}

/**
 * Get customer history for risk assessment
 */
async function getCustomerHistory(customerId: string): Promise<CustomerHistory> {
  const supabase = await createClient();

  // Get customer account age from profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('created_at')
    .eq('id', customerId)
    .single();

  const accountAgeDays = profile
    ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Get order history
  const { data: orders } = await supabase
    .from('orders')
    .select('total_amount, created_at, status')
    .eq('customer_id', customerId)
    .neq('status', 'cancelled');

  const totalOrders = orders?.length || 0;
  const totalSpent = orders?.reduce((sum, o) => sum + parseFloat(o.total_amount), 0) || 0;
  const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
  const lastOrderDate = orders?.[0]?.created_at || null;

  // Get actual payment failures from database
  const { data: paymentFailuresData } = await supabase
    .from('payment_failures')
    .select('id')
    .eq('customer_id', customerId);

  const paymentFailures = paymentFailuresData?.length || 0;

  // Get actual returns count from database
  const { data: returnsData } = await supabase
    .from('order_returns')
    .select('id')
    .eq('customer_id', customerId);

  const returnsCount = returnsData?.length || 0;

  // Get actual disputes count from database
  const { data: disputesData } = await supabase
    .from('customer_disputes')
    .select('id')
    .eq('customer_id', customerId);

  const disputesCount = disputesData?.length || 0;

  // Check for payment method (would integrate with payment provider in future)
  // For now, assume true if customer has completed orders
  const hasPaymentMethod = totalOrders > 0;

  // Get outstanding balance from invoices with pending status
  const { data: pendingInvoices } = await supabase
    .from('invoices')
    .select('total_amount')
    .eq('customer_id', customerId)
    .eq('status', 'pending');

  const outstandingBalance = pendingInvoices?.reduce((sum, inv) => sum + parseFloat(inv.total_amount), 0) || 0;

  return {
    total_orders: totalOrders,
    total_spent: totalSpent,
    avg_order_value: avgOrderValue,
    account_age_days: accountAgeDays,
    last_order_date: lastOrderDate,
    payment_failures: paymentFailures,
    returns_count: returnsCount,
    disputes_count: disputesCount,
    has_payment_method: hasPaymentMethod,
    outstanding_balance: outstandingBalance,
  };
}

/**
 * Use AI to detect advanced risk patterns
 */
async function performAIRiskAssessment(
  order: any,
  customerHistory: CustomerHistory,
  existingFactors: RiskFactor[]
): Promise<{
  ai_risk_score: number;
  anomaly_score: number;
  additional_factors: RiskFactor[];
  reasoning: string;
}> {
  const prompt = `Analyze this B2B order for fraud risk and anomalies:

ORDER DETAILS:
- Order ID: ${order.id}
- Total Amount: $${order.total_amount}
- Item Count: ${order.order_items?.length || 0}
- Shipping Method: ${order.shipping_method}
- Payment Method: ${order.payment_method}

CUSTOMER HISTORY:
- Total Orders: ${customerHistory.total_orders}
- Total Spent: $${customerHistory.total_spent.toFixed(2)}
- Average Order Value: $${customerHistory.avg_order_value.toFixed(2)}
- Account Age: ${customerHistory.account_age_days} days
- Payment Failures: ${customerHistory.payment_failures}
- Returns: ${customerHistory.returns_count}
- Disputes: ${customerHistory.disputes_count}

EXISTING RISK FACTORS:
${existingFactors.map(f => `- ${f.type}: ${f.description} (${f.severity})`).join('\n')}

Analyze for:
1. Unusual ordering patterns
2. Potential fraud indicators
3. Business legitimacy concerns
4. Any other anomalies

Provide:
1. AI risk score (0.0 to 1.0)
2. Anomaly score (0.0 to 1.0)
3. Additional risk factors not covered by rules
4. Detailed reasoning`;

  const result = await generateJSONPro<{
    ai_risk_score: number;
    anomaly_score: number;
    additional_factors: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      score_impact: number;
    }>;
    reasoning: string;
  }>(prompt);

  return result;
}
