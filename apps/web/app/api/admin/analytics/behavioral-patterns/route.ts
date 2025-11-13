/**
 * Behavioral Patterns Analysis API
 * 
 * POST /api/admin/analytics/behavioral-patterns
 * Analyzes customer behavioral patterns using AI
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { generateJSONPro } from '@/lib/gemini';
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
    const { data: analytics, error: analyticsError } = await supabase
      .from('customer_purchase_analytics')
      .select('*')
      .eq('customer_id', customerId)
      .single();

    if (analyticsError || !analytics) {
      return NextResponse.json(
        { error: 'Customer analytics not found' },
        { status: 404 }
      );
    }

    // Fetch recent orders for pattern analysis
    const { data: orders } = await supabase
      .from('historical_orders')
      .select('*')
      .eq('customer_id', customerId)
      .order('order_date', { ascending: false })
      .limit(20);

    // Generate AI insights
    const prompt = `Analyze this customer's purchase behavior and identify key patterns:
    
Customer Analytics:
- Total Orders: ${analytics.total_orders}
- Total Revenue: $${analytics.total_revenue}
- Average Order Value: $${analytics.avg_order_value}
- Purchase Frequency: Every ${analytics.purchase_frequency_days} days
- Last Order: ${analytics.last_order_date}
- Top Product Category: ${analytics.top_product_category}

Recent Orders: ${orders?.length || 0} orders in last 90 days

Identify 3-5 key behavioral patterns and provide insights.`;

    const insights = await generateJSONPro(prompt, {
      temperature: 0.3,
      systemPrompt: 'You are a customer behavior analyst. Identify key patterns in purchase behavior.'
    });

    return NextResponse.json({
      customerId,
      patterns: {
        orderingFrequency: insights.orderingFrequency || `Every ${analytics.purchase_frequency_days} days`,
        preferredProducts: insights.preferredProducts || [analytics.top_product_category || 'Various'],
        seasonality: insights.seasonality || 'No clear seasonality detected',
        seasonalTrends: insights.seasonalTrends || {
          detected: false,
          months: [
            { month: 'January', orderCount: 0, revenue: 0 },
            { month: 'February', orderCount: 0, revenue: 0 },
            { month: 'March', orderCount: 0, revenue: 0 },
            { month: 'April', orderCount: 0, revenue: 0 },
            { month: 'May', orderCount: 0, revenue: 0 },
            { month: 'June', orderCount: 0, revenue: 0 },
            { month: 'July', orderCount: 0, revenue: 0 },
            { month: 'August', orderCount: 0, revenue: 0 },
            { month: 'September', orderCount: 0, revenue: 0 },
            { month: 'October', orderCount: 0, revenue: 0 },
            { month: 'November', orderCount: 0, revenue: 0 },
            { month: 'December', orderCount: 0, revenue: 0 }
          ]
        },
        pricesensitivity: insights.priceSensitivity || insights.pricesensitivity || 'Medium',
        spendingTrend: insights.spendingTrend || 'Stable',
        keyObservations: insights.observations || insights.patterns || ['Pattern analysis completed']
      },
      insights: insights.insights || insights.keyInsights || [
        'Customer shows consistent ordering patterns',
        'Purchase frequency indicates regular business needs',
        'Product preferences are well-established',
        'Spending trend is stable over time'
      ],
      metadata: {
        totalOrders: analytics.total_orders,
        analysisDate: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Behavioral patterns error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

