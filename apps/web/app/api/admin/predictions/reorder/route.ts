/**
 * Reorder Predictions API
 * 
 * POST /api/admin/predictions/reorder
 * Generate AI-powered reorder predictions for all customers
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { generateJSON } from '@/lib/ai/providers/unified';
import { checkAdminRole } from '@/lib/middleware/admin';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // Check admin authorization
    const { user, error: authError } = await checkAdminRole();
    if (authError) return authError;

    const supabase = await createClient();

    // Get all customers with purchase history
    const { data: customers, error: customersError } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        company_name
      `)
      .eq('role', 'customer')
      .limit(100);

    if (customersError || !customers) {
      return NextResponse.json(
        { error: 'Failed to fetch customers' },
        { status: 500 }
      );
    }

    const predictions: any[] = [];

    // Generate predictions for each customer
    for (const customer of customers) {
      try {
        // Get customer's order history
        const { data: orders } = await supabase
          .from('orders')
          .select('*')
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (!orders || orders.length < 2) {
          continue; // Skip customers with insufficient order history
        }

        // Calculate purchase frequency
        const orderDates = orders.map(o => new Date(o.created_at).getTime());
        const intervals = [];
        for (let i = 0; i < orderDates.length - 1; i++) {
          intervals.push((orderDates[i] - orderDates[i + 1]) / (1000 * 60 * 60 * 24));
        }
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

        // Get top products
        const { data: topProducts } = await supabase
          .from('order_items')
          .select('product_id, quantity')
          .in('order_id', orders.map(o => o.id))
          .order('quantity', { ascending: false })
          .limit(5);

        // Generate AI prediction
        const prompt = `Based on this customer's purchase history, predict their next reorder:

Customer: ${customer.full_name} (${customer.company_name})
Average Order Interval: ${avgInterval.toFixed(1)} days
Total Orders: ${orders.length}
Last Order: ${new Date(orders[0].created_at).toLocaleDateString()}
Top Products: ${topProducts?.length || 0} products

Generate a prediction with:
1. Predicted reorder date (days from now)
2. Confidence score (0-1)
3. Recommended products
4. Expected order value

Return JSON with: predictedDaysFromNow, confidenceScore, recommendedProducts, expectedValue`;

        const prediction = await generateJSON(prompt, {
          temperature: 0.3,
          systemPrompt: 'You are a B2B purchase pattern analyst. Predict customer reorder timing and products.'
        });

        // Save prediction
        const predictedDate = new Date();
        predictedDate.setDate(predictedDate.getDate() + (prediction.predictedDaysFromNow || Math.round(avgInterval)));

        const { error: saveError } = await supabase
          .from('reorder_predictions')
          .insert({
            customer_id: customer.id,
            predicted_reorder_date: predictedDate.toISOString(),
            confidence_score: prediction.confidenceScore || 0.7,
            recommended_products: prediction.recommendedProducts || [],
            expected_order_value: prediction.expectedValue || orders[0].total_amount,
            status: 'pending',
            created_at: new Date().toISOString(),
          });

        if (!saveError) {
          predictions.push({
            customerId: customer.id,
            customerName: customer.full_name,
            predictedDate: predictedDate.toISOString(),
            confidence: prediction.confidenceScore || 0.7,
          });
        }
      } catch (error) {
        console.error(`Error generating prediction for customer ${customer.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      totalPredictions: predictions.length,
      predictions,
      message: `Generated ${predictions.length} reorder predictions`,
    });

  } catch (error: any) {
    console.error('Reorder predictions error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

