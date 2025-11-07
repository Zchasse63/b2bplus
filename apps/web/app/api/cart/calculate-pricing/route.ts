import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiSuccess, apiError, apiUnauthorized, apiValidationError } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { errorMonitor } from '@/lib/error-monitoring';
import { safeAdd, safeMultiply, safeParseFloat, safeRound, safeDivide } from '@/lib/math-safe';

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

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Require authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiUnauthorized();
    }

    const { cartItems, promoCode, shippingAddressId } = await request.json();

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return apiValidationError('Cart items are required', ['Cart cannot be empty']);
    }

    // Validate cart items
    for (const item of cartItems) {
      if (!item?.product_id || typeof item?.quantity !== 'number' || item.quantity < 1) {
        return apiValidationError('Invalid cart item format', ['Each item must have product_id and valid quantity']);
      }
    }

    // Fetch all product prices from database
    const productIds = cartItems.map((item: CartItem) => item.product_id);
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, base_price, is_active')
      .in('id', productIds);

    if (productsError || !products) {
      logger.error('Failed to fetch product prices', {
        userId: user.id,
        productIds,
        error: productsError?.message
      });
      return apiError('Failed to fetch product prices', 500);
    }

    // Check for inactive products
    const inactiveProducts = products.filter(p => !p?.is_active);
    if (inactiveProducts.length > 0) {
      logger.warn('Cart contains unavailable products', {
        userId: user.id,
        unavailableProducts: inactiveProducts.map(p => p?.name ?? 'Unknown')
      });
      return apiValidationError(
        'Cart contains unavailable products',
        inactiveProducts.map(p => `${p?.name ?? 'Unknown'} is no longer available`)
      );
    }

    // Calculate subtotal using SERVER-SIDE prices only with safe math operations
    let subtotal = 0;
    const itemsBreakdown = cartItems.map((cartItem: CartItem) => {
      const product = products.find(p => p.id === cartItem.product_id);
      if (!product) {
        throw new Error(`Product ${cartItem.product_id} not found`);
      }

      const unitPrice = safeParseFloat(product.base_price, 0);
      const lineTotal = safeMultiply(unitPrice, cartItem.quantity);
      subtotal = safeAdd(subtotal, lineTotal);

      return {
        product_id: product.id,
        name: product.name,
        quantity: cartItem.quantity,
        unit_price: safeRound(unitPrice, 2),
        line_total: safeRound(lineTotal, 2)
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
              // Apply discount with safe math operations
              if (promo.discount_type === 'percentage') {
                const discountPercent = safeDivide(safeParseFloat(promo.discount_value, 0), 100, 0);
                promoDiscount = safeMultiply(subtotal, discountPercent);
              } else if (promo.discount_type === 'fixed') {
                promoDiscount = Math.min(safeParseFloat(promo.discount_value, 0), subtotal);
              }

              validPromoCode = promo.code;
            }
          }
        }
      }
    }

    const subtotalAfterDiscount = safeAdd(subtotal, -promoDiscount);

    // Calculate shipping (server-side business logic)
    // TODO: Implement proper shipping calculation based on address, weight, etc.
    const FREE_SHIPPING_THRESHOLD = 500;
    const STANDARD_SHIPPING = 50;
    const shipping = subtotalAfterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING;

    // Calculate tax (server-side based on shipping address) with safe math
    // TODO: Implement proper tax calculation based on jurisdiction
    const TAX_RATE = 0.08; // 8% - should be dynamic based on location
    const tax = safeMultiply(subtotalAfterDiscount, TAX_RATE);

    // Calculate final total with safe addition
    const total = safeAdd(subtotalAfterDiscount, shipping, tax);

    const pricingBreakdown: PricingBreakdown = {
      subtotal: safeRound(subtotal, 2),
      promoDiscount: safeRound(promoDiscount, 2),
      promoCode: validPromoCode,
      subtotalAfterDiscount: safeRound(subtotalAfterDiscount, 2),
      shipping: safeRound(shipping, 2),
      tax: safeRound(tax, 2),
      total: safeRound(total, 2),
      items: itemsBreakdown
    };

    logger.info('Cart pricing calculated', {
      userId: user?.id,
      itemCount: cartItems.length,
      total: pricingBreakdown.total,
      promoCode: validPromoCode
    });

    return apiSuccess(
      { pricing: pricingBreakdown },
      'Pricing calculated successfully'
    );

  } catch (error) {
    // Get user ID for error tracking
    let userId: string | undefined;
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
    } catch {
      // Ignore errors getting user for error tracking
    }

    logger.error('Error calculating cart pricing', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId
    });

    // Report to error monitoring
    errorMonitor.report(error instanceof Error ? error : new Error(String(error)), {
      category: 'payment',
      severity: 'high',
      userId,
      operation: 'calculate-cart-pricing'
    });

    // Production: Generic message, Development: Detailed error
    if (process.env.NODE_ENV === 'production') {
      return apiError('An error occurred while calculating pricing. Please try again.', 500);
    }

    return apiError(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}
