import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get request body
    const { orderId } = await request.json()

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
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

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          quantity,
          unit_price,
          line_total
        )
      `)
      .eq('id', orderId)
      .eq('organization_id', profile.current_organization_id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check if invoice already exists for this order
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('id, invoice_number')
      .eq('order_id', orderId)
      .single()

    if (existingInvoice) {
      return NextResponse.json({
        invoiceId: existingInvoice.id,
        invoiceNumber: existingInvoice.invoice_number,
        message: 'Invoice already exists for this order'
      })
    }

    // Generate invoice number using database function
    const { data: invoiceNumberData, error: invoiceNumberError } = await supabase
      .rpc('generate_invoice_number')

    if (invoiceNumberError) {
      console.error('Error generating invoice number:', invoiceNumberError)
      return NextResponse.json({ error: 'Failed to generate invoice number' }, { status: 500 })
    }

    const invoiceNumber = invoiceNumberData

    // Calculate amounts
    const subtotal = order.total || 0
    const taxRate = 0.08 // 8% tax
    const taxAmount = subtotal * taxRate
    const shippingAmount = subtotal > 500 ? 0 : 50
    const totalAmount = subtotal + taxAmount + shippingAmount

    // Set due date (30 days from now)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30)

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        order_id: orderId,
        organization_id: profile.current_organization_id,
        issue_date: new Date().toISOString(),
        due_date: dueDate.toISOString(),
        status: 'unpaid',
        subtotal,
        tax_amount: taxAmount,
        shipping_amount: shippingAmount,
        total_amount: totalAmount,
        notes: order.notes || null,
      })
      .select()
      .single()

    if (invoiceError) {
      console.error('Error creating invoice:', invoiceError)
      return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 })
    }

    return NextResponse.json({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      message: 'Invoice generated successfully'
    })

  } catch (error) {
    console.error('Error in invoice generation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
