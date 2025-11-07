import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/gemini'
import { sanitizeForPrompt } from '@/lib/security/prompt-sanitizer'

/**
 * Pricing Optimization API
 * Uses AI to suggest optimal pricing for customers based on:
 * - Historical purchase patterns
 * - Price sensitivity
 * - Competitor pricing
 * - Win probability
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    
    // Check authentication and admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { customerId, productId, targetMargin } = body

    if (!customerId || !productId) {
      return NextResponse.json(
        { error: 'customerId and productId are required' },
        { status: 400 }
      )
    }

    // Get product info
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single()

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Get customer purchase history for this product
    const { data: analytics, error: analyticsError } = await supabase
      .from('customer_purchase_analytics')
      .select('*')
      .eq('customer_id', customerId)
      .eq('product_id', productId)
      .single()

    // Get historical orders to analyze price sensitivity
    const { data: historicalOrders, error: ordersError } = await supabase
      .from('historical_order_items')
      .select(`
        unit_price,
        quantity,
        historical_orders!inner (
          customer_id,
          order_date
        )
      `)
      .eq('current_product_id', productId)
      .eq('historical_orders.customer_id', customerId)
      .order('historical_orders.order_date', { ascending: true })

    // Generate pricing recommendation
    const recommendation = await generatePricingRecommendation(
      product,
      analytics,
      historicalOrders || [],
      targetMargin
    )

    // Save recommendation to database
    const { data: saved, error: saveError } = await supabase
      .from('pricing_optimization_suggestions')
      .insert({
        customer_id: customerId,
        product_id: productId,
        current_price: product.price,
        suggested_price: recommendation.suggestedPrice,
        win_probability: recommendation.winProbability,
        expected_revenue: recommendation.expectedRevenue,
        reasoning: recommendation.reasoning,
        model_version: 'v1.0',
        status: 'pending',
        metadata: recommendation.metadata
      })
      .select()
      .single()

    if (saveError) {
      console.error('Failed to save pricing suggestion:', saveError)
    }

    return NextResponse.json({
      success: true,
      recommendation: saved || recommendation
    })

  } catch (error: unknown) {
    console.error('Pricing optimization error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to optimize pricing' },
      { status: 500 }
    )
  }
}

/**
 * Generate pricing recommendation using AI and historical data
 */
async function generatePricingRecommendation(
  product: any,
  analytics: any,
  historicalOrders: any[],
  targetMargin?: number
) {
  const currentPrice = parseFloat(product.price)
  
  // Analyze price sensitivity from historical data
  const priceSensitivity = analyzePriceSensitivity(historicalOrders)
  
  // Calculate optimal price
  let suggestedPrice = currentPrice
  let reasoning = ''

  if (analytics && historicalOrders.length > 0) {
    // Customer has purchase history
    const avgHistoricalPrice = historicalOrders.reduce((sum, order) => 
      sum + parseFloat(order.unit_price || 0), 0) / historicalOrders.length
    
    const lastPrice = parseFloat(historicalOrders[historicalOrders.length - 1]?.unit_price || currentPrice)
    
    // If they've been paying more historically, we can price higher
    if (avgHistoricalPrice > currentPrice) {
      suggestedPrice = avgHistoricalPrice * 0.95 // 5% discount from their historical average
      reasoning = `Customer historically paid $${avgHistoricalPrice.toFixed(2)} on average. Suggesting slight discount to win business.`
    } else if (lastPrice < currentPrice) {
      // They're used to lower prices
      suggestedPrice = lastPrice * 1.05 // 5% increase from last price
      reasoning = `Customer's last price was $${lastPrice.toFixed(2)}. Suggesting modest increase to test price sensitivity.`
    } else {
      // Price is competitive
      suggestedPrice = currentPrice * 0.98 // Small discount to incentivize
      reasoning = `Current price is competitive. Suggesting small discount to encourage purchase.`
    }
  } else {
    // No purchase history - use conservative pricing
    suggestedPrice = currentPrice * 0.95
    reasoning = 'No purchase history. Suggesting competitive discount to win first order.'
  }

  // Apply target margin if specified
  if (targetMargin) {
    const minPrice = product.cost ? product.cost * (1 + targetMargin / 100) : suggestedPrice
    if (suggestedPrice < minPrice) {
      suggestedPrice = minPrice
      reasoning += ` Adjusted to meet ${targetMargin}% margin target.`
    }
  }

  // Calculate win probability based on price vs historical
  const winProbability = calculateWinProbability(
    suggestedPrice,
    currentPrice,
    analytics,
    historicalOrders
  )

  // Calculate expected revenue
  const expectedQuantity = analytics?.avg_order_quantity || 10
  const expectedRevenue = suggestedPrice * expectedQuantity * winProbability

  // Get AI insights
  const aiReasoning = await getAIPricingInsights(
    product,
    analytics,
    historicalOrders,
    suggestedPrice,
    currentPrice
  )

  return {
    suggestedPrice: Math.round(suggestedPrice * 100) / 100,
    winProbability: Math.round(winProbability * 100) / 100,
    expectedRevenue: Math.round(expectedRevenue * 100) / 100,
    reasoning: aiReasoning || reasoning,
    metadata: {
      currentPrice,
      priceSensitivity,
      historicalAvgPrice: historicalOrders.length > 0 
        ? historicalOrders.reduce((sum, o) => sum + parseFloat(o.unit_price || 0), 0) / historicalOrders.length
        : null,
      expectedQuantity
    }
  }
}

