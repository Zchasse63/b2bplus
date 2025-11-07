import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Server-side cart pricing calculation endpoint
 * SECURITY: All pricing MUST be calculated server-side to prevent manipulation
 */

interface CartItem {
  product_id: string;
  quantity: number;
  promo_code?: string;
}

interface PricingBreakdown {
  subtotal: number;
  promoDiscount: number;
  promoCode: string | null;
  subtotalAfterDiscount: number;
  shipping: number;
  tax: number;
  total: number;
  items: Array<{
    product_id: string;
    name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cartItems, promoCode, shippingAddressId } = await request.json();

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return NextResponse.json(
        { error: 'Cart items are required' },
        { status: 400 }
      );
    }

    // Validate cart items
    for (const item of cartItems) {
      if (!item.product_id || typeof item.quantity !== 'number' || item.quantity < 1) {
        return NextResponse.json(
          { error: 'Invalid cart item format' },
          { status: 400 }
        );
      }
    }

    // Fetch all product prices from database
    const productIds = cartItems.map((item: CartItem) => item.product_id);
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, base_price, is_active')
      .in('id', productIds);

    if (productsError || !products) {
      return NextResponse.json(
        { error: 'Failed to fetch product prices' },
        { status: 500 }
      );
    }

    // Check for inactive products
    const inactiveProducts = products.filter(p => !p.is_active);
    if (inactiveProducts.length > 0) {
      return NextResponse.json(
        {
          error: 'Cart contains unavailable products',
          unavailable_products: inactiveProducts.map(p => p.name)
        },
        { status: 400 }
      );
    }

    // Calculate subtotal using SERVER-SIDE prices only
    let subtotal = 0;
    const itemsBreakdown = cartItems.map((cartItem: CartItem) => {
      const product = products.find(p => p.id === cartItem.product_id);
      if (!product) {
        throw new Error(`Product ${cartItem.product_id} not found`);
      }

      const unitPrice = parseFloat(String(product.base_price));
      const lineTotal = unitPrice * cartItem.quantity;
      subtotal += lineTotal;

      return {
        product_id: product.id,
        name: product.name,
        quantity: cartItem.quantity,
        unit_price: unitPrice,
        line_total: lineTotal
      };
    });

    // Validate and apply promo code SERVER-SIDE
    let promoDiscount = 0;
    let validPromoCode: string | null = null;

    if (promoCode) {
      const { data: promo } = await supabase
        .from('promotional_codes')
        .select('*')
        .eq('code', promoCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (promo) {
        // Check expiration
        const now = new Date();
        const expiresAt = new Date(promo.expires_at);

        if (now <= expiresAt) {
          // Check minimum order amount
          if (!promo.min_order_amount || subtotal >= promo.min_order_amount) {
            // Check usage limit
            const { count: usageCount } = await supabase
              .from('promo_code_usage')
              .select('id', { count: 'exact' })
              .eq('promo_code_id', promo.id)
              .eq('user_id', user.id);

            if (!promo.max_uses_per_customer || (usageCount || 0) < promo.max_uses_per_customer) {
              // Apply discount
              if (promo.discount_type === 'percentage') {
                promoDiscount = subtotal * (promo.discount_value / 100);
              } else if (promo.discount_type === 'fixed') {
                promoDiscount = Math.min(promo.discount_value, subtotal);
              }

              validPromoCode = promo.code;
            }
          }
        }
      }
    }

    const subtotalAfterDiscount = subtotal - promoDiscount;

    // Calculate shipping (server-side business logic)
    // TODO: Implement proper shipping calculation based on address, weight, etc.
    const FREE_SHIPPING_THRESHOLD = 500;
    const STANDARD_SHIPPING = 50;
    const shipping = subtotalAfterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING;

    // Calculate tax (server-side based on shipping address)
    // TODO: Implement proper tax calculation based on jurisdiction
    const TAX_RATE = 0.08; // 8% - should be dynamic based on location
    const tax = subtotalAfterDiscount * TAX_RATE;

    // Calculate final total
    const total = subtotalAfterDiscount + shipping + tax;

    const pricingBreakdown: PricingBreakdown = {
      subtotal: Math.round(subtotal * 100) / 100,
      promoDiscount: Math.round(promoDiscount * 100) / 100,
      promoCode: validPromoCode,
      subtotalAfterDiscount: Math.round(subtotalAfterDiscount * 100) / 100,
      shipping: Math.round(shipping * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round(total * 100) / 100,
      items: itemsBreakdown
    };

    return NextResponse.json({
      success: true,
      pricing: pricingBreakdown
    });

  } catch (error) {
    console.error('Error calculating cart pricing:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
