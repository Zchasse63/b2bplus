import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
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

    // OPTIMIZED: Batch fetch all products in a single query
    const productIds = orderItems.map(item => item.product_id);
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, is_active')
      .in('id', productIds);

    if (productsError) {
      return NextResponse.json(
        { error: 'Failed to fetch products' },
        { status: 500 }
      );
    }

    // Create a Set of valid product IDs for fast lookup
    const validProductIds = new Set(
      (products || []).filter(p => p.is_active).map(p => p.id)
    );

    // ATOMIC: Use database function to handle race conditions
    // This ensures that concurrent requests don't cause duplicate inserts or lost updates
    const itemsToUpsert: Array<{
      user_id: string;
      product_id: string;
      quantity: number;
      organization_id: string;
    }> = [];
    let itemsSkipped = 0;
    const skippedProducts: string[] = [];

    // Process each item - prepare upsert data
    for (const item of orderItems) {
      // Check if product is valid and active
      if (!validProductIds.has(item.product_id)) {
        itemsSkipped++;
        skippedProducts.push(item.product_id);
        continue;
      }

      itemsToUpsert.push({
        user_id: user.id,
        product_id: item.product_id,
        quantity: item.quantity,
        organization_id: organizationId
      });
    }

    // ATOMIC: Use database function to upsert items with proper concurrency control
    // Each call is atomic and race-condition safe
    let itemsAdded = 0;
    if (itemsToUpsert.length > 0) {
      // Use Promise.all to process items in parallel
      const upsertPromises = itemsToUpsert.map(async (item) => {
        const { data, error } = await supabase.rpc('upsert_cart_item_atomic', {
          p_user_id: item.user_id,
          p_product_id: item.product_id,
          p_quantity: item.quantity,
          p_organization_id: item.organization_id
        });

        if (error) {
          console.error('Error upserting cart item:', error);
          return false;
        }

        return data?.[0]?.success || false;
      });

      const results = await Promise.all(upsertPromises);
      itemsAdded = results.filter(success => success).length;
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
