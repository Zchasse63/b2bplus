import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { generateJSONPro } from '@/lib/ai/providers/unified'
import { checkAdminRole } from '@/lib/middleware/admin'

/**
 * Customer Analytics Insights API
 * Uses Grok 4.1 Fast Reasoning for deep customer analysis including:
 * - Multi-dimensional behavioral patterns
 * - Lifetime value calculations
 * - Churn risk prediction
 * - Strategic recommendations
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    const { user, error: authError } = await checkAdminRole()
    if (authError) return authError

    const supabase = await createClient()

    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const timeRange = searchParams.get('timeRange') || '90' // days

    if (!customerId) {
      return NextResponse.json(
        { error: 'customerId is required' },
        { status: 400 }
      )
    }

    // Get customer purchase analytics
    const { data: analytics, error: analyticsError } = await supabase
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
      .order('total_revenue', { ascending: false })

    if (analyticsError) {
      throw new Error(`Failed to fetch analytics: ${analyticsError.message}`)
    }

    // Get historical orders for trend analysis
    const { data: historicalOrders, error: ordersError } = await supabase
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
      .gte('order_date', new Date(Date.now() - parseInt(timeRange) * 24 * 60 * 60 * 1000).toISOString())
      .order('order_date', { ascending: true })

    if (ordersError) {
      throw new Error(`Failed to fetch orders: ${ordersError.message}`)
    }

    // Calculate insights
    const insights = {
      overview: calculateOverview(analytics),
      trends: calculateTrends(historicalOrders),
      topProducts: getTopProducts(analytics, 10),
      atRiskProducts: getAtRiskProducts(analytics),
      opportunities: await identifyOpportunities(analytics, supabase),
      aiInsights: await generateAIInsights(analytics, historicalOrders)
    }

    return NextResponse.json({
      success: true,
      customerId,
      timeRange: parseInt(timeRange),
      insights
    })

  } catch (error: any) {
    console.error('Customer insights error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate insights' },
      { status: 500 }
    )
  }
}

/**
 * Calculate overview metrics
 */
function calculateOverview(analytics: any[]) {
  const totalProducts = analytics.length
  const totalRevenue = analytics.reduce((sum, a) => sum + parseFloat(a.total_revenue || 0), 0)
  const totalOrders = analytics.reduce((sum, a) => sum + (a.total_orders || 0), 0)
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

  const activeProducts = analytics.filter(a => a.status === 'active').length
  const atRiskProducts = analytics.filter(a => a.status === 'at_risk').length
  const churnedProducts = analytics.filter(a => a.status === 'churned').length

  return {
    totalProducts,
    totalRevenue,
    totalOrders,
    avgOrderValue,
    activeProducts,
    atRiskProducts,
    churnedProducts
  }
}

/**
 * Calculate purchase trends over time
 */
function calculateTrends(orders: any[]) {
  if (!orders || orders.length === 0) {
    return {
      orderFrequency: [],
      revenueByMonth: [],
      categoryTrends: []
    }
  }

  // Group orders by month
  const ordersByMonth = new Map<string, { count: number; revenue: number }>()
  const categoryByMonth = new Map<string, Map<string, number>>()

  orders.forEach(order => {
    const month = order.order_date.substring(0, 7) // YYYY-MM
    
    if (!ordersByMonth.has(month)) {
      ordersByMonth.set(month, { count: 0, revenue: 0 })
    }
    
    const monthData = ordersByMonth.get(month)!
    monthData.count++
    monthData.revenue += parseFloat(order.total_amount || 0)

    // Track category trends
    order.historical_order_items?.forEach((item: any) => {
      const category = item.products?.category || 'Uncategorized'
      
      if (!categoryByMonth.has(month)) {
        categoryByMonth.set(month, new Map())
      }
      
      const monthCategories = categoryByMonth.get(month)!
      monthCategories.set(category, (monthCategories.get(category) || 0) + parseFloat(item.total_price || 0))
    })
  })

  return {
    orderFrequency: Array.from(ordersByMonth.entries()).map(([month, data]) => ({
      month,
      orders: data.count,
      revenue: data.revenue
    })),
    revenueByMonth: Array.from(ordersByMonth.entries()).map(([month, data]) => ({
      month,
      revenue: data.revenue
    })),
    categoryTrends: Array.from(categoryByMonth.entries()).map(([month, categories]) => ({
      month,
      categories: Array.from(categories.entries()).map(([category, revenue]) => ({
        category,
        revenue
      }))
    }))
  }
}

/**
 * Get top products by revenue
 */
