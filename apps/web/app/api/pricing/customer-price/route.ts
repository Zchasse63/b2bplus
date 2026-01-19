import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { handleError, AuthError, ValidationError, DatabaseError } from '@/lib/middleware/error-handler';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'authenticated');
    if (!allowed) return rateLimitResponse!;

    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new AuthError('Unauthorized');
    }

    const body = await request.json();
    const { productId, quantity = 1, customerId } = body;

    if (!productId) {
      throw new ValidationError('Product ID is required');
    }

    // Use provided customerId or current user
    const targetCustomerId = customerId || user.id;

    // Call the database function to get customer price
    const { data, error } = await supabase.rpc('get_customer_price', {
      p_customer_id: targetCustomerId,
      p_product_id: productId,
      p_quantity: quantity,
      p_date: new Date().toISOString().split('T')[0]
    });

    if (error) {
      throw DatabaseError.queryFailed('pricing', 'get_customer_price');
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
    return handleError(error);
  }
}

// GET endpoint to get price for a single product
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'authenticated');
    if (!allowed) return rateLimitResponse!;

    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new AuthError('Unauthorized');
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const quantity = parseInt(searchParams.get('quantity') || '1');

    if (!productId) {
      throw new ValidationError('Product ID is required');
    }

    const { data, error } = await supabase.rpc('get_customer_price', {
      p_customer_id: user.id,
      p_product_id: productId,
      p_quantity: quantity,
      p_date: new Date().toISOString().split('T')[0]
    });

    if (error) {
      throw DatabaseError.queryFailed('pricing', 'get_customer_price');
    }

    return NextResponse.json({
      success: true,
      price: data,
      quantity: quantity
    });

  } catch (error) {
    return handleError(error);
  }
}
