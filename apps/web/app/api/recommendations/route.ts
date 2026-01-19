import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { handleError, AuthError, ValidationError, DatabaseError } from '@/lib/middleware/error-handler';

// GET product recommendations
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
    const type = searchParams.get('type'); // 'also_bought', 'similar', 'frequently_together'
    const limit = parseInt(searchParams.get('limit') || '5');

    if (!productId) {
      throw new ValidationError('Product ID is required');
    }

    // Check if recommendations feature is enabled
    const { data: featureFlag } = await supabase
      .from('feature_flags')
      .select('enabled')
      .eq('feature_name', 'smart_recommendations')
      .single();

    if (!featureFlag?.enabled) {
      return NextResponse.json({
        success: true,
        recommendations: []
      });
    }

    // Get recommendations from database
    const { data: recommendations, error } = await supabase
      .rpc('get_product_recommendations', {
        p_product_id: productId,
        p_recommendation_type: type,
        p_limit: limit
      });

    if (error) {
      throw DatabaseError.queryFailed('product_recommendations', 'get_product_recommendations');
    }

    // Track that user viewed these recommendations
    if (recommendations && recommendations.length > 0) {
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

    return NextResponse.json({
      success: true,
      recommendations: recommendations || []
    });

  } catch (error) {
    return handleError(error);
  }
}

// POST track recommendation interaction
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'authenticated');
    if (!allowed) return rateLimitResponse!;

    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new AuthError('Unauthorized');
    }

    const body = await request.json();
    const { productId, interactionType } = body;

    if (!productId || !interactionType) {
      throw new ValidationError('Product ID and interaction type are required');
    }

    // Update customer affinity
    await supabase.rpc('update_customer_affinity', {
      p_customer_id: user.id,
      p_product_id: productId,
      p_interaction_type: interactionType
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    return handleError(error);
  }
}
