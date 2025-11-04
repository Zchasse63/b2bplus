import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/gemini'

/**
 * Opportunity Detection API
 * Automatically identifies sales opportunities across all customers
 * - Products they stopped buying
 * - Cross-sell opportunities
 * - Upsell opportunities
 * - New product recommendations
 */
export async function POST(request: NextRequest) {
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
    const { customerId, opportunityTypes = ['all'] } = body

    const opportunities = []

    // Detect stopped purchases
    if (opportunityTypes.includes('all') || opportunityTypes.includes('stopped_buying')) {
      const stoppedBuying = await detectStoppedPurchases(supabase, customerId)
      opportunities.push(...stoppedBuying)
    }

    // Detect cross-sell opportunities
    if (opportunityTypes.includes('all') || opportunityTypes.includes('cross_sell')) {
      const crossSell = await detectCrossSellOpportunities(supabase, customerId)
      opportunities.push(...crossSell)
    }

    // Detect upsell opportunities
    if (opportunityTypes.includes('all') || opportunityTypes.includes('upsell')) {
      const upsell = await detectUpsellOpportunities(supabase, customerId)
      opportunities.push(...upsell)
    }

    // Save opportunities to database
    if (opportunities.length > 0) {
      const { data: saved, error: saveError } = await supabase
        .from('customer_opportunities')
        .upsert(opportunities, {
          onConflict: 'customer_id,opportunity_type,product_id'
        })
        .select()

      if (saveError) {
        console.error('Failed to save opportunities:', saveError)
      }
    }

    return NextResponse.json({
      success: true,
      opportunitiesDetected: opportunities.length,
      opportunities
    })

  } catch (error: any) {
    console.error('Opportunity detection error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to detect opportunities' },
      { status: 500 }
    )
  }
}

/**
 * Detect products customer stopped buying
 */
async function detectStoppedPurchases(supabase: any, customerId?: string) {
  // Use the database function to identify stopped purchases
  const { data, error } = await supabase.rpc('identify_stopped_purchases')

  if (error) {
    console.error('Failed to identify stopped purchases:', error)
    return []
  }

  let stoppedPurchases = data || []

  // Filter by customer if specified
  if (customerId) {
    stoppedPurchases = stoppedPurchases.filter((p: any) => p.customer_id === customerId)
  }

  // Generate AI reasoning for each opportunity
  const opportunities = []
  for (const purchase of stoppedPurchases.slice(0, 50)) { // Limit to top 50
    const reasoning = await generateOpportunityReasoning(
      'stopped_buying',
      purchase,
      supabase
    )

    opportunities.push({
      customer_id: purchase.customer_id,
      opportunity_type: 'stopped_buying',
      product_id: purchase.product_id,
      opportunity_score: calculateStoppedBuyingScore(purchase),
      predicted_revenue: purchase.total_historical_revenue / 12, // Monthly average
      reason: reasoning,
      status: 'open',
      metadata: {
        last_purchase_date: purchase.last_purchase_date,
        days_since_purchase: purchase.days_since_purchase,
        avg_frequency_days: purchase.avg_frequency_days,
        historical_revenue: purchase.total_historical_revenue
      }
    })
  }

  return opportunities
}

/**
 * Detect cross-sell opportunities
 */
async function detectCrossSellOpportunities(supabase: any, customerId?: string) {
  // Get all customers (or specific customer)
  let query = supabase
    .from('customer_purchase_analytics')
    .select(`
      customer_id,
      product_id,
      products (
        id,
        category
      )
    `)

  if (customerId) {
    query = query.eq('customer_id', customerId)
  }

  const { data: purchases, error } = await query

  if (error) {
    console.error('Failed to fetch purchases:', error)
    return []
  }

  // Group by customer and category
  const customerCategories = new Map<string, Set<string>>()
  const customerProducts = new Map<string, Set<string>>()

  purchases?.forEach((p: any) => {
    const category = p.products?.category
    if (!category) return

    if (!customerCategories.has(p.customer_id)) {
      customerCategories.set(p.customer_id, new Set())
      customerProducts.set(p.customer_id, new Set())
    }

    customerCategories.get(p.customer_id)!.add(category)
    customerProducts.get(p.customer_id)!.add(p.product_id)
  })

  const opportunities: any[] = []

  // For each customer, find products in their categories they haven't bought
  for (const [custId, categories] of customerCategories.entries()) {
    const purchasedProducts = customerProducts.get(custId)!

    for (const category of categories) {
      // Get all products in this category
      const { data: categoryProducts } = await supabase
        .from('products')
        .select('id, name, price')
        .eq('category', category)
        .limit(5)

      categoryProducts?.forEach((product: any) => {
        if (!purchasedProducts.has(product.id)) {
          opportunities.push({
            customer_id: custId,
            opportunity_type: 'cross_sell',
            product_id: product.id,
            opportunity_score: 0.6,
            predicted_revenue: product.price * 10, // Estimate 10 units
            reason: `Customer purchases from ${category} category but hasn't tried this product yet`,
            status: 'open',
            metadata: {
              category,
              product_name: product.name
            }
          })
        }
      })
    }
  }

  return opportunities.slice(0, 100) // Limit results
}

