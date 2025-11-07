import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// POST generate recommendations for all products
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if recommendations feature is enabled
    const { data: featureFlag } = await supabase
      .from('feature_flags')
      .select('enabled')
      .eq('feature_name', 'smart_recommendations')
      .single();

    if (!featureFlag?.enabled) {
      return NextResponse.json(
        { error: 'Smart recommendations feature is not enabled' },
        { status: 400 }
      );
    }

    // Get all active products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, category, base_price')
      .eq('is_active', true);

    if (productsError || !products || products.length === 0) {
      return NextResponse.json({ error: 'No products found' }, { status: 404 });
    }

    let generated = 0;
    const errors: Array<{ message: string; [key: string]: unknown }> = [];
    const allRecommendations: Array<{
      product_id: string;
      recommended_product_id: string;
      recommendation_type: string;
      score: number;
      reason: string;
      updated_at: string;
    }> = [];

    // OPTIMIZED: Process products in batches to avoid overwhelming the database
    const BATCH_SIZE = 50;
    const now = new Date().toISOString();

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);
      const batchProductIds = batch.map(p => p.id);

      // OPTIMIZED: Batch fetch "also bought" recommendations for all products in batch
      const alsoBoughtPromises = batch.map(product =>
        supabase.rpc('get_also_bought_products', {
          p_product_id: product.id,
          p_limit: 5
        }).then(result => ({
          productId: product.id,
          alsoBought: result.data || []
        }))
      );

      const alsoBoughtResults = await Promise.all(alsoBoughtPromises);

      // Collect all "also bought" recommendations
      for (const result of alsoBoughtResults) {
        if (result.alsoBought.length > 0) {
          for (const rec of result.alsoBought) {
            allRecommendations.push({
              product_id: result.productId,
              recommended_product_id: rec.recommended_product_id,
              recommendation_type: 'also_bought',
              score: rec.score,
              reason: `Frequently bought together (${rec.times_bought} times)`,
              updated_at: now
            });
          }
          generated++;
        }
      }

      // OPTIMIZED: Generate "similar" recommendations using a more efficient approach
      // Group products by category for batch processing
      const categoryGroups = new Map<string, typeof batch>();
      for (const product of batch) {
        if (!categoryGroups.has(product.category)) {
          categoryGroups.set(product.category, []);
        }
        categoryGroups.get(product.category)!.push(product);
      }

      // For each category, find similar products in batch
      for (const [category, categoryProducts] of categoryGroups) {
        const { data: similarProducts } = await supabase
          .from('products')
          .select('id, base_price')
          .eq('category', category)
          .eq('is_active', true)
          .not('id', 'in', `(${categoryProducts.map(p => p.id).join(',')})`);

        if (similarProducts && similarProducts.length > 0) {
          // For each product in category, find 3 most similar by price
          for (const product of categoryProducts) {
            const similar = similarProducts
              .filter(sp =>
                sp.base_price >= product.base_price * 0.8 &&
                sp.base_price <= product.base_price * 1.2
              )
              .slice(0, 3);

            for (let j = 0; j < similar.length; j++) {
              allRecommendations.push({
                product_id: product.id,
                recommended_product_id: similar[j].id,
                recommendation_type: 'similar',
                score: 0.8 - (j * 0.1),
                reason: 'Similar category and price range',
                updated_at: now
              });
            }
          }
        }
      }
    }

    // OPTIMIZED: Batch upsert ALL recommendations at once (instead of one at a time)
    if (allRecommendations.length > 0) {
      // Split into chunks of 1000 for large datasets
      const UPSERT_CHUNK_SIZE = 1000;
      for (let i = 0; i < allRecommendations.length; i += UPSERT_CHUNK_SIZE) {
        const chunk = allRecommendations.slice(i, i + UPSERT_CHUNK_SIZE);
        const { error: upsertError } = await supabase
          .from('product_recommendations')
          .upsert(chunk, {
            onConflict: 'product_id,recommended_product_id,recommendation_type'
          });

        if (upsertError) {
          errors.push({
            message: 'Failed to upsert recommendations chunk',
            error: upsertError.message,
            chunkStart: i
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      generated,
      total: products.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error in generate recommendations API:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Helper function to get products also bought (would be implemented as a database function)
// This is a placeholder - the actual logic would be in a Supabase function
