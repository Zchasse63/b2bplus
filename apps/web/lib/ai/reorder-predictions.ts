/**
 * Phase 2: AI Backend Logic - Reorder Predictions
 *
 * AI-powered reorder prediction algorithm that analyzes purchase patterns
 * and predicts when customers need to reorder products.
 *
 * Uses Gemini 2.5 Pro for sophisticated statistical analysis and
 * pattern recognition with confidence scoring.
 */

import { createClient } from '@/lib/supabase/server';
import { generateJSONPro } from '@/lib/gemini';

/**
 * Purchase pattern analysis result
 */
export interface PurchasePattern {
  productId: string;
  productName: string;
  averageDaysBetweenOrders: number;
  lastOrderDate: Date;
  totalOrders: number;
  averageQuantity: number;
  standardDeviation: number;
  isRegularPurchase: boolean;
}

/**
 * Reorder prediction result
 */
export interface ReorderPrediction {
  productId: string;
  productName: string;
  predictedReorderDate: Date;
  confidenceScore: number; // 0-1
  recommendedQuantity: number;
  averageDaysBetweenOrders: number;
  lastOrderDate: Date;
  totalOrdersAnalyzed: number;
  aiReasoning: string;
}

/**
 * Analyze purchase patterns for a specific product and organization
 */
export async function analyzePurchasePattern(
  organizationId: string,
  productId: string
): Promise<PurchasePattern | null> {
  const supabase = await createClient();

  // Get all orders containing this product for the organization
  const { data: orderItems, error } = await supabase
    .from('order_items')
    .select(`
      quantity,
      orders!inner(
        id,
        organization_id,
        created_at,
        status
      )
    `)
    .eq('product_id', productId)
    .eq('orders.organization_id', organizationId)
    .in('orders.status', ['delivered', 'shipped'])
    .order('orders.created_at', { ascending: true });

  if (error || !orderItems || orderItems.length < 2) {
    // Need at least 2 orders to establish a pattern
    return null;
  }

  // Extract order dates and quantities
  const orders = orderItems.map(item => ({
    date: new Date(item.orders.created_at),
    quantity: item.quantity,
  }));

  // Calculate days between consecutive orders
  const daysBetweenOrders: number[] = [];
  for (let i = 1; i < orders.length; i++) {
    const days = Math.floor(
      (orders[i].date.getTime() - orders[i - 1].date.getTime()) / (1000 * 60 * 60 * 24)
    );
    daysBetweenOrders.push(days);
  }

  // Calculate average days between orders
  const averageDays = daysBetweenOrders.reduce((sum, days) => sum + days, 0) / daysBetweenOrders.length;

  // Calculate standard deviation
  const variance = daysBetweenOrders.reduce((sum, days) => sum + Math.pow(days - averageDays, 2), 0) / daysBetweenOrders.length;
  const standardDeviation = Math.sqrt(variance);

  // Calculate average quantity
  const averageQuantity = orders.reduce((sum, order) => sum + order.quantity, 0) / orders.length;

  // Determine if this is a regular purchase (low standard deviation relative to average)
  const coefficientOfVariation = standardDeviation / averageDays;
  const isRegularPurchase = coefficientOfVariation < 0.3; // Less than 30% variation

  // Get product name
  const { data: product } = await supabase
    .from('products')
    .select('name')
    .eq('id', productId)
    .single();

  return {
    productId,
    productName: product?.name || 'Unknown Product',
    averageDaysBetweenOrders: Math.round(averageDays),
    lastOrderDate: orders[orders.length - 1].date,
    totalOrders: orders.length,
    averageQuantity: Math.round(averageQuantity),
    standardDeviation: Math.round(standardDeviation),
    isRegularPurchase,
  };
}

/**
 * Generate reorder prediction using AI
 */
