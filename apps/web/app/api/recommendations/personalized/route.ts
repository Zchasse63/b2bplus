import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
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
      return NextResponse.json(
        { error: "Failed to fetch recommendations" },
        { status: 500 }
      );
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

      return NextResponse.json({
        recommendations: enrichedRecommendations,
        total: enrichedRecommendations.length,
      });
    }

    return NextResponse.json({ recommendations: [], total: 0 });
  } catch (error: unknown) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

