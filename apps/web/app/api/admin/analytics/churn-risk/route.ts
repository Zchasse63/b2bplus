/**
 * Churn Risk Analysis API
 * 
 * POST /api/admin/analytics/churn-risk
 * Calculates churn risk score for a customer using AI
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

    // Calculate churn risk indicators
    const daysSinceLastOrder = analytics.last_order_date 
      ? Math.floor((Date.now() - new Date(analytics.last_order_date).getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    
    const expectedDaysBetweenOrders = analytics.purchase_frequency_days || 30;
    const isOverdue = daysSinceLastOrder > expectedDaysBetweenOrders * 1.5;

    // Generate AI churn risk assessment
    const prompt = `Assess churn risk for this B2B customer:
    
Customer Metrics:
- Total Orders: ${analytics.total_orders}
- Total Revenue: $${analytics.total_revenue}
- Days Since Last Order: ${daysSinceLastOrder}
- Expected Frequency: Every ${expectedDaysBetweenOrders} days
- Is Overdue: ${isOverdue}
- Avg Order Value: $${analytics.avg_order_value}
- Purchase Trend: ${analytics.purchase_trend || 'stable'}

Provide a churn risk score (0-100) and key risk factors.`;

    const assessment = await generateJSONPro<any>(prompt, {
      temperature: 0.3,
      systemPrompt: 'You are a customer retention analyst. Assess churn risk based on behavioral indicators.'
    });

    const churnScore = (assessment.churnScore || (isOverdue ? 65 : 35)) / 100; // Normalize to 0-1
    const riskLevel = churnScore > 0.7 ? 'high' : churnScore > 0.4 ? 'medium' : 'low';

    return NextResponse.json({
      customerId,
      churnRisk: {
        score: churnScore,
        level: riskLevel,
        factors: assessment.riskFactors || [],
        reasoning: assessment.reasoning || assessment.recommendations?.join('; ') || 'Churn risk assessment completed'
      },
      metadata: {
        daysSinceLastOrder,
        isOverdue,
        analysisDate: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Churn risk error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