/**
 * Detect upsell opportunities (volume discounts, premium products)
 */
async function detectUpsellOpportunities(supabase: any, customerId?: string) {
  // Find customers buying products with volume discounts available
  let query = supabase
    .from('customer_purchase_analytics')
    .select(`
      customer_id,
      product_id,
      avg_order_quantity,
      products (
        id,
        name,
        price
      )
    `)

  if (customerId) {
    query = query.eq('customer_id', customerId)
  }

  const { data: purchases, error } = await query

  if (error) {
    console.error('Failed to fetch purchases:', error)
    return []
  }

  const opportunities = []

  for (const purchase of purchases || []) {
    // Check if volume discounts exist for this product
    const { data: volumeDiscounts } = await supabase
      .from('volume_discounts')
      .select('*')
      .eq('product_id', purchase.product_id)
      .order('min_quantity', { ascending: true })

    if (!volumeDiscounts || volumeDiscounts.length === 0) continue

    // Find next tier they could reach
    const avgQty = parseFloat(purchase.avg_order_quantity || 0)
    const nextTier = volumeDiscounts.find((d: any) => d.min_quantity > avgQty)

    if (nextTier) {
      const potentialSavings = (purchase.products.price * nextTier.discount_percentage / 100) * avgQty
      
      opportunities.push({
        customer_id: purchase.customer_id,
        opportunity_type: 'upsell',
        product_id: purchase.product_id,
        opportunity_score: 0.7,
        predicted_revenue: purchase.products.price * nextTier.min_quantity,
        reason: `Customer could save $${potentialSavings.toFixed(2)} per order by increasing quantity to ${nextTier.min_quantity} (${nextTier.discount_percentage}% discount)`,
        status: 'open',
        metadata: {
          current_avg_quantity: avgQty,
          next_tier_quantity: nextTier.min_quantity,
          discount_percentage: nextTier.discount_percentage,
          potential_savings: potentialSavings
        }
      })
    }
  }

  return opportunities
}

/**
 * Calculate opportunity score for stopped buying
 */
function calculateStoppedBuyingScore(purchase: any): number {
  const historicalRevenue = parseFloat(purchase.total_historical_revenue || 0)
  const daysSince = purchase.days_since_purchase || 0
  const avgFrequency = purchase.avg_frequency_days || 30

  // Higher revenue = higher score
  let score = Math.min(historicalRevenue / 10000, 0.5)

  // More overdue = higher score
  const overdueRatio = daysSince / avgFrequency
  score += Math.min(overdueRatio / 10, 0.3)

  // Recent purchases = higher score
  if (daysSince < 180) {
    score += 0.2
  }

  return Math.min(score, 1.0)
}

/**
 * Generate AI reasoning for opportunity
 */
async function generateOpportunityReasoning(
  type: string,
  data: any,
  supabase: any
): Promise<string> {
  try {
    // Get product info
    const { data: product } = await supabase
      .from('products')
      .select('name, category')
      .eq('id', data.product_id)
      .single()

    let prompt = ''

    if (type === 'stopped_buying') {
      prompt = `Customer stopped buying "${product?.name}" (${product?.category}). 
Last purchase: ${data.last_purchase_date}
Days since: ${data.days_since_purchase}
Historical revenue: $${data.total_historical_revenue}
Average frequency: every ${data.avg_frequency_days} days

Write a brief, actionable reason why this is a sales opportunity (1-2 sentences).`
    }

    const response = await generateText(prompt, {
      temperature: 0.7,
      maxTokens: 100,
      systemPrompt: 'You are a B2B sales analyst. Provide concise, actionable insights.'
    })

    return response || 'Opportunity detected based on purchase history'

  } catch (error) {
    console.error('AI reasoning error:', error)
    return 'Opportunity detected based on purchase history'
  }
}

/**
 * Get all opportunities
 */
export async function GET(request: NextRequest) {
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
    const customerId = searchParams.get('customerId')
    const status = searchParams.get('status') || 'open'
    const type = searchParams.get('type')

    let query = supabase
      .from('customer_opportunities')
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
      .eq('status', status)
      .order('opportunity_score', { ascending: false })

    if (customerId) {
      query = query.eq('customer_id', customerId)
    }

    if (type) {
      query = query.eq('opportunity_type', type)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch opportunities: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      opportunities: data
    })

  } catch (error: any) {
    console.error('Get opportunities error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch opportunities' },
      { status: 500 }
    )
  }
}
