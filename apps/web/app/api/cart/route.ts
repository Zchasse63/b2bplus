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
import { rateLimit } from '@/lib/middleware/rate-limit'
import { validateRequestBody } from '@/lib/middleware/validation'
import { AddToCartSchema } from '@/lib/validation/schemas'
import { handleError, AuthError, ForbiddenError, DatabaseError } from '@/lib/middleware/error-handler'

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
      throw new AuthError('Unauthorized')
    }

    const { data: cartItems, error } = await supabase
      .from('cart_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Failed to fetch cart', { error, userId: user.id })
      throw DatabaseError.queryFailed('cart_items', 'fetch')
    }

    return NextResponse.json({ items: cartItems || [] })
  } catch (error) {
    return handleError(error)
  }
}

/**
 * POST /api/cart
 * Add item to cart
 */
export const POST = withCSRFProtection(async (request: NextRequest) => {
  try {
    // Apply rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'authenticated');
    if (!allowed) {
      return rateLimitResponse!;
    }

    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new AuthError('Unauthorized')
    }

    // Validate request body
    const validation = await validateRequestBody(request, AddToCartSchema);
    if (!validation.valid) {
      return validation.response!;
    }

    const { product_id: productId, quantity } = validation.data!;

    // Get user's organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      throw new ForbiddenError('User not in organization');
    }

    const organizationId = membership.organization_id;

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
      throw DatabaseError.queryFailed('cart_items', 'insert')
    }

    logger.info('Item added to cart', { userId: user.id, productId })
    return NextResponse.json({ item: cartItem }, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
})

