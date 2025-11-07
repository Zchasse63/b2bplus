import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { deduplicate } from "@/lib/request-dedup";
import { cache } from "@/lib/cache";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      return NextResponse.json(
        { error: "User organization not found" },
        { status: 404 }
      );
    }

    // Use cache key based on organization and limit
    const cacheKey = `recommendations:personalized:${profile.organization_id}:${limit}`;

    // Deduplicate and cache the recommendation fetching
    const result = await deduplicate(
      cacheKey,
      async () => {
        // Check cache first
        const cached = cache.get(cacheKey);
        if (cached) {
          return cached;
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
          console.error("Error fetching personalized recommendations:", error);
          throw new Error("Failed to fetch recommendations");
        }

        // Fetch full product details for recommendations
        if (recommendations && recommendations.length > 0) {
          const productIds = recommendations.map((r: { product_id: string; [key: string]: unknown }) => r.product_id);
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

          const responseData = {
            recommendations: enrichedRecommendations,
            total: enrichedRecommendations.length,
          };

          // Cache for 5 minutes (300 seconds)
          cache.set(cacheKey, responseData, 300);
          return responseData;
        }

        const emptyResponse = { recommendations: [], total: 0 };
        cache.set(cacheKey, emptyResponse, 60); // Cache empty response for 1 minute
        return emptyResponse;
      }
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

