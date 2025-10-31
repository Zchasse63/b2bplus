import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.current_organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
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
      console.error('Error fetching invoices:', invoicesError)
      return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
    }

    return NextResponse.json(invoices || [])

  } catch (error) {
    console.error('Error in invoices list:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
