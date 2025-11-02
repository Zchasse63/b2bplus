import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
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
    console.error('Error fetching invoice:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      console.error('Error updating invoice:', updateError)
      return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 })
    }

    return NextResponse.json(invoice)

  } catch (error) {
    console.error('Error updating invoice:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
