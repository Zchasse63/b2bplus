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

const logger = createLogger('batch-pricing')

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { items, organizationId, shippingAddress } = body

    // Validate input
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items array is required and must not be empty' },
        { status: 400 }
      )
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      )
    }

    // Validate each item
    for (const item of items) {
      if (!item.productId || !item.quantity || typeof item.quantity !== 'number') {
        return NextResponse.json(
          { error: 'Each item must have productId and quantity' },
          { status: 400 }
        )
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
  } catch (error: any) {
    logger.error('Batch pricing error', { error })
    return NextResponse.json(
      { error: error.message || 'Failed to calculate batch pricing' },
      { status: 500 }
    )
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