export async function generateReorderPrediction(
  pattern: PurchasePattern
): Promise<ReorderPrediction> {
  const daysSinceLastOrder = Math.floor(
    (Date.now() - pattern.lastOrderDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const prompt = `Analyze this customer's purchase pattern and predict when they should reorder:

Product: ${pattern.productName}
Average days between orders: ${pattern.averageDaysBetweenOrders}
Standard deviation: ${pattern.standardDeviation}
Last order date: ${pattern.lastOrderDate.toISOString().split('T')[0]}
Days since last order: ${daysSinceLastOrder}
Total orders analyzed: ${pattern.totalOrders}
Average quantity per order: ${pattern.averageQuantity}
Is regular purchase: ${pattern.isRegularPurchase ? 'Yes' : 'No'}

Based on this data, predict:
1. How many days from today should they reorder?
2. What quantity should they order?
3. How confident are you in this prediction (0-1)?
4. Provide reasoning for your prediction

Respond with JSON:
{
  "daysUntilReorder": number (can be negative if overdue),
  "recommendedQuantity": number,
  "confidenceScore": number (0-1),
  "reasoning": "explanation of prediction"
}

Consider:
- Regular purchases have higher confidence
- If overdue (days since last order > average), recommend immediate reorder
- Adjust quantity based on historical average
- Lower confidence if pattern is irregular (high standard deviation)`;

  const prediction = await generateJSONPro<{
    daysUntilReorder: number;
    recommendedQuantity: number;
    confidenceScore: number;
    reasoning: string;
  }>(prompt, {
    temperature: 0.2,  // Lower temperature for statistical analysis
    maxTokens: 600,
    systemPrompt: 'You are an inventory forecasting expert specializing in statistical pattern analysis and demand prediction. Apply rigorous analytical reasoning to purchase patterns.'
  });

  // Calculate predicted reorder date
  const predictedDate = new Date();
  predictedDate.setDate(predictedDate.getDate() + prediction.daysUntilReorder);

  return {
    productId: pattern.productId,
    productName: pattern.productName,
    predictedReorderDate: predictedDate,
    confidenceScore: Math.min(1, Math.max(0, prediction.confidenceScore)),
    recommendedQuantity: Math.max(1, Math.round(prediction.recommendedQuantity)),
    averageDaysBetweenOrders: pattern.averageDaysBetweenOrders,
    lastOrderDate: pattern.lastOrderDate,
    totalOrdersAnalyzed: pattern.totalOrders,
    aiReasoning: prediction.reasoning,
  };
}

/**
 * Generate reorder predictions for all products in an organization
 */
export async function generateOrganizationReorderPredictions(
  organizationId: string,
  minOrders: number = 2,
  minConfidence: number = 0.5
): Promise<ReorderPrediction[]> {
  const supabase = await createClient();

  // Get all products that have been ordered by this organization
  const { data: productIds, error } = await supabase
    .from('order_items')
    .select(`
      product_id,
      orders!inner(organization_id, status)
    `)
    .eq('orders.organization_id', organizationId)
    .in('orders.status', ['delivered', 'shipped']);

  if (error || !productIds) {
    return [];
  }

  // Get unique product IDs
  const uniqueProductIds = [...new Set(productIds.map(item => item.product_id))];

  const predictions: ReorderPrediction[] = [];

  // Analyze each product
  for (const productId of uniqueProductIds) {
    try {
      const pattern = await analyzePurchasePattern(organizationId, productId);

      if (!pattern || pattern.totalOrders < minOrders) {
        continue;
      }

      // Only predict for regular purchases
      if (!pattern.isRegularPurchase) {
        continue;
      }

      const prediction = await generateReorderPrediction(pattern);

      // Only include predictions with sufficient confidence
      if (prediction.confidenceScore >= minConfidence) {
        predictions.push(prediction);
      }
    } catch (error) {
      console.error(`Failed to generate prediction for product ${productId}:`, error);
      // Continue with other products
    }
  }

  // Sort by predicted reorder date (soonest first)
  predictions.sort((a, b) => a.predictedReorderDate.getTime() - b.predictedReorderDate.getTime());

  return predictions;
}

/**
 * Save reorder prediction to database
 */
export async function saveReorderPrediction(
  organizationId: string,
  prediction: ReorderPrediction
): Promise<string> {
  const supabase = await createClient();

  // Check if prediction already exists for this product
  const { data: existing } = await supabase
    .from('reorder_notifications')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('product_id', prediction.productId)
    .eq('status', 'pending')
    .single();

  if (existing) {
    // Update existing prediction
    const { error } = await supabase
      .from('reorder_notifications')
      .update({
        predicted_reorder_date: prediction.predictedReorderDate.toISOString().split('T')[0],
        confidence_score: prediction.confidenceScore,
        recommended_quantity: prediction.recommendedQuantity,
        average_days_between_orders: prediction.averageDaysBetweenOrders,
        last_order_date: prediction.lastOrderDate.toISOString().split('T')[0],
        total_orders_analyzed: prediction.totalOrdersAnalyzed,
        ai_reasoning: prediction.aiReasoning,
      })
      .eq('id', existing.id);

    if (error) {
      throw new Error('Failed to update reorder prediction');
    }

    return existing.id;
  } else {
    // Create new prediction
    const { data, error } = await supabase
      .from('reorder_notifications')
      .insert({
        organization_id: organizationId,
        product_id: prediction.productId,
        predicted_reorder_date: prediction.predictedReorderDate.toISOString().split('T')[0],
        confidence_score: prediction.confidenceScore,
        recommended_quantity: prediction.recommendedQuantity,
        average_days_between_orders: prediction.averageDaysBetweenOrders,
        last_order_date: prediction.lastOrderDate.toISOString().split('T')[0],
        total_orders_analyzed: prediction.totalOrdersAnalyzed,
        ai_reasoning: prediction.aiReasoning,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error('Failed to create reorder prediction');
    }

    return data.id;
  }
}

