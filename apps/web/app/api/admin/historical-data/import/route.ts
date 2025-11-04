import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface HistoricalOrderItem {
  oldSKU: string
  productDescription: string
  quantity: number
  unitPrice: number
  totalPrice: number
  category?: string
}

interface HistoricalOrder {
  customerEmail: string
  customerName?: string
  customerCompany?: string
  orderNumber?: string
  orderDate: string
  sourceSystem: string
  totalAmount: number
  items: HistoricalOrderItem[]
}

/**
 * Import Historical Orders API
 * Imports historical orders from Bailey (2023-2024) or Brokerage (2025)
 * Maps old SKUs to current products using SKU mappings table
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication and admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { orders } = body as { orders: HistoricalOrder[] }

    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json(
        { error: 'orders array is required' },
        { status: 400 }
      )
    }

    const results = {
      totalOrders: orders.length,
      imported: 0,
      skipped: 0,
      errors: [] as string[]
    }

    // Process each order
    for (const order of orders) {
      try {
        await importOrder(supabase, order)
        results.imported++
      } catch (error: any) {
        results.skipped++
        results.errors.push(`Order ${order.orderNumber || 'unknown'}: ${error.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      ...results
    })

  } catch (error: any) {
    console.error('Import historical data error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to import historical data' },
      { status: 500 }
    )
  }
}

/**
 * Import a single historical order
 */
async function importOrder(supabase: any, order: HistoricalOrder) {
  // Find or create customer
  let customerId: string | null = null
  
  // Try to find existing customer by email
  const { data: existingUser } = await supabase
    .from('auth.users')
    .select('id')
    .eq('email', order.customerEmail)
    .single()

  if (existingUser) {
    customerId = existingUser.id
  }

  // Insert historical order
  const { data: historicalOrder, error: orderError } = await supabase
    .from('historical_orders')
    .insert({
      customer_id: customerId,
      customer_email: order.customerEmail,
      customer_name: order.customerName,
      customer_company: order.customerCompany,
      order_number: order.orderNumber,
      order_date: order.orderDate,
      source_system: order.sourceSystem,
      total_amount: order.totalAmount,
      status: 'completed'
    })
    .select()
    .single()

  if (orderError) {
    throw new Error(`Failed to insert order: ${orderError.message}`)
  }

  // Get SKU mappings for this order's items
  const oldSKUs = order.items.map(item => item.oldSKU)
  const { data: skuMappings } = await supabase
    .from('sku_mappings')
    .select('old_sku, current_product_id')
    .eq('old_system', order.sourceSystem)
    .in('old_sku', oldSKUs)

  const skuMap = new Map<string, string>(
    skuMappings?.map((m: any) => [m.old_sku as string, m.current_product_id as string]) || []
  )

  // Insert order items
  const itemsToInsert = order.items.map(item => ({
    historical_order_id: historicalOrder.id,
    old_sku: item.oldSKU,
    product_description: item.productDescription,
    current_product_id: skuMap.get(item.oldSKU) || null,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total_price: item.totalPrice,
    category: item.category,
    metadata: {}
  }))

  const { error: itemsError } = await supabase
    .from('historical_order_items')
    .insert(itemsToInsert)

  if (itemsError) {
    throw new Error(`Failed to insert order items: ${itemsError.message}`)
  }

  // Update customer purchase analytics
  if (customerId) {
    await updateCustomerAnalytics(supabase, customerId, order.items, skuMap, order.orderDate)
  }
}

/**
 * Update customer purchase analytics with historical data
 */
async function updateCustomerAnalytics(
  supabase: any,
  customerId: string,
  items: HistoricalOrderItem[],
  skuMap: Map<string, string>,
  orderDate: string
) {
  for (const item of items) {
    const productId = skuMap.get(item.oldSKU)
    if (!productId) continue

    // Check if analytics record exists
    const { data: existing } = await supabase
      .from('customer_purchase_analytics')
      .select('*')
      .eq('customer_id', customerId)
      .eq('product_id', productId)
      .single()

    if (existing) {
      // Update existing record
      const { error } = await supabase
        .from('customer_purchase_analytics')
        .update({
          first_purchase_date: existing.first_purchase_date < orderDate 
            ? existing.first_purchase_date 
            : orderDate,
          last_purchase_date: existing.last_purchase_date > orderDate 
            ? existing.last_purchase_date 
            : orderDate,
          total_orders: existing.total_orders + 1,
          total_quantity: existing.total_quantity + item.quantity,
          total_revenue: existing.total_revenue + item.totalPrice,
          avg_order_quantity: (existing.total_quantity + item.quantity) / (existing.total_orders + 1),
          avg_order_value: (existing.total_revenue + item.totalPrice) / (existing.total_orders + 1),
          updated_at: new Date().toISOString()
        })
        .eq('customer_id', customerId)
        .eq('product_id', productId)

      if (error) {
        console.error('Failed to update analytics:', error)
      }
    } else {
      // Create new record
      const { error } = await supabase
        .from('customer_purchase_analytics')
        .insert({
          customer_id: customerId,
          product_id: productId,
          first_purchase_date: orderDate,
          last_purchase_date: orderDate,
          total_orders: 1,
          total_quantity: item.quantity,
          total_revenue: item.totalPrice,
          avg_order_quantity: item.quantity,
          avg_order_value: item.totalPrice,
          status: 'active'
        })

      if (error) {
        console.error('Failed to create analytics:', error)
      }
    }
  }
}

/**
 * Get import statistics
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication and admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get statistics
    const { data: orderStats } = await supabase
      .from('historical_orders')
      .select('source_system, count', { count: 'exact' })

    const { data: itemStats } = await supabase
      .from('historical_order_items')
      .select('count', { count: 'exact' })

    const { data: mappingStats } = await supabase
      .from('sku_mappings')
      .select('verified, count', { count: 'exact' })

    return NextResponse.json({
      success: true,
      statistics: {
        totalOrders: orderStats?.length || 0,
        totalItems: itemStats?.length || 0,
        skuMappings: {
          total: mappingStats?.length || 0,
          verified: mappingStats?.filter((m: any) => m.verified).length || 0,
          unverified: mappingStats?.filter((m: any) => !m.verified).length || 0
        }
      }
    })

  } catch (error: any) {
    console.error('Get import statistics error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get statistics' },
      { status: 500 }
    )
  }
}
