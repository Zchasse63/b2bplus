import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Cross-Sell Recommendations API
 * Recommends complementary products based on:
 * - Category relationships (cup → lid)
 * - Products in categories they buy from but haven't tried
 * - Frequently bought together patterns
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
    const productId = searchParams.get('productId')
    const limit = parseInt(searchParams.get('limit') || '5')

    if (productId) {
      // Get cross-sell for specific product
      const recommendations = await getCrossSellForProduct(supabase, productId, user.id, limit)
      return NextResponse.json({
        success: true,
        recommendations
      })
    } else {
      // Get general cross-sell recommendations for customer
      const recommendations = await getGeneralCrossSell(supabase, user.id, limit)
      return NextResponse.json({
        success: true,
        recommendations
      })
    }

  } catch (error: any) {
    console.error('Cross-sell recommendations error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get recommendations' },
      { status: 500 }
    )
  }
}

/**
 * Get cross-sell recommendations for a specific product
 */
async function getCrossSellForProduct(
  supabase: any,
  productId: string,
  userId: string,
  limit: number
) {
  // Get the product
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single()

  if (!product) return []

  const recommendations = []

  // Strategy 1: Category-based complementary products
  const complementaryCategories = getComplementaryCategories(product.category)
  
  for (const category of complementaryCategories) {
    const { data: categoryProducts } = await supabase
      .from('products')
      .select('*')
      .eq('category', category)
      .limit(2)

    if (categoryProducts) {
      recommendations.push(...categoryProducts.map((p: any) => ({
        product: p,
        reason: `Pairs well with ${product.name}`,
        type: 'complementary',
        score: 0.8
      })))
    }
  }

  // Strategy 2: Frequently bought together
  const { data: frequentlyBought } = await supabase
    .from('product_recommendations')
    .select(`
      *,
      recommended_product:products!product_recommendations_recommended_product_id_fkey (
        id,
        sku,
        name,
        description,
        category,
        price,
        image_url
      )
    `)
    .eq('product_id', productId)
    .eq('recommendation_type', 'also_bought')
    .order('score', { ascending: false })
    .limit(3)

  if (frequentlyBought) {
    recommendations.push(...frequentlyBought.map((rec: any) => ({
      product: rec.recommended_product,
      reason: 'Frequently bought together',
      type: 'also_bought',
      score: rec.score
    })))
  }

  // Remove duplicates and limit
  const uniqueRecs = Array.from(
    new Map(recommendations.map(r => [r.product.id, r])).values()
  ).slice(0, limit)

  return uniqueRecs
}

/**
 * Get general cross-sell recommendations for customer
 */
async function getGeneralCrossSell(
  supabase: any,
  userId: string,
  limit: number
) {
  // Get categories customer purchases from
  const { data: customerPurchases } = await supabase
    .from('customer_purchase_analytics')
    .select(`
      product_id,
      products (
        category
      )
    `)
    .eq('customer_id', userId)

  if (!customerPurchases || customerPurchases.length === 0) {
    return []
  }

  const purchasedCategories = [...new Set(
    customerPurchases.map((p: any) => p.products?.category).filter(Boolean)
  )]
  const purchasedProductIds = new Set(
    customerPurchases.map((p: any) => p.product_id)
  )

  const recommendations: any[] = []

  // Find products in their categories they haven't bought
  for (const category of purchasedCategories) {
    const { data: categoryProducts } = await supabase
      .from('products')
      .select('*')
      .eq('category', category)
      .limit(3)

    if (categoryProducts) {
      categoryProducts.forEach((product: any) => {
        if (!purchasedProductIds.has(product.id)) {
          recommendations.push({
            product,
            reason: `Popular in ${category} category`,
            type: 'category_expansion',
            score: 0.6
          })
        }
      })
    }

    // Also check complementary categories
    const complementary = getComplementaryCategories(category as string)
    for (const compCategory of complementary.slice(0, 1)) {
      const { data: compProducts } = await supabase
        .from('products')
        .select('*')
        .eq('category', compCategory as string)
        .limit(2)

      if (compProducts) {
        compProducts.forEach((product: any) => {
          if (!purchasedProductIds.has(product.id)) {
            recommendations.push({
              product,
              reason: `Complements your ${category} purchases`,
              type: 'complementary',
              score: 0.7
            })
          }
        })
      }
    }
  }

  // Remove duplicates, sort by score, and limit
  const uniqueRecs = Array.from(
    new Map(recommendations.map(r => [r.product.id, r])).values()
  )
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return uniqueRecs
}

/**
 * Get complementary product categories
 * E.g., cups → lids, plates → utensils
 */
function getComplementaryCategories(category: string): string[] {
  const complementaryMap: Record<string, string[]> = {
    'Cups': ['Lids', 'Straws', 'Cup Sleeves'],
    'Lids': ['Cups', 'Straws'],
    'Plates': ['Utensils', 'Napkins', 'Bowls'],
    'Bowls': ['Utensils', 'Lids', 'Plates'],
    'Containers': ['Lids', 'Bags'],
    'Bags': ['Containers', 'Boxes'],
    'Utensils': ['Plates', 'Bowls', 'Napkins'],
    'Napkins': ['Plates', 'Utensils'],
    'Straws': ['Cups', 'Lids'],
    'Boxes': ['Bags', 'Containers']
  }

  return complementaryMap[category] || []
}
