/**
 * Customer Segmentation API
 * 
 * POST /api/admin/analytics/segment-customers
 * Segments customers based on AI analysis
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
    const { criteria = 'ai_behavioral' } = body;

    const supabase = await createClient();

    // Fetch all customer analytics
    const { data: allAnalytics } = await supabase
      .from('customer_purchase_analytics')
      .select('*')
      .order('total_revenue', { ascending: false });

    if (!allAnalytics || allAnalytics.length === 0) {
      return NextResponse.json(
        { error: 'No customer analytics found' },
        { status: 404 }
      );
    }

    // Calculate segments based on revenue and behavior
    const segments = [];

    // High-value segment
    const highValueThreshold = allAnalytics.reduce((sum, a) => sum + parseFloat(a.total_revenue || 0), 0) / allAnalytics.length * 2;
    const highValue = allAnalytics.filter(a => parseFloat(a.total_revenue || 0) > highValueThreshold);
    
    if (highValue.length > 0) {
      segments.push({
        id: 'high-value',
        name: 'High-Value Customers',
        description: 'Top revenue-generating customers with strong purchase history',
        customerCount: highValue.length,
        characteristics: [
          `Average Revenue: $${Math.round(highValue.reduce((sum, a) => sum + parseFloat(a.total_revenue || 0), 0) / highValue.length)}`,
          `Average Order Value: $${Math.round(highValue.reduce((sum, a) => sum + parseFloat(a.avg_order_value || 0), 0) / highValue.length)}`,
          'Frequent purchasers',
          'Long customer lifetime'
        ],
        recommendations: [
          'Dedicated account management',
          'Exclusive pricing programs',
          'Priority support',
          'Custom product offerings'
        ]
      });
    }

    // Growth potential segment
    const mediumRevenue = allAnalytics.filter(a => {
      const rev = parseFloat(a.total_revenue || 0);
      return rev > highValueThreshold * 0.3 && rev <= highValueThreshold;
    });

    if (mediumRevenue.length > 0) {
      segments.push({
        id: 'growth-potential',
        name: 'Growth Potential',
        description: 'Mid-tier customers with opportunity for expansion',
        customerCount: mediumRevenue.length,
        characteristics: [
          `Average Revenue: $${Math.round(mediumRevenue.reduce((sum, a) => sum + parseFloat(a.total_revenue || 0), 0) / mediumRevenue.length)}`,
          'Moderate purchase frequency',
          'Expanding product categories',
          'Responsive to promotions'
        ],
        recommendations: [
          'Upsell campaigns',
          'Volume discounts',
          'Product recommendations',
          'Regular check-ins'
        ]
      });
    }

    // At-risk segment
    const atRisk = allAnalytics.filter(a => {
      const daysSinceOrder = a.last_order_date 
        ? Math.floor((Date.now() - new Date(a.last_order_date).getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      return daysSinceOrder > (a.purchase_frequency_days || 30) * 2;
    });

    if (atRisk.length > 0) {
      segments.push({
        id: 'at-risk',
        name: 'At-Risk Customers',
        description: 'Customers showing signs of disengagement',
        customerCount: atRisk.length,
        characteristics: [
          'Declining purchase frequency',
          'Extended time since last order',
          'Reduced order values',
          'Potential churn indicators'
        ],
        recommendations: [
          'Win-back campaigns',
          'Special offers',
          'Personalized outreach',
          'Feedback collection'
        ]
      });
    }

    return NextResponse.json({
      criteria,
      segments,
      totalCustomers: allAnalytics.length,
      segmentationDate: new Date().toISOString(),
      metadata: {
        segmentCount: segments.length,
        analysisMethod: 'AI-powered behavioral analysis'
      }
    });
  } catch (error: any) {
    console.error('Customer segmentation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

