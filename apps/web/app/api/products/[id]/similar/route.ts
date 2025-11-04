import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "5");

    // Call similarity function
    const { data: similarProducts, error } = await supabase.rpc(
      "get_similar_products",
      {
        product_id_param: params.id,
        limit_param: limit,
      }
    );

    if (error) {
      console.error("Error fetching similar products:", error);
      return NextResponse.json(
        { error: "Failed to fetch similar products" },
        { status: 500 }
      );
    }

    // Limit results
    const limitedResults = (similarProducts || []).slice(0, limit);

    // Fetch full product details
    if (limitedResults.length > 0) {
      const productIds = limitedResults.map((p: any) => p.similar_product_id);
      const { data: products } = await supabase
        .from("products")
        .select("id, name, sku, base_price, image_url, category, description")
        .in("id", productIds);

      // Merge similarity data with product details
      const enrichedProducts = limitedResults.map((sim: any) => {
        const product = products?.find((p) => p.id === sim.similar_product_id);
        return {
          ...product,
          similarity_score: sim.similarity_score,
        };
      });

      return NextResponse.json({
        similar_products: enrichedProducts,
        total: enrichedProducts.length,
      });
    }

    return NextResponse.json({ similar_products: [], total: 0 });
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

