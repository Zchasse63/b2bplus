import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get request body
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Get user's organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const organizationId = userData.organization_id;

    // Verify the order belongs to the user's organization
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, organization_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    if (order.organization_id !== organizationId) {
      return NextResponse.json(
        { error: 'You do not have permission to reorder this order' },
        { status: 403 }
      );
    }

    // Get all order items
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('product_id, quantity')
      .eq('order_id', orderId);

    if (itemsError || !orderItems || orderItems.length === 0) {
      return NextResponse.json(
        { error: 'No items found in this order' },
        { status: 400 }
      );
    }

    // Process each item
    let itemsAdded = 0;
    let itemsSkipped = 0;
    const skippedProducts: string[] = [];

    for (const item of orderItems) {
      // Check if product still exists
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, name')
        .eq('id', item.product_id)
        .single();

      if (productError || !product) {
        itemsSkipped++;
        skippedProducts.push(item.product_id);
        continue;
      }

      // Check if item already in cart
      const { data: existingCartItem } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('product_id', item.product_id)
        .single();

      if (existingCartItem) {
        // Update existing cart item (add quantities)
        const { error: updateError } = await supabase
          .from('cart_items')
          .update({
            quantity: existingCartItem.quantity + item.quantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingCartItem.id);

        if (!updateError) {
          itemsAdded++;
        }
      } else {
        // Add new cart item
        const { error: insertError } = await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            product_id: item.product_id,
            quantity: item.quantity,
            organization_id: organizationId
          });

        if (!insertError) {
          itemsAdded++;
        }
      }
    }

    // Build response message
    let message = '';
    if (itemsSkipped === 0) {
      message = `${itemsAdded} item${itemsAdded !== 1 ? 's' : ''} added to cart`;
    } else {
      message = `${itemsAdded} of ${orderItems.length} items added to cart (${itemsSkipped} unavailable)`;
    }

    return NextResponse.json({
      success: true,
      cartItemsAdded: itemsAdded,
      itemsSkipped: itemsSkipped,
      message: message
    });

  } catch (error) {
    console.error('Reorder error:', error);
    return NextResponse.json(
      { error: 'Failed to reorder. Please try again.' },
      { status: 500 }
    );
  }
}
