import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { csrfProtection, addCSRFTokenToCookie } from '@/lib/middleware/csrf'
import { rateLimit } from '@/lib/middleware/rate-limit'
import { handleError, AuthError, ValidationError, NotFoundError, DatabaseError } from '@/lib/middleware/error-handler'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Get invoice with order details
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        orders (
          id,
          order_number,
          po_number,
          notes,
          shipping_address_id,
          order_items (
            id,
            quantity,
            unit_price,
            line_total,
            sku,
            name
          )
        ),
        organizations (
          id,
          name,
          email,
          phone
        )
      `)
      .eq('id', params.id)
      .eq('organization_id', profile.current_organization_id)
      .single()

    if (invoiceError || !invoice) {
      throw new NotFoundError('Invoice', params.id)
    }

    // Get shipping address if available
    let shippingAddress = null
    if (invoice.orders?.shipping_address_id) {
      const { data: address } = await supabase
        .from('shipping_addresses')
        .select('*')
        .eq('id', invoice.orders.shipping_address_id)
        .single()

      shippingAddress = address
    }

    return NextResponse.json({
      ...invoice,
      shipping_address: shippingAddress
    })

  } catch (error) {
    return handleError(error)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // CSRF Protection
    const { valid, response: csrfResponse } = await csrfProtection(request)
    if (!valid) {
      return csrfResponse!
    }

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

    const { status, paymentMethod, paymentReference } = await request.json()

    // Update invoice
    const updateData: any = {}
    if (status) updateData.status = status
    if (paymentMethod) updateData.payment_method = paymentMethod
    if (paymentReference) updateData.payment_reference = paymentReference
    if (status === 'paid') updateData.paid_at = new Date().toISOString()

    const { data: invoice, error: updateError } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', params.id)
      .eq('organization_id', profile.current_organization_id)
      .select()
      .single()

    if (updateError) {
      throw DatabaseError.queryFailed('invoices', 'update')
    }

    return addCSRFTokenToCookie(NextResponse.json(invoice), '')

  } catch (error) {
    return handleError(error)
  }
}
