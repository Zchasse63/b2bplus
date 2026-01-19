import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/middleware/rate-limit'
import { validateRequestBody } from '@/lib/middleware/validation'
import { InvoiceGenerateSchema } from '@/lib/validation/schemas'
import { handleError, AuthError, ValidationError, NotFoundError, DatabaseError } from '@/lib/middleware/error-handler'

export async function POST(request: NextRequest) {
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

    // Validate request body
    const validation = await validateRequestBody(request, InvoiceGenerateSchema)
    if (!validation.valid) return validation.response!

    const { orderId } = validation.data!

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.current_organization_id) {
      throw new ValidationError('No organization found')
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
      throw new NotFoundError('Order', orderId)
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
      throw DatabaseError.queryFailed('invoices', 'generate_invoice_number')
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
      throw DatabaseError.queryFailed('invoices', 'insert')
    }

    return NextResponse.json({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      message: 'Invoice generated successfully'
    })

  } catch (error) {
    return handleError(error)
  }
}