/**
 * Analyze price sensitivity from historical orders
 */
function analyzePriceSensitivity(orders: any[]): string {
  if (orders.length < 3) return 'unknown'

  const prices = orders.map(o => parseFloat(o.unit_price || 0))
  const quantities = orders.map(o => parseFloat(o.quantity || 0))

  // Calculate correlation between price and quantity
  // Negative correlation = price sensitive
  // Positive correlation = not price sensitive

  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length
  const avgQty = quantities.reduce((a, b) => a + b, 0) / quantities.length

  let correlation = 0
  for (let i = 0; i < prices.length; i++) {
    correlation += (prices[i] - avgPrice) * (quantities[i] - avgQty)
  }

  if (correlation < -100) return 'high'
  if (correlation < 0) return 'medium'
  return 'low'
}

/**
 * Calculate win probability based on pricing
 */
function calculateWinProbability(
  suggestedPrice: number,
  currentPrice: number,
  analytics: any,
  historicalOrders: any[]
): number {
  let probability = 0.5 // Base probability

  // Price competitiveness
  const priceRatio = suggestedPrice / currentPrice
  if (priceRatio < 0.9) probability += 0.3 // Significant discount
  else if (priceRatio < 0.95) probability += 0.2 // Moderate discount
  else if (priceRatio < 1.0) probability += 0.1 // Small discount
  else if (priceRatio > 1.1) probability -= 0.2 // Price increase

  // Purchase history
  if (analytics && analytics.total_orders > 0) {
    probability += 0.2 // Existing customer
    
    // Recent purchases
    const daysSinceLastPurchase = Math.floor(
      (Date.now() - new Date(analytics.last_purchase_date).getTime()) / (1000 * 60 * 60 * 24)
    )
    if (daysSinceLastPurchase < 30) probability += 0.1
    else if (daysSinceLastPurchase > 180) probability -= 0.1
  }

  // Historical price acceptance
  if (historicalOrders.length > 0) {
    const avgHistoricalPrice = historicalOrders.reduce((sum, o) => 
      sum + parseFloat(o.unit_price || 0), 0) / historicalOrders.length
    
    if (suggestedPrice <= avgHistoricalPrice) probability += 0.1
  }

  return Math.max(0.1, Math.min(0.95, probability))
}

/**
 * Get AI insights on pricing
 */
async function getAIPricingInsights(
  product: any,
  analytics: any,
  historicalOrders: any[],
  suggestedPrice: number,
  currentPrice: number
): Promise<string> {
  try {
    // SECURITY: Sanitize inputs for AI prompt
    const sanitizedProductName = sanitizeForPrompt(product.name);
    const sanitizedCurrentPrice = Math.max(0, parseFloat(String(currentPrice)) || 0).toFixed(2);
    const sanitizedSuggestedPrice = Math.max(0, parseFloat(String(suggestedPrice)) || 0).toFixed(2);
    const orderCount = Math.max(0, Math.min(100000, historicalOrders.length));
    const totalOrders = Math.max(0, Math.min(100000, analytics?.total_orders || 0));
    const totalRevenue = Math.max(0, parseFloat(String(analytics?.total_revenue || 0))).toFixed(2);

    const prompt = `Analyze this B2B pricing scenario and provide a brief recommendation:

Product: ${sanitizedProductName}
Current Price: $${sanitizedCurrentPrice}
Suggested Price: $${sanitizedSuggestedPrice}
Customer Purchase History: ${analytics ? `${totalOrders} orders, $${totalRevenue} total revenue` : 'No history'}
Historical Orders: ${orderCount} orders

Provide a 1-2 sentence recommendation on whether this pricing is optimal and why.`

    const response = await generateText(prompt, {
      temperature: 0.7,
      maxTokens: 100,
      systemPrompt: 'You are a B2B pricing strategist. Provide concise, actionable pricing recommendations.'
    })

    return response || ''

  } catch (error) {
    console.error('AI pricing insights error:', error)
    return ''
  }
}

/**
 * Get all pricing suggestions
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    
    // Check authentication and admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'

    const { data, error } = await supabase
      .from('pricing_optimization_suggestions')
      .select(`
        *,
        products (
          id,
          sku,
          name,
          category
        )
      `)
      .eq('status', status)
      .order('win_probability', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch pricing suggestions: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      suggestions: data
    })

  } catch (error: unknown) {
    console.error('Get pricing suggestions error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch pricing suggestions' },
      { status: 500 }
    )
  }
}
