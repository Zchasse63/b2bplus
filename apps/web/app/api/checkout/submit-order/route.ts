import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Require authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { shippingAddressId, poNumber, notes } = body;

    if (!shippingAddressId) {
      return NextResponse.json(
        { error: 'Shipping address is required' },
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

    // SECURITY: Fetch cart items from DATABASE (not from client)
    const { data: cartItems, error: cartError } = await supabase
      .from('cart_items')
      .select(`
        id,
        quantity,
        product_id,
        products (
          id,
          name,
          sku,
          base_price,
          is_active
        )
      `)
      .eq('user_id', user.id);

    if (cartError) {
      console.error('Error fetching cart:', cartError);
      return NextResponse.json(
        { error: 'Failed to fetch cart' },
        { status: 500 }
      );
    }

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json(
        { error: 'Cart is empty' },
        { status: 400 }
      );
    }

    // Validate all products are active
    const inactiveProducts = cartItems.filter(item => !item.products?.is_active);
    if (inactiveProducts.length > 0) {
      return NextResponse.json(
        {
          error: 'Some products in your cart are no longer available',
          inactiveProducts: inactiveProducts.map(item => item.products?.name)
        },
        { status: 400 }
      );
    }

    // SECURITY: Calculate pricing SERVER-SIDE using database function
    // This ensures accurate customer-specific pricing
    const productIds = cartItems.map(item => item.product_id);

    // Fetch customer-specific prices for each product
    const pricingPromises = cartItems.map(async (item) => {
      const { data: price } = await supabase.rpc('get_customer_price', {
        p_customer_id: user.id,
        p_product_id: item.product_id,
        p_quantity: item.quantity,
        p_date: new Date().toISOString().split('T')[0]
      });

      return {
        product_id: item.product_id,
        sku: item.products?.sku,
        name: item.products?.name,
        quantity: item.quantity,
        unit_price: price || item.products?.base_price || 0,
        line_total: (price || item.products?.base_price || 0) * item.quantity
      };
    });

    const pricedItems = await Promise.all(pricingPromises);

    // SECURITY: Calculate totals SERVER-SIDE
    const subtotal = pricedItems.reduce((sum, item) => sum + item.line_total, 0);

    // Fetch tax rate from database (or use default)
    // TODO: In production, calculate tax based on shipping address location
    const taxRate = 0.08; // 8% default tax rate
    const tax = subtotal * taxRate;

    // Calculate shipping cost based on business rules
    const freeShippingThreshold = 500;
    const standardShippingCost = 50;
    const shippingCost = subtotal >= freeShippingThreshold ? 0 : standardShippingCost;

    const total = subtotal + tax + shippingCost;

    // Verify shipping address belongs to organization
    const { data: shippingAddress, error: addressError } = await supabase
      .from('shipping_addresses')
      .select('*')
      .eq('id', shippingAddressId)
      .eq('organization_id', profile.current_organization_id)
      .single();

    if (addressError || !shippingAddress) {
      return NextResponse.json(
        { error: 'Invalid shipping address' },
        { status: 400 }
      );
    }

    // Create order with SERVER-VERIFIED pricing
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
        shipping_address_id: shippingAddressId,
        po_number: poNumber || null,
        notes: notes || null,
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      );
    }

    // Create order items with SERVER-VERIFIED pricing
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
      console.error('Error creating order items:', itemsError);
      // Rollback: delete the order
      await supabase.from('orders').delete().eq('id', order.id);
      return NextResponse.json(
        { error: 'Failed to create order items' },
        { status: 500 }
      );
    }

    // Clear cart
    const { error: clearError } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', user.id);

    if (clearError) {
      console.error('Error clearing cart:', clearError);
      // Don't fail the order if cart clear fails
    }

    // Send notification (non-blocking)
    fetch('/api/notifications/order-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: order.id,
        status: 'submitted',
      }),
    }).catch(err => console.error('Failed to send notification:', err));

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        order_number: order.order_number,
        subtotal,
        tax,
        shippingCost,
        total,
        items: pricedItems,
      }
    });

  } catch (error) {
    console.error('Error in checkout API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
