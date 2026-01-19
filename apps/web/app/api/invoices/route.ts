import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/middleware/rate-limit'
import { handleError, AuthError, ValidationError, DatabaseError } from '@/lib/middleware/error-handler'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'authenticated')
    if (!allowed) return rateLimitResponse!

    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new AuthError('Unauthorized')
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.current_organization_id) {
      throw new ValidationError('No organization found')
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const search = searchParams.get('search')

    // Build query
    let query = supabase
      .from('invoices')
      .select(`
        *,
        orders (
          order_number,
          po_number
        )
      `)
      .eq('organization_id', profile.current_organization_id)
      .order('created_at', { ascending: false })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }

    if (startDate) {
      query = query.gte('issue_date', startDate)
    }

    if (endDate) {
      query = query.lte('issue_date', endDate)
    }

    if (search) {
      query = query.or(`invoice_number.ilike.%${search}%,orders.order_number.ilike.%${search}%`)
    }

    const { data: invoices, error: invoicesError } = await query

    if (invoicesError) {
      throw DatabaseError.queryFailed('invoices', 'fetch')
    }

    return NextResponse.json(invoices || [])

  } catch (error) {
    return handleError(error)
  }
}
