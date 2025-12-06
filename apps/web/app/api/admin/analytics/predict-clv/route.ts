/**
 * Customer Lifetime Value Prediction API
 * 
 * POST /api/admin/analytics/predict-clv
 * Predicts customer lifetime value using AI
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { generateJSONPro } from '@/lib/ai/providers/unified';
import { checkAdminRole } from '@/lib/middleware/admin';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // Check admin authorization
    const { user, error: authError } = await checkAdminRole();
    if (authError) return authError;

    const body = await request.json();
    const { customerId } = body;

    if (!customerId) {
      return NextResponse.json(
        { error: 'customerId is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch customer analytics
    const { data: analytics } = await supabase
      .from('customer_purchase_analytics')
      .select('*')
      .eq('customer_id', customerId)
      .single();

    if (!analytics) {
      return NextResponse.json(
        { error: 'Customer analytics not found' },
        { status: 404 }
      );
    }

    // Calculate CLV using multiple methods
    const historicalRevenue = parseFloat(analytics.total_revenue || 0);
    const avgOrderValue = parseFloat(analytics.avg_order_value || 0);
    const purchaseFrequency = analytics.purchase_frequency_days || 30;
    const customerLifetimeDays = analytics.customer_lifetime_days || 365;

    // Simple CLV calculation: (Average Order Value) × (Purchase Frequency) × (Customer Lifetime)
    const ordersPerYear = 365 / purchaseFrequency;
    const projectedAnnualValue = avgOrderValue * ordersPerYear;
    const projectedCLV = projectedAnnualValue * (customerLifetimeDays / 365);

    // Generate AI-enhanced CLV prediction
    const prompt = `Predict customer lifetime value for this B2B customer:
    
Historical Data:
- Total Revenue to Date: $${historicalRevenue}
- Avg Order Value: $${avgOrderValue}
- Purchase Frequency: Every ${purchaseFrequency} days
- Customer Lifetime: ${customerLifetimeDays} days
- Total Orders: ${analytics.total_orders}

Provide a CLV prediction for the next 3 years with confidence level and key drivers.`;

    const prediction = await generateJSONPro(prompt, {
      temperature: 0.3,
      systemPrompt: 'You are a customer value analyst. Predict lifetime value based on historical patterns.'
    });

    const predictedCLV = prediction.predictedCLV || projectedCLV;
    const confidenceLevel = (prediction.confidenceLevel || 0.75) / 100; // Normalize to 0-1

    return NextResponse.json({
      customerId,
      clv: {
        predicted_value: Math.round(predictedCLV),
        confidence: confidenceLevel,
        timeframe: '3 years',
        factors: prediction.drivers || [
          'Purchase frequency',
          'Average order value',
          'Product mix',
          'Market conditions'
        ]
      },
      historicalRevenue,
      riskFactors: prediction.riskFactors || [],
      metadata: {
        ordersPerYear: Math.round(ordersPerYear * 10) / 10,
        projectedAnnualValue: Math.round(projectedAnnualValue),
        analysisDate: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('CLV prediction error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

