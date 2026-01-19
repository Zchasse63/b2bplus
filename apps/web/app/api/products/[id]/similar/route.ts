import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from '@/lib/middleware/rate-limit';
import { handleError, DatabaseError } from '@/lib/middleware/error-handler';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'authenticated');
    if (!allowed) return rateLimitResponse!;

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
      throw DatabaseError.queryFailed('products', 'get_similar_products');
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
  } catch (error) {
    return handleError(error);
  }
}

