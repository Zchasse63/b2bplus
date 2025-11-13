/**
 * Phase 2: AI Backend Logic - Pricing Recommendations API
 * 
 * POST /api/admin/pricing/recommendations
 * Generate AI-powered pricing recommendations for products
 * 
 * GET /api/admin/pricing/recommendations
 * Retrieve existing pricing recommendations
 * 
 * PATCH /api/admin/pricing/recommendations
 * Update recommendation status (approve/reject/implement)
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { validateAdminAIRequest } from '@/lib/middleware/ai-security';
import {
  generateBulkPricingRecommendations,
  savePricingRecommendation,
} from '@/lib/ai/pricing-analysis';
import { logAIUsage } from '@/lib/ai/usage-tracking';

interface GenerateRecommendationsRequest {
  productIds?: string[]; // If not provided, analyze all products
  minSales?: number; // Minimum sales to consider
  maxRecommendations?: number; // Limit number of recommendations
}

interface UpdateRecommendationRequest {
  recommendationId: string;
  status: 'approved' | 'rejected' | 'implemented';
  reviewNotes?: string;
}

/**
 * POST /api/admin/pricing/recommendations
 * Generate pricing recommendations
 */
export async function POST(request: NextRequest) {
  try {
    // Validate admin request
    const validation = await validateAdminAIRequest(request);
    if (!validation.authorized) {
      return NextResponse.json(
        { error: validation.error },
        { status: 403 }
      );
    }

    const supabase = await createClient();
    const body: GenerateRecommendationsRequest = await request.json();
    const {
      productIds,
      minSales = 10,
      maxRecommendations = 50,
    } = body;

    let targetProductIds: string[] = [];

    if (productIds && productIds.length > 0) {
      targetProductIds = productIds;
    } else {
      // Get all active products
      const { data: products, error } = await supabase
        .from('products')
        .select('id')
        .eq('status', 'active')
        .limit(maxRecommendations);

      if (error || !products) {
        return NextResponse.json(
          { error: 'Failed to fetch products' },
          { status: 500 }
        );
      }

      targetProductIds = products.map(p => p.id);
    }

    // Generate recommendations
    const recommendations = await generateBulkPricingRecommendations(
      targetProductIds,
      minSales
    );

    // Save recommendations to database
    const savedIds: string[] = [];
    for (const recommendation of recommendations) {
      try {
        const id = await savePricingRecommendation(recommendation);
        savedIds.push(id);
      } catch (error) {
        console.error('Failed to save recommendation:', error);
      }
    }

    // Log AI usage
    await logAIUsage({
      userId: validation.userId!,
      organizationId: '',
      endpoint: '/api/admin/pricing/recommendations',
      operationType: 'pricing-recommendations',
      tokensUsed: recommendations.length * 500,
      success: true,
    });

    return NextResponse.json({
      success: true,
      totalRecommendations: recommendations.length,
      savedRecommendations: savedIds.length,
      recommendations: recommendations.slice(0, 20), // Return top 20
    });

  } catch (error) {
    console.error('Generate pricing recommendations error:', error);
    return NextResponse.json(
      { error: 'Failed to generate pricing recommendations' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/pricing/recommendations
 * Get pricing recommendations
 */
export async function GET(request: NextRequest) {
  try {
    // Validate admin request
    const validation = await validateAdminAIRequest(request);
    if (!validation.authorized) {
      return NextResponse.json(
        { error: validation.error },
        { status: 403 }
      );
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get recommendations
    const { data: recommendations, error } = await supabase
      .from('pricing_recommendations')
      .select(`
        *,
        products(id, name, sku, category, image_url)
      `)
      .eq('status', status)
      .order('confidence_score', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      recommendations: recommendations || [],
    });

  } catch (error) {
    console.error('Get pricing recommendations error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing recommendations' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/pricing/recommendations
 * Update recommendation status
 */
export async function PATCH(request: NextRequest) {
  try {
    // Validate admin request
    const validation = await validateAdminAIRequest(request);
    if (!validation.authorized) {
      return NextResponse.json(
        { error: validation.error },
        { status: 403 }
      );
    }

    const supabase = await createClient();
    const body: UpdateRecommendationRequest = await request.json();
    const { recommendationId, status, reviewNotes } = body;

    if (!recommendationId || !status) {
      return NextResponse.json(
        { error: 'Recommendation ID and status are required' },
        { status: 400 }
      );
    }

    // Get the recommendation
    const { data: recommendation, error: fetchError } = await supabase
      .from('pricing_recommendations')
      .select('*, products(id, name, price)')
      .eq('id', recommendationId)
      .single();

    if (fetchError || !recommendation) {
      return NextResponse.json(
        { error: 'Recommendation not found' },
        { status: 404 }
      );
    }

    // Update recommendation status
    const updateData: any = {
      status,
      reviewed_by: validation.userId,
      reviewed_at: new Date().toISOString(),
    };

    // If implementing, update the product price
    if (status === 'implemented') {
      updateData.implemented_at = new Date().toISOString();

      // Update product price
      const { error: priceUpdateError } = await supabase
        .from('products')
        .update({ price: recommendation.recommended_price })
        .eq('id', recommendation.product_id);

      if (priceUpdateError) {
        return NextResponse.json(
          { error: 'Failed to update product price' },
          { status: 500 }
        );
      }
    }

    const { error: updateError } = await supabase
      .from('pricing_recommendations')
      .update(updateData)
      .eq('id', recommendationId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: `Recommendation ${status}`,
      priceUpdated: status === 'implemented',
    });

  } catch (error) {
    console.error('Update pricing recommendation error:', error);
    return NextResponse.json(
      { error: 'Failed to update pricing recommendation' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/pricing/recommendations?id=xxx
 * Delete a pricing recommendation
 */
export async function DELETE(request: NextRequest) {
  try {
    // Validate admin request
    const validation = await validateAdminAIRequest(request);
    if (!validation.authorized) {
      return NextResponse.json(
        { error: validation.error },
        { status: 403 }
      );
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const recommendationId = searchParams.get('id');

    if (!recommendationId) {
      return NextResponse.json(
        { error: 'Recommendation ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('pricing_recommendations')
      .delete()
      .eq('id', recommendationId);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Recommendation deleted',
    });

  } catch (error) {
    console.error('Delete pricing recommendation error:', error);
    return NextResponse.json(
      { error: 'Failed to delete pricing recommendation' },
      { status: 500 }
    );
  }
}

