import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError, apiUnauthorized, apiValidationError } from '@/lib/api-response';
import { logger } from '@/lib/logger';

// GET product recommendations
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return apiUnauthorized();
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const type = searchParams.get('type'); // 'also_bought', 'similar', 'frequently_together'
    const limit = parseInt(searchParams.get('limit') || '5', 10);

    if (!productId) {
      return apiValidationError('Product ID is required', ['productId is required']);
    }

    // Check if recommendations feature is enabled
    const { data: featureFlag } = await supabase
      .from('feature_flags')
      .select('enabled')
      .eq('feature_name', 'smart_recommendations')
      .single();

    if (!featureFlag?.enabled) {
      return apiSuccess({ recommendations: [] }, 'Feature disabled');
    }

    // Get recommendations from database
    const { data: recommendations, error } = await supabase
      .rpc('get_product_recommendations', {
        p_product_id: productId,
        p_recommendation_type: type,
        p_limit: limit
      });

    if (error) {
      logger.error('Error fetching recommendations', {
        userId: user.id,
        productId,
        type,
        error: error.message,
        stack: error.stack
      });
      return apiError('Failed to fetch recommendations', 500, { productId });
    }

    // Track that user viewed these recommendations
    if (recommendations?.length > 0) {
      for (const rec of recommendations) {
        await supabase
          .from('customer_product_affinities')
          .upsert({
            customer_id: user.id,
            product_id: rec.recommended_product_id,
            view_count: 1,
            last_interaction_at: new Date().toISOString()
          }, {
            onConflict: 'customer_id,product_id'
          });
      }
    }

    return apiSuccess({
      recommendations: recommendations ?? []
    }, 'Recommendations fetched successfully');

  } catch (error) {
    logger.error('Error in recommendations API', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return apiError('Internal server error', 500);
  }
}

// POST track recommendation interaction
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return apiUnauthorized();
    }

    const body = await request.json();
    const { productId, interactionType } = body;

    if (!productId || !interactionType) {
      return apiValidationError(
        'Product ID and interaction type are required',
        ['productId and interactionType are required']
      );
    }

    // Update customer affinity
    const { error } = await supabase.rpc('update_customer_affinity', {
      p_customer_id: user.id,
      p_product_id: productId,
      p_interaction_type: interactionType
    });

    if (error) {
      logger.error('Error updating customer affinity', {
        userId: user.id,
        productId,
        interactionType,
        error: error.message
      });
      return apiError('Failed to track interaction', 500);
    }

    logger.info('Recommendation interaction tracked', {
      userId: user.id,
      productId,
      interactionType
    });

    return apiSuccess({}, 'Interaction tracked successfully');

  } catch (error) {
    logger.error('Error tracking recommendation interaction', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return apiError('Internal server error', 500);
  }
}
