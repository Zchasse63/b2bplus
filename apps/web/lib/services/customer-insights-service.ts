import { SupabaseClient } from '@supabase/supabase-js';
import { generateJSONPro } from '@/lib/gemini';

/**
 * Customer Insights Service
 * Separates business logic from API route handler
 * Makes functions testable and reusable
 */

export interface CustomerAnalytics {
  id: string;
  customer_id: string;
  total_revenue: number;
  total_orders: number;
  status: 'active' | 'at_risk' | 'churned';
  products?: any;
  [key: string]: any;
}

export interface HistoricalOrder {
  id: string;
  customer_id: string;
  order_date: string;
  total_amount: number;
  historical_order_items?: any[];
  [key: string]: any;
}

export interface CustomerInsights {
  overview: any;
  trends: any;
  topProducts: any[];
  atRiskProducts: any[];
  opportunities: any[];
  aiInsights: any;
}

/**
 * Fetch customer purchase analytics from database
 */
export async function fetchCustomerAnalytics(
  supabase: SupabaseClient,
  customerId: string
): Promise<CustomerAnalytics[]> {
  const { data, error } = await supabase
    .from('customer_purchase_analytics')
    .select(`
      *,
      products (
        id,
        sku,
        name,
        category,
        price
      )
    `)
    .eq('customer_id', customerId)
    .order('total_revenue', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch analytics: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch historical orders for trend analysis
 */
export async function fetchHistoricalOrders(
  supabase: SupabaseClient,
  customerId: string,
  timeRangeDays: number
): Promise<HistoricalOrder[]> {
  const startDate = new Date(Date.now() - timeRangeDays * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('historical_orders')
    .select(`
      *,
      historical_order_items (
        *,
        products (
          id,
          name,
          category
        )
      )
    `)
    .eq('customer_id', customerId)
    .gte('order_date', startDate)
    .order('order_date', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch orders: ${error.message}`);
  }

  return data || [];
}

/**
 * Calculate overview metrics from analytics
 */
export function calculateOverview(analytics: CustomerAnalytics[]) {
  const totalProducts = analytics.length;
  const totalRevenue = analytics.reduce((sum, a) => sum + (typeof a.total_revenue === 'string' ? parseFloat(a.total_revenue) : (a.total_revenue || 0)), 0);
  const totalOrders = analytics.reduce((sum, a) => sum + (a.total_orders || 0), 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const activeProducts = analytics.filter(a => a.status === 'active').length;
  const atRiskProducts = analytics.filter(a => a.status === 'at_risk').length;
  const churnedProducts = analytics.filter(a => a.status === 'churned').length;

  return {
    totalProducts,
    totalRevenue,
    totalOrders,
    avgOrderValue,
    activeProducts,
    atRiskProducts,
    churnedProducts
  };
}

/**
 * Calculate trends from historical orders
 */
export function calculateTrends(orders: HistoricalOrder[]) {
  if (orders.length === 0) {
    return {
      orderFrequency: 0,
      averageOrderValue: 0,
      trend: 'stable',
      growthRate: 0
    };
  }

  const totalAmount = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const avgOrderValue = totalAmount / orders.length;
  const orderFrequency = orders.length;

  // Calculate growth rate (compare first half to second half)
  const midpoint = Math.floor(orders.length / 2);
  const firstHalf = orders.slice(0, midpoint);
  const secondHalf = orders.slice(midpoint);

  const firstHalfAvg = firstHalf.reduce((sum, o) => sum + (o.total_amount || 0), 0) / firstHalf.length;
  const secondHalfAvg = secondHalf.reduce((sum, o) => sum + (o.total_amount || 0), 0) / secondHalf.length;

  const growthRate = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;
  const trend = growthRate > 5 ? 'growing' : growthRate < -5 ? 'declining' : 'stable';

  return {
    orderFrequency,
    averageOrderValue: avgOrderValue,
    trend,
    growthRate
  };
}

/**
 * Get top products by revenue
 */
export function getTopProducts(analytics: CustomerAnalytics[], limit: number = 10) {
  return analytics
    .slice(0, limit)
    .map(a => ({
      id: a.products?.id,
      name: a.products?.name,
      revenue: a.total_revenue,
      orders: a.total_orders,
      category: a.products?.category
    }));
}

/**
 * Get at-risk products
 */
export function getAtRiskProducts(analytics: CustomerAnalytics[]) {
  return analytics
    .filter(a => a.status === 'at_risk')
    .map(a => ({
      id: a.products?.id,
      name: a.products?.name,
      revenue: a.total_revenue,
      orders: a.total_orders,
      reason: a.reason || 'Declining sales'
    }));
}

/**
 * Identify business opportunities
 */
export async function identifyOpportunities(
  analytics: CustomerAnalytics[],
  supabase: SupabaseClient
): Promise<any[]> {
  // Query for cross-sell opportunities
  const { data: opportunities, error } = await supabase
    .rpc('identify_cross_sell_opportunities', {
      p_customer_id: analytics[0]?.customer_id
    });

  if (error) {
    console.error('Error identifying opportunities:', error);
    return [];
  }

  return opportunities || [];
}

/**
 * Generate AI-powered insights using Gemini
 */
export async function generateAIInsights(
  analytics: CustomerAnalytics[],
  orders: HistoricalOrder[]
) {
  try {
    // Prepare data summary for AI
    const summary = {
      totalProducts: analytics.length,
      totalRevenue: analytics.reduce((sum, a) => sum + (typeof a.total_revenue === 'string' ? parseFloat(a.total_revenue) : (a.total_revenue || 0)), 0),
      topProducts: analytics.slice(0, 5).map(a => ({
        name: a.products?.name,
        revenue: a.total_revenue,
        orders: a.total_orders
      })),
      recentOrders: orders.slice(-10).map(o => ({
        date: o.order_date,
        amount: o.total_amount
      }))
    };

    const prompt = `Analyze this B2B food service customer's purchase data and provide actionable insights:

${JSON.stringify(summary, null, 2)}

Provide strategic insights on:
1. Key behavioral patterns and purchasing habits
2. Potential risks (churn indicators, declining categories)
3. Growth opportunities and recommendations
4. Suggested products or categories to promote

Format as JSON with keys: observations, risks, recommendations, suggestedProducts`;

    const insights = await generateJSONPro(prompt, {
      temperature: 0.3,
      systemPrompt: 'You are a B2B food service sales analyst with expertise in customer behavior analysis, lifetime value optimization, and churn prediction. Apply deep analytical reasoning to provide strategic, data-driven insights.'
    });

    return insights;
  } catch (error) {
    console.error('AI insights generation error:', error);
    return {
      observations: ['Unable to generate AI insights at this time'],
      risks: [],
      recommendations: [],
      suggestedProducts: []
    };
  }
}

/**
 * Generate complete customer insights
 */
export async function generateCustomerInsights(
  supabase: SupabaseClient,
  customerId: string,
  timeRangeDays: number = 90
): Promise<CustomerInsights> {
  // Fetch data
  const analytics = await fetchCustomerAnalytics(supabase, customerId);
  const orders = await fetchHistoricalOrders(supabase, customerId, timeRangeDays);

  // Calculate insights
  return {
    overview: calculateOverview(analytics),
    trends: calculateTrends(orders),
    topProducts: getTopProducts(analytics, 10),
    atRiskProducts: getAtRiskProducts(analytics),
    opportunities: await identifyOpportunities(analytics, supabase),
    aiInsights: await generateAIInsights(analytics, orders)
  };
}

