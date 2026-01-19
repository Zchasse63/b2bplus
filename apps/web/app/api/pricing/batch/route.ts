/**
 * Batch Pricing Endpoint
 * 
 * POST /api/pricing/batch
 * Calculate pricing for multiple items in a single request
 * Eliminates N+1 pricing calls from cart and order flows
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { batchCalculatePricing } from '@/lib/billing/billing-service'
import { createLogger } from '@/lib/logging/logger'
import { rateLimit } from '@/lib/middleware/rate-limit'
import { handleError, AuthError, ValidationError } from '@/lib/middleware/error-handler'

const logger = createLogger('batch-pricing')

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'authenticated')
    if (!allowed) return rateLimitResponse!

    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new AuthError('Unauthorized')
    }

    // Parse request body
    const body = await request.json()
    const { items, organizationId, shippingAddress } = body

    // Validate input
    if (!Array.isArray(items) || items.length === 0) {
      throw new ValidationError('Items array is required and must not be empty')
    }

    if (!organizationId) {
      throw new ValidationError('organizationId is required')
    }

    // Validate each item
    for (const item of items) {
      if (!item.productId || !item.quantity || typeof item.quantity !== 'number') {
        throw new ValidationError('Each item must have productId and quantity')
      }
    }

    logger.info(`Calculating batch pricing for ${items.length} items`, {
      organizationId,
      itemCount: items.length,
    })

    // Calculate pricing for all items
    const pricing = await batchCalculatePricing(items)

    logger.info('Batch pricing calculated successfully', {
      organizationId,
      itemCount: pricing.length,
    })

    return NextResponse.json({
      success: true,
      items: pricing,
      count: pricing.length,
    })
  } catch (error) {
    logger.error('Batch pricing error', { error })
    return handleError(error)
  }
}

/**
 * GET /api/pricing/batch
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Batch pricing endpoint is active',
  })
}

