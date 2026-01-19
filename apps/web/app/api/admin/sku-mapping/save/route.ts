import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/middleware/rate-limit'
import { handleError, AuthError, ForbiddenError, ValidationError, DatabaseError } from '@/lib/middleware/error-handler'

interface SKUMappingToSave {
  oldSKU: string
  oldSystem: string
  currentProductId: string
  currentSKU: string
  confidenceScore: number
  mappingMethod: string
  metadata?: Record<string, unknown>
}

/**
 * Save SKU Mappings API
 * Saves verified SKU mappings to the database
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'admin')
    if (!allowed) return rateLimitResponse!

    const supabase = await createClient()

    // Check authentication and admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new AuthError('Unauthorized')
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      throw new ForbiddenError('Admin access required')
    }

    const body = await request.json()
    const { mappings, verified = false } = body as {
      mappings: SKUMappingToSave[]
      verified?: boolean
    }

    if (!mappings || !Array.isArray(mappings) || mappings.length === 0) {
      throw new ValidationError('mappings array is required', {
        mappings: ['At least one mapping is required'],
      })
    }

    // Prepare data for insertion
    const mappingsToInsert = mappings.map(mapping => ({
      old_sku: mapping.oldSKU,
      old_system: mapping.oldSystem,
      current_product_id: mapping.currentProductId,
      current_sku: mapping.currentSKU,
      confidence_score: mapping.confidenceScore,
      mapping_method: mapping.mappingMethod,
      verified,
      verified_by: verified ? user.id : null,
      verified_at: verified ? new Date().toISOString() : null,
      metadata: mapping.metadata || {}
    }))

    // Insert mappings (upsert to handle duplicates)
    const { data, error } = await supabase
      .from('sku_mappings')
      .upsert(mappingsToInsert, {
        onConflict: 'old_sku,old_system',
        ignoreDuplicates: false
      })
      .select()

    if (error) {
      throw DatabaseError.queryFailed('sku_mappings', 'save')
    }

    return NextResponse.json({
      success: true,
      saved: data?.length || 0,
      message: `Successfully saved ${data?.length || 0} SKU mappings`
    })

  } catch (error) {
    return handleError(error)
  }
}

/**
 * Update SKU Mapping Verification Status
 */
export async function PATCH(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'admin')
    if (!allowed) return rateLimitResponse!

    const supabase = await createClient()

    // Check authentication and admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new AuthError('Unauthorized')
    }

    // Verify admin role
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role !== 'admin') {
      throw new ForbiddenError('Admin access required')
    }

    const body = await request.json()
    const { mappingId, verified, currentProductId } = body

    if (!mappingId) {
      throw new ValidationError('mappingId is required', {
        mappingId: ['Mapping ID is required'],
      })
    }

    const updateData: Record<string, unknown> = {
      verified,
      verified_by: verified ? user.id : null,
      verified_at: verified ? new Date().toISOString() : null
    }

    // Allow updating the mapped product
    if (currentProductId) {
      updateData.current_product_id = currentProductId

      // Fetch the new product's SKU
      const { data: product } = await supabase
        .from('products')
        .select('sku')
        .eq('id', currentProductId)
        .single()

      if (product) {
        updateData.current_sku = product.sku
      }
    }

    const { data, error } = await supabase
      .from('sku_mappings')
      .update(updateData)
      .eq('id', mappingId)
      .select()
      .single()

    if (error) {
      throw DatabaseError.queryFailed('sku_mappings', 'update')
    }

    return NextResponse.json({
      success: true,
      mapping: data
    })

  } catch (error) {
    return handleError(error)
  }
}

/**
 * Get all SKU mappings
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'admin')
    if (!allowed) return rateLimitResponse!

    const supabase = await createClient()

    // Check authentication and admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new AuthError('Unauthorized')
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      throw new ForbiddenError('Admin access required')
    }

    const { searchParams } = new URL(request.url)
    const oldSystem = searchParams.get('oldSystem')
    const verified = searchParams.get('verified')

    let query = supabase
      .from('sku_mappings')
      .select('*, products(id, sku, name)')
      .order('confidence_score', { ascending: false })

    if (oldSystem) {
      query = query.eq('old_system', oldSystem)
    }

    if (verified !== null) {
      query = query.eq('verified', verified === 'true')
    }

    const { data, error } = await query

    if (error) {
      throw DatabaseError.queryFailed('sku_mappings', 'fetch')
    }

    return NextResponse.json({
      success: true,
      mappings: data
    })

  } catch (error) {
    return handleError(error)
  }
}
