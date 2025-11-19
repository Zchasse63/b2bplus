/**
 * Cart API Endpoints
 * 
 * GET /api/cart - Get user's cart
 * POST /api/cart - Add item to cart
 * PATCH /api/cart/[id] - Update cart item
 * DELETE /api/cart/[id] - Remove cart item
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/logging/logger'
import { withCSRFProtection } from '@/lib/middleware/csrf'

const logger = createLogger('cart-api')

/**
 * GET /api/cart
 * Fetch user's cart items
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: cartItems, error } = await supabase
      .from('cart_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Failed to fetch cart', { error, userId: user.id })
      return NextResponse.json(
        { error: 'Failed to fetch cart' },
        { status: 500 }
      )
    }

    return NextResponse.json({ items: cartItems || [] })
  } catch (error: any) {
    logger.error('Cart GET error', { error })
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cart
 * Add item to cart
 */
export const POST = withCSRFProtection(async (request: NextRequest) => {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { productId, quantity, organizationId } = body

    if (!productId || !quantity || !organizationId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify user belongs to organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'Unauthorized organization' },
        { status: 403 }
      )
    }

    // Add to cart
    const { data: cartItem, error } = await supabase
      .from('cart_items')
      .insert({
        user_id: user.id,
        organization_id: organizationId,
        product_id: productId,
        quantity,
      })
      .select()
      .single()

    if (error) {
      logger.error('Failed to add to cart', { error, userId: user.id })
      return NextResponse.json(
        { error: 'Failed to add item to cart' },
        { status: 500 }
      )
    }

    logger.info('Item added to cart', { userId: user.id, productId })
    return NextResponse.json({ item: cartItem }, { status: 201 })
  } catch (error: any) {
    logger.error('Cart POST error', { error })
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
})

