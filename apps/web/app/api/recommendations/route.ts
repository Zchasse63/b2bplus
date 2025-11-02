import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET product recommendations
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const type = searchParams.get('type'); // 'also_bought', 'similar', 'frequently_together'
    const limit = parseInt(searchParams.get('limit') || '5');

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
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
      console.error('Error fetching recommendations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch recommendations' },
        { status: 500 }
      );
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
    console.error('Error in recommendations API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST track recommendation interaction
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { productId, interactionType } = body;

    if (!productId || !interactionType) {
      return NextResponse.json(
        { error: 'Product ID and interaction type are required' },
        { status: 400 }
      );
    }

    // Update customer affinity
    await supabase.rpc('update_customer_affinity', {
      p_customer_id: user.id,
      p_product_id: productId,
      p_interaction_type: interactionType
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error tracking recommendation interaction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
