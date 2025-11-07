import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

interface BulkOrderItem {
  sku: string;
  quantity: number;
  product_id?: string;
  product_name?: string;
  unit_price?: number;
  total_price?: number;
  status: 'valid' | 'invalid' | 'warning';
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // SECURITY: Require authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { items, shippingAddressId, poNumber, notes, paymentTerms } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'No items provided' },
        { status: 400 }
      );
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.current_organization_id) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 400 }
      );
    }

    // Filter only valid items
    const validItems: BulkOrderItem[] = items.filter(
      (item: BulkOrderItem) => item.status === 'valid' && item.product_id
    );

    if (validItems.length === 0) {
      return NextResponse.json(
        { error: 'No valid items to order' },
        { status: 400 }
      );
    }

    // Re-validate products are still active and re-calculate prices
    // (prices may have changed since preview was generated)
    const productIds = validItems.map(item => item.product_id!);
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, sku, name, base_price, is_active')
      .in('id', productIds);

    if (productsError) {
      logger.error('Error fetching products:', productsError);
      return NextResponse.json(
        { error: 'Failed to validate products' },
        { status: 500 }
      );
    }

    // Create product map
    const productMap = new Map(
      (products || []).map(p => [p.id, p])
    );

    // Validate all products are still active
    const inactiveProducts = validItems.filter(
      item => !productMap.get(item.product_id!)?.is_active
    );

    if (inactiveProducts.length > 0) {
      return NextResponse.json(
        {
          error: 'Some products are no longer available',
          inactiveProducts: inactiveProducts.map(item => item.product_name)
        },
        { status: 400 }
      );
    }

    // Re-calculate prices server-side
    const pricingPromises = validItems.map(async (item) => {
      const { data: price } = await supabase.rpc('get_customer_price', {
        p_customer_id: user.id,
        p_product_id: item.product_id!,
        p_quantity: item.quantity,
        p_date: new Date().toISOString().split('T')[0]
      });

      const product = productMap.get(item.product_id!);
      const unitPrice = price || product?.base_price || 0;
      const lineTotal = unitPrice * item.quantity;

      return {
        product_id: item.product_id!,
        sku: item.sku,
        name: item.product_name || product?.name || '',
        quantity: item.quantity,
        unit_price: unitPrice,
        line_total: lineTotal
      };
    });

    const pricedItems = await Promise.all(pricingPromises);

    // Calculate totals
    const subtotal = pricedItems.reduce((sum, item) => sum + item.line_total, 0);

    // Tax calculation (TODO: base on shipping address location)
    const taxRate = 0.08; // 8% default tax rate
    const tax = subtotal * taxRate;

    // Shipping cost calculation
    const freeShippingThreshold = 500;
    const standardShippingCost = 50;
    const shippingCost = subtotal >= freeShippingThreshold ? 0 : standardShippingCost;

    const total = subtotal + tax + shippingCost;

    // Get or validate shipping address
    let finalShippingAddressId = shippingAddressId;

    if (!finalShippingAddressId) {
      // Use default shipping address for the organization
      const { data: defaultAddress } = await supabase
        .from('shipping_addresses')
        .select('id')
        .eq('organization_id', profile.current_organization_id)
        .eq('is_default', true)
        .single();

      if (defaultAddress) {
        finalShippingAddressId = defaultAddress.id;
      } else {
        // Get any shipping address for the organization
        const { data: anyAddress } = await supabase
          .from('shipping_addresses')
          .select('id')
          .eq('organization_id', profile.current_organization_id)
          .limit(1)
          .single();

        if (anyAddress) {
          finalShippingAddressId = anyAddress.id;
        }
      }
    }

    if (finalShippingAddressId) {
      // Verify shipping address belongs to organization
      const { data: shippingAddress, error: addressError } = await supabase
        .from('shipping_addresses')
        .select('id')
        .eq('id', finalShippingAddressId)
        .eq('organization_id', profile.current_organization_id)
        .single();

      if (addressError || !shippingAddress) {
        finalShippingAddressId = null;
      }
    }

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        organization_id: profile.current_organization_id,
        user_id: user.id,
        status: 'submitted',
        subtotal,
        tax,
        shipping_cost: shippingCost,
        total,
        shipping_address_id: finalShippingAddressId,
        po_number: poNumber || null,
        notes: notes || 'Bulk order upload',
        payment_terms: paymentTerms || 'net_30',
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderError) {
      logger.error('Error creating order:', orderError);
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      );
    }

    // Create order items
    const orderItems = pricedItems.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      sku: item.sku,
      name: item.name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.line_total,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      logger.error('Error creating order items:', itemsError);
      // Rollback: delete the order
      await supabase.from('orders').delete().eq('id', order.id);
      return NextResponse.json(
        { error: 'Failed to create order items' },
        { status: 500 }
      );
    }

    // Send notification (non-blocking)
    fetch('/api/notifications/order-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: order.id,
        status: 'submitted',
      }),
    }).catch(err => logger.error('Failed to send notification:', err));

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        order_number: order.order_number,
        subtotal,
        tax,
        shipping_cost: shippingCost,
        total,
        items_count: pricedItems.length,
      }
    });

  } catch (error) {
    logger.error('Error in bulk submit API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
