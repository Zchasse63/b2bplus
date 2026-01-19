import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from '@/lib/middleware/rate-limit';
import { handleError, AuthError, NotFoundError, DatabaseError } from '@/lib/middleware/error-handler';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'authenticated');
    if (!allowed) return rateLimitResponse!;

    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new AuthError("Unauthorized");
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "10");

    // Get user's organization (customer_id)
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile || !profile.organization_id) {
      throw new NotFoundError("User organization", user.id);
    }

    // Call personalized recommendations function
    const { data: recommendations, error } = await supabase.rpc(
      "get_personalized_recommendations",
      {
        p_customer_id: profile.organization_id,
        p_limit: limit,
      }
    );

    if (error) {
      throw DatabaseError.queryFailed("recommendations", "get_personalized_recommendations");
    }

    // Fetch full product details for recommendations
    if (recommendations && recommendations.length > 0) {
      const productIds = recommendations.map((r: any) => r.product_id);
      const { data: products } = await supabase
        .from("products")
        .select("id, name, sku, base_price, image_url, category, description")
        .in("id", productIds);

      // Merge recommendation data with product details
      const enrichedRecommendations = recommendations.map((rec: any) => {
        const product = products?.find((p) => p.id === rec.product_id);
        return {
          ...rec,
          product,
        };
      });

      return NextResponse.json({
        recommendations: enrichedRecommendations,
        total: enrichedRecommendations.length,
      });
    }

    return NextResponse.json({ recommendations: [], total: 0 });
  } catch (error) {
    return handleError(error);
  }
}

