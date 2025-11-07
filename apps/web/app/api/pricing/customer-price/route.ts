import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRole } from '@/lib/middleware/admin';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { productId, quantity = 1, customerId } = body;

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // SECURITY: Only admins can query pricing for other customers
    // Prevents customer impersonation and unauthorized access to pricing data
    if (customerId && customerId !== user.id) {
      const { error: adminError } = await checkAdminRole();
      if (adminError) {
        return NextResponse.json(
          { error: 'Forbidden: Only admins can query pricing for other customers' },
          { status: 403 }
        );
      }
    }

    // Use provided customerId (admin only) or current user
    const targetCustomerId = customerId || user.id;

    // Call the database function to get customer price
    const { data, error } = await supabase.rpc('get_customer_price', {
      p_customer_id: targetCustomerId,
      p_product_id: productId,
      p_quantity: quantity,
      p_date: new Date().toISOString().split('T')[0]
    });

    if (error) {
      console.error('Error getting customer price:', error);
      return NextResponse.json(
        { error: 'Failed to calculate price' },
        { status: 500 }
      );
    }

    // Get product details for context
    const { data: product } = await supabase
      .from('products')
      .select('id, name, sku, base_price')
      .eq('id', productId)
      .single();

    // Get customer tier info
    const { data: tierInfo } = await supabase
      .from('customer_pricing_tiers')
      .select(`
        tier:pricing_tiers (
          name,
          discount_percentage
        )
      `)
      .eq('customer_id', targetCustomerId)
      .gte('effective_to', new Date().toISOString().split('T')[0])
      .or(`effective_to.is.null`)
      .lte('effective_from', new Date().toISOString().split('T')[0])
      .order('effective_from', { ascending: false })
      .limit(1)
      .single();

    // Get volume discount info if applicable
    const { data: volumeDiscount } = await supabase
      .from('volume_discounts')
      .select('*')
      .eq('product_id', productId)
      .eq('is_active', true)
      .lte('min_quantity', quantity)
      .or(`max_quantity.gte.${quantity},max_quantity.is.null`)
      .lte('effective_from', new Date().toISOString().split('T')[0])
      .or(`effective_to.gte.${new Date().toISOString().split('T')[0]},effective_to.is.null`)
      .order('min_quantity', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      success: true,
      price: data,
      basePrice: product?.base_price || 0,
      savings: product?.base_price ? (product.base_price - data) : 0,
      savingsPercentage: product?.base_price 
        ? Math.round(((product.base_price - data) / product.base_price) * 100)
        : 0,
      product: product,
      appliedDiscounts: {
        tier: tierInfo?.tier || null,
        volumeDiscount: volumeDiscount || null
      }
    });

  } catch (error) {
    console.error('Error in customer-price API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to get price for a single product
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const quantity = parseInt(searchParams.get('quantity') || '1');

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc('get_customer_price', {
      p_customer_id: user.id,
      p_product_id: productId,
      p_quantity: quantity,
      p_date: new Date().toISOString().split('T')[0]
    });

    if (error) {
      console.error('Error getting customer price:', error);
      return NextResponse.json(
        { error: 'Failed to calculate price' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      price: data,
      quantity: quantity
    });

  } catch (error) {
    console.error('Error in customer-price GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
