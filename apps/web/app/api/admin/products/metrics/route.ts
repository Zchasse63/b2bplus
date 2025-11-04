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

    // Check admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "super_admin"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get("product_id");

    // If product_id is provided, get metrics for that product
    if (productId) {
      const { data, error } = await supabase.rpc("get_product_metrics", {
        product_id_param: productId,
      });

      if (error) {
        console.error("Error fetching product metrics:", error);
        return NextResponse.json(
          { error: "Failed to fetch metrics" },
          { status: 500 }
        );
      }

      return NextResponse.json({ metrics: data });
    }

    // Otherwise, get metrics for all products
    const { data: products, error: prodError } = await supabase
      .from("products")
      .select("id, name, sku");

    if (prodError) {
      console.error("Error fetching products:", prodError);
      return NextResponse.json(
        { error: "Failed to fetch products" },
        { status: 500 }
      );
    }

    // Get metrics for each product in parallel
    const metricsData = await Promise.all(
      (products || []).map(async (product) => {
        const { data: metrics } = await supabase.rpc("get_product_metrics", {
          product_id_param: product.id,
        });

        // metrics is returned as an array with one row
        const metricRow = Array.isArray(metrics) ? metrics[0] : metrics;

        return {
          product_id: product.id,
          product_name: product.name,
          product_sku: product.sku,
          total_orders: metricRow?.total_orders || 0,
          total_quantity: metricRow?.total_quantity || 0,
          total_revenue: metricRow?.total_revenue || 0,
          avg_order_quantity: metricRow?.avg_order_quantity || 0,
          last_ordered_at: metricRow?.last_ordered_at || null,
        };
      })
    );

    // Sort by total revenue (highest first)
    metricsData.sort((a, b) => b.total_revenue - a.total_revenue);

    // Calculate aggregate stats
    const stats = {
      total_products: metricsData.length,
      total_revenue: metricsData.reduce((sum, m) => sum + m.total_revenue, 0),
      avg_revenue_per_product:
        metricsData.length > 0
          ? metricsData.reduce((sum, m) => sum + m.total_revenue, 0) /
            metricsData.length
          : 0,
      products_with_sales: metricsData.filter((m) => m.total_orders > 0)
        .length,
    };

    return NextResponse.json({
      metrics: metricsData,
      stats,
    });
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

