import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { handleError, AuthError, ForbiddenError, ValidationError, NotFoundError } from '@/lib/middleware/error-handler';

// POST generate recommendations for all products
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'admin');
    if (!allowed) return rateLimitResponse!;

    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new AuthError('Unauthorized');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      throw new ForbiddenError('Admin access required');
    }

    // Check if recommendations feature is enabled
    const { data: featureFlag } = await supabase
      .from('feature_flags')
      .select('enabled')
      .eq('feature_name', 'smart_recommendations')
      .single();

    if (!featureFlag?.enabled) {
      throw new ValidationError('Smart recommendations feature is not enabled');
    }

    // Get all active products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, category, base_price')
      .eq('is_active', true);

    if (productsError || !products || products.length === 0) {
      throw new NotFoundError('Active products');
    }

    let generated = 0;
    const errors: any[] = [];

    // Generate "also bought" recommendations based on order history
    for (const product of products) {
      try {
        // Find products frequently bought together
        const { data: alsoBought } = await supabase.rpc('get_also_bought_products', {
          p_product_id: product.id,
          p_limit: 5
        });

        if (alsoBought && alsoBought.length > 0) {
          for (const rec of alsoBought) {
            await supabase
              .from('product_recommendations')
              .upsert({
                product_id: product.id,
                recommended_product_id: rec.recommended_product_id,
                recommendation_type: 'also_bought',
                score: rec.score,
                reason: `Frequently bought together (${rec.times_bought} times)`,
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'product_id,recommended_product_id,recommendation_type'
              });
          }
          generated++;
        }

        // Generate "similar" recommendations based on category and price
        const { data: similar } = await supabase
          .from('products')
          .select('id')
          .eq('category', product.category)
          .neq('id', product.id)
          .gte('base_price', product.base_price * 0.8)
          .lte('base_price', product.base_price * 1.2)
          .eq('is_active', true)
          .limit(3);

        if (similar && similar.length > 0) {
          for (let i = 0; i < similar.length; i++) {
            await supabase
              .from('product_recommendations')
              .upsert({
                product_id: product.id,
                recommended_product_id: similar[i].id,
                recommendation_type: 'similar',
                score: 0.8 - (i * 0.1), // Decreasing score
                reason: 'Similar category and price range',
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'product_id,recommended_product_id,recommendation_type'
              });
          }
        }

      } catch (error) {
        console.error('Error generating recommendations for product:', product.id, error);
        errors.push({
          productId: product.id,
          productName: product.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      generated,
      total: products.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    return handleError(error);
  }
}

// Helper function to get products also bought (would be implemented as a database function)
// This is a placeholder - the actual logic would be in a Supabase function
