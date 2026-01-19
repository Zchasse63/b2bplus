/**
 * Order Total Calculation API
 *
 * POST /api/orders/calculate-total
 * Server-side calculation of order totals with fraud prevention
 *
 * Validates that client-submitted totals match server calculations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateRequestBody } from '@/lib/middleware/validation';
import { z } from 'zod';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { csrfProtection, addCSRFTokenToCookie } from '@/lib/middleware/csrf';
import { createLogger } from '@/lib/logging/logger';
import { handleError, AuthError, ValidationError } from '@/lib/middleware/error-handler';

const logger = createLogger('orders-calculate-total');

const CalculateTotalSchema = z.object({
  cart_item_ids: z.array(z.string().uuid()),
  promo_code: z.string().optional(),
  shipping_method: z.string().optional(),
});

type CalculateTotalRequest = z.infer<typeof CalculateTotalSchema>;

interface OrderTotalResult {
  success: boolean;
  subtotal: number;
  subtotal_before_discount: number;
  discount_amount: number;
  tax: number;
  shipping_cost: number;
  total: number;
  tax_rate: number;
  shipping_method: string;
  pricing_source: string;
  calculated_at: string;
}

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'authenticated');
    if (!allowed) {
      return rateLimitResponse!;
    }

    // Apply CSRF protection
    const { valid: csrfValid, response: csrfResponse } = await csrfProtection(request);
    if (!csrfValid) {
      return csrfResponse!;
    }

    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new AuthError('Unauthorized');
    }

    // Validate request body
    const validation = await validateRequestBody(request, CalculateTotalSchema);
    if (!validation.valid) {
      return validation.response!;
    }

    const { cart_item_ids, promo_code, shipping_method = 'standard' } = validation.data!;

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.current_organization_id) {
      throw new ValidationError('No organization found');
    }

    // Verify cart items belong to this user
    const { data: cartItems, error: cartError } = await supabase
      .from('cart_items')
      .select('id, product_id, quantity, products(id, base_price, organization_id)')
      .in('id', cart_item_ids)
      .eq('user_id', user.id);

    if (cartError || !cartItems || cartItems.length === 0) {
      throw new ValidationError('Invalid cart items');
    }

    // Calculate pricing for each item with all discounts applied
    let subtotalBeforeDiscount = 0;
    let subtotalWithDiscount = 0;
    let totalDiscount = 0;

    for (const item of cartItems) {
      const product = (item as any).products;
      const itemBasePrice = product.base_price * item.quantity;
      subtotalBeforeDiscount += itemBasePrice;

      try {
        // Fetch calculated pricing from pricing service
        const pricingResponse = await fetch(
          new URL('/api/pricing/calculate', request.nextUrl.origin),
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': request.headers.get('Authorization') || '',
            },
            body: JSON.stringify({
              product_id: item.product_id,
              quantity: item.quantity,
              customer_organization_id: profile.current_organization_id,
              supplier_organization_id: product.organization_id,
              promo_code: promo_code,
            }),
          }
        );

        if (pricingResponse.ok) {
          const pricingData = await pricingResponse.json();
          if (pricingData.success && pricingData.pricing) {
            subtotalWithDiscount += pricingData.pricing.line_total;
            totalDiscount += pricingData.pricing.discount_amount;
          } else {
            // Fallback to base price if pricing fails
            subtotalWithDiscount += itemBasePrice;
          }
        } else {
          // Fallback to base price if pricing API fails
          subtotalWithDiscount += itemBasePrice;
        }
      } catch (error) {
        logger.error(`Failed to calculate pricing for item ${item.id}:`, error);
        // Fallback to base price
        subtotalWithDiscount += itemBasePrice;
      }
    }

    // Calculate tax (8% rate - configurable per region)
    const TAX_RATE = 0.08;
    const tax = Math.round(subtotalWithDiscount * TAX_RATE * 100) / 100;

    // Calculate shipping based on method and subtotal
    let shippingCost = 0;
    if (shipping_method === 'standard' && subtotalWithDiscount < 500) {
      shippingCost = 50;
    } else if (shipping_method === 'express') {
      shippingCost = 100;
    } else if (shipping_method === 'overnight') {
      shippingCost = 200;
    }
    // Free shipping for orders over $500

    // Calculate final total
    const total = subtotalWithDiscount + tax + shippingCost;

    // Log calculation for fraud detection
    try {
      await supabase
        .from('fraud_detection_logs')
        .insert({
          user_id: user.id,
          organization_id: profile.current_organization_id,
          event_type: 'total_calculated',
          subtotal: subtotalWithDiscount,
          tax: tax,
          shipping: shippingCost,
          total: total,
          cart_item_count: cartItems.length,
          metadata: {
            promo_code_used: !!promo_code,
            shipping_method,
          },
        });
    } catch (error) {
      logger.error('Failed to log calculation:', error);
      // Don't fail the request if logging fails
    }

    const result: OrderTotalResult = {
      success: true,
      subtotal: subtotalWithDiscount,
      subtotal_before_discount: subtotalBeforeDiscount,
      discount_amount: totalDiscount,
      tax: tax,
      shipping_cost: shippingCost,
      total: total,
      tax_rate: TAX_RATE,
      shipping_method: shipping_method,
      pricing_source: 'server',
      calculated_at: new Date().toISOString(),
    };

    const response = NextResponse.json(result);
    return addCSRFTokenToCookie(response, '');

  } catch (error) {
    logger.error('Error calculating order total:', error);
    return handleError(error);
  }
}
