import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { deduplicate } from "@/lib/request-dedup";
import { cache } from "@/lib/cache";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // SECURITY: Require authentication to access product data
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "5");

    const cacheKey = `products:similar:${params.id}:${limit}`;

    const result = await deduplicate(
      cacheKey,
      async () => {
        // Check cache first
        const cached = cache.get(cacheKey);
        if (cached) {
          return cached;
        }

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
          throw new Error("Failed to fetch similar products");
        }

        // Limit results
        const limitedResults = (similarProducts || []).slice(0, limit);

        // Fetch full product details
        if (limitedResults.length > 0) {
          const productIds = limitedResults.map((p: { id?: string; [key: string]: unknown }) => p.similar_product_id);
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

          const responseData = {
            similar_products: enrichedProducts,
            total: enrichedProducts.length,
          };

          // Cache for 15 minutes (900 seconds)
          cache.set(cacheKey, responseData, 900);
          return responseData;
        }

        const emptyResponse = { similar_products: [], total: 0 };
        cache.set(cacheKey, emptyResponse, 300); // Cache empty response for 5 minutes
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

