import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Historical Purchase Recommendations API
 * Shows customers products they used to buy but haven't purchased recently
 * "You used to buy this" feature
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    // Get products customer used to buy but haven't purchased recently
    const { data: stoppedProducts, error } = await supabase
      .from('customer_purchase_analytics')
      .select(`
        *,
        products (
          id,
          sku,
          name,
          description,
          category,
          price,
          image_url
        )
      `)
      .eq('customer_id', user.id)
      .lt('last_purchase_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .gte('total_orders', 3) // Only show products they bought at least 3 times
      .order('total_revenue', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to fetch recommendations: ${error.message}`)
    }

    // Calculate days since last purchase for each
    const recommendations = stoppedProducts?.map(item => {
      const daysSinceLastPurchase = Math.floor(
        (Date.now() - new Date(item.last_purchase_date).getTime()) / (1000 * 60 * 60 * 24)
      )

      return {
        product: item.products,
        lastPurchaseDate: item.last_purchase_date,
        daysSinceLastPurchase,
        totalOrders: item.total_orders,
        totalRevenue: parseFloat(item.total_revenue || 0),
        avgOrderQuantity: parseFloat(item.avg_order_quantity || 0),
        message: `You used to order this ${item.total_orders} times. Last order was ${daysSinceLastPurchase} days ago.`,
        savings: null // Could calculate if they had a better historical price
      }
    }) || []

    return NextResponse.json({
      success: true,
      recommendations,
      message: recommendations.length > 0 
        ? `Found ${recommendations.length} products you used to buy`
        : 'No historical purchase recommendations at this time'
    })

  } catch (error: unknown) {
    console.error('Historical recommendations error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get recommendations' },
      { status: 500 }
    )
  }
}
