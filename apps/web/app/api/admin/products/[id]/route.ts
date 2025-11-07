import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAdminRole } from '@/lib/middleware/admin';
import { logger } from '@/lib/logger';

/**
 * DELETE /api/admin/products/[id]
 * Delete a product with cascade checks
 *
 * SECURITY: Requires admin role
 * DATA INTEGRITY: Checks for related records before deletion
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // SECURITY: Check admin authorization
    const authCheck = await checkAdminRole();
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }
    const { user } = authCheck;

    const productId = params.id;

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get product details first
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, sku, name')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // DATA INTEGRITY: Check for related records that would be affected
    // This prevents orphaned records and data integrity issues

    // 1. Check order_items (historical orders)
    const { data: orderItems, error: orderItemsError } = await supabase
      .from('order_items')
      .select('id')
      .eq('product_id', productId)
      .limit(1);

    if (orderItemsError) {
      throw new Error(`Failed to check order items: ${orderItemsError.message}`);
    }

    if (orderItems && orderItems.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete product',
          message: 'This product appears in historical orders and cannot be deleted.',
          suggestion: 'Consider marking the product as inactive instead.',
          details: {
            hasOrderItems: true,
            product: {
              id: product.id,
              sku: product.sku,
              name: product.name,
            },
          },
        },
        { status: 409 } // Conflict
      );
    }

    // 2. Check cart_items (active shopping carts)
    const { data: cartItems, error: cartItemsError } = await supabase
      .from('cart_items')
      .select('id')
      .eq('product_id', productId)
      .limit(1);

    if (cartItemsError) {
      throw new Error(`Failed to check cart items: ${cartItemsError.message}`);
    }

    if (cartItems && cartItems.length > 0) {
      // Remove from carts automatically (safe to do)
      const { error: deleteCartError } = await supabase
        .from('cart_items')
        .delete()
        .eq('product_id', productId);

      if (deleteCartError) {
        logger.error('Failed to remove from carts:', deleteCartError);
      }
    }

    // 3. Check customer_product_pricing (custom pricing)
    const { data: customPricing, error: pricingError } = await supabase
      .from('customer_product_pricing')
      .select('id')
      .eq('product_id', productId)
      .limit(1);

    if (pricingError) {
      throw new Error(`Failed to check custom pricing: ${pricingError.message}`);
    }

    if (customPricing && customPricing.length > 0) {
      // Delete custom pricing (safe to do)
      const { error: deletePricingError } = await supabase
        .from('customer_product_pricing')
        .delete()
        .eq('product_id', productId);

      if (deletePricingError) {
        logger.error('Failed to delete custom pricing:', deletePricingError);
      }
    }

    // 4. Check volume_discounts
    const { data: volumeDiscounts, error: discountsError } = await supabase
      .from('volume_discounts')
      .select('id')
      .eq('product_id', productId)
      .limit(1);

    if (discountsError) {
      throw new Error(`Failed to check volume discounts: ${discountsError.message}`);
    }

    if (volumeDiscounts && volumeDiscounts.length > 0) {
      // Delete volume discounts (safe to do)
      const { error: deleteDiscountsError } = await supabase
        .from('volume_discounts')
        .delete()
        .eq('product_id', productId);

      if (deleteDiscountsError) {
        logger.error('Failed to delete volume discounts:', deleteDiscountsError);
      }
    }

    // 5. Check opportunity_products (sales opportunities)
    const { data: opportunityProducts, error: oppProdError } = await supabase
      .from('opportunity_products')
      .select('id')
      .eq('product_id', productId)
      .limit(1);

    if (oppProdError) {
      throw new Error(`Failed to check opportunities: ${oppProdError.message}`);
    }

    if (opportunityProducts && opportunityProducts.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete product',
          message: 'This product is associated with sales opportunities and cannot be deleted.',
          suggestion: 'Consider marking the product as inactive instead.',
          details: {
            hasOpportunities: true,
            product: {
              id: product.id,
              sku: product.sku,
              name: product.name,
            },
          },
        },
        { status: 409 } // Conflict
      );
    }

    // 6. Check product_recommendations
    const { count: recommendationCount, error: recError } = await supabase
      .from('product_recommendations')
      .select('*', { count: 'exact', head: true })
      .or(`product_id.eq.${productId},recommended_product_id.eq.${productId}`);

    if (recError) {
      throw new Error(`Failed to check recommendations: ${recError.message}`);
    }

    if (recommendationCount && recommendationCount > 0) {
      // Delete recommendations (safe to do)
      const { error: deleteRecError } = await supabase
        .from('product_recommendations')
        .delete()
        .or(`product_id.eq.${productId},recommended_product_id.eq.${productId}`);

      if (deleteRecError) {
        logger.error('Failed to delete recommendations:', deleteRecError);
      }
    }

    // All cascade checks passed - safe to delete
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (deleteError) {
      throw new Error(`Failed to delete product: ${deleteError.message}`);
    }

    // Log the deletion
    await supabase.from('admin_activity_log').insert({
      admin_id: user.id,
      action: 'delete',
      entity_type: 'product',
      entity_id: productId,
      details: {
        sku: product.sku,
        name: product.name,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
      product: {
        id: product.id,
        sku: product.sku,
        name: product.name,
      },
    });
  } catch (error) {
    logger.error('Error deleting product:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete product',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/products/[id]
 * Get product details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authCheck = await checkAdminRole();
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const productId = params.id;

    const supabase = await createClient();

    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (error || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ product });
  } catch (error) {
    logger.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/products/[id]
 * Update product details
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authCheck = await checkAdminRole();
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }
    const { user } = authCheck;

    const productId = params.id;
    const body = await request.json();

    const supabase = await createClient();

    const { data: product, error } = await supabase
      .from('products')
      .update(body)
      .eq('id', productId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Log the update
    await supabase.from('admin_activity_log').insert({
      admin_id: user.id,
      action: 'update',
      entity_type: 'product',
      entity_id: productId,
      details: {
        updates: body,
      },
    });

    return NextResponse.json({ product });
  } catch (error) {
    logger.error('Error updating product:', error);
    return NextResponse.json(
      {
        error: 'Failed to update product',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