function getTopProducts(analytics: any[], limit: number = 10) {
  return analytics
    .slice(0, limit)
    .map(a => ({
      productId: a.product_id,
      productName: a.products?.name,
      sku: a.products?.sku,
      category: a.products?.category,
      totalRevenue: parseFloat(a.total_revenue || 0),
      totalOrders: a.total_orders,
      totalQuantity: parseFloat(a.total_quantity || 0),
      avgOrderValue: parseFloat(a.avg_order_value || 0),
      lastPurchaseDate: a.last_purchase_date
    }))
}

/**
 * Get products at risk of churn
 */
function getAtRiskProducts(analytics: any[]) {
  return analytics
    .filter(a => {
      const daysSinceLastPurchase = Math.floor(
        (Date.now() - new Date(a.last_purchase_date).getTime()) / (1000 * 60 * 60 * 24)
      )
      const avgFrequency = a.purchase_frequency_days || 30
      return daysSinceLastPurchase > avgFrequency * 1.5 && a.total_orders >= 3
    })
    .map(a => ({
      productId: a.product_id,
      productName: a.products?.name,
      sku: a.products?.sku,
      lastPurchaseDate: a.last_purchase_date,
      daysSinceLastPurchase: Math.floor(
        (Date.now() - new Date(a.last_purchase_date).getTime()) / (1000 * 60 * 60 * 24)
      ),
      avgFrequencyDays: a.purchase_frequency_days,
      totalRevenue: parseFloat(a.total_revenue || 0),
      churnRiskScore: a.churn_risk_score
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
}

/**
 * Identify sales opportunities
 */
async function identifyOpportunities(analytics: any[], supabase: any) {
  const opportunities = []

  // Find products they stopped buying
  const stoppedBuying = analytics.filter(a => {
    const daysSinceLastPurchase = Math.floor(
      (Date.now() - new Date(a.last_purchase_date).getTime()) / (1000 * 60 * 60 * 24)
    )
    return daysSinceLastPurchase > 90 && a.total_orders >= 3
  })

  for (const product of stoppedBuying) {
    opportunities.push({
      type: 'stopped_buying',
      productId: product.product_id,
      productName: product.products?.name,
      lastPurchaseDate: product.last_purchase_date,
      historicalRevenue: parseFloat(product.total_revenue || 0),
      score: 0.8
    })
  }

  // Find cross-sell opportunities (products in same category they haven't bought)
  const purchasedCategories = [...new Set(analytics.map(a => a.products?.category).filter(Boolean))]
  
  for (const category of purchasedCategories) {
    const { data: categoryProducts } = await supabase
      .from('products')
      .select('id, name, sku, category')
      .eq('category', category)
      .limit(5)

    const purchasedProductIds = new Set(analytics.map(a => a.product_id))

    categoryProducts?.forEach((product: any) => {
      if (!purchasedProductIds.has(product.id)) {
        opportunities.push({
          type: 'cross_sell',
          productId: product.id,
          productName: product.name,
          category: product.category,
          score: 0.6
        })
      }
    })
  }

  return opportunities.slice(0, 20)
}

/**
 * Generate AI-powered insights using Gemini
 */
async function generateAIInsights(analytics: any[], orders: any[]) {
  try {
    // Prepare data summary for AI
    const summary = {
      totalProducts: analytics.length,
      totalRevenue: analytics.reduce((sum, a) => sum + parseFloat(a.total_revenue || 0), 0),
      topProducts: analytics.slice(0, 5).map(a => ({
        name: a.products?.name,
        revenue: a.total_revenue,
        orders: a.total_orders
      })),
      recentOrders: orders.slice(-10).map(o => ({
        date: o.order_date,
        amount: o.total_amount
      }))
    }

    const prompt = `Analyze this B2B food service customer's purchase data and provide actionable insights:

Customer Purchase Summary:
${JSON.stringify(summary, null, 2)}

Provide:
1. Key observations about their purchasing patterns
2. Potential risks or concerns
3. Specific recommendations for increasing revenue
4. Products they should consider based on their history

Format as JSON with keys: observations, risks, recommendations, suggestedProducts`

    const insights = await generateJSONPro<any>(prompt, {
      temperature: 0.3,  // Lower for analytical insights
      systemPrompt: 'You are a B2B food service sales analyst with expertise in customer behavior analysis, lifetime value optimization, and churn prediction. Apply deep analytical reasoning to provide strategic, data-driven insights.'
    })
    
    return insights

  } catch (error) {
    console.error('AI insights generation error:', error)
    return {
      observations: ['Unable to generate AI insights at this time'],
      risks: [],
      recommendations: [],
      suggestedProducts: []
    }
  }
}
