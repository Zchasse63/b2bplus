import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

function getRiskLevel(score: number): string {
  if (score >= 0.7) return "High";
  if (score >= 0.4) return "Medium";
  return "Low";
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Get customer's purchase analytics
    const { data: analytics, error: analyticsError } = await supabase
      .from("customer_purchase_analytics")
      .select("product_id, last_purchase_date, purchase_frequency_days")
      .eq("customer_id", params.id);

    if (analyticsError) {
      console.error("Error fetching analytics:", analyticsError);
      return NextResponse.json(
        { error: "Failed to fetch analytics" },
        { status: 500 }
      );
    }

    if (!analytics || analytics.length === 0) {
      return NextResponse.json({ churn_risks: [] });
    }

    // OPTIMIZED: Batch fetch all products in a single query (instead of N queries)
    const productIds = analytics.map(item => item.product_id);
    const { data: products } = await supabase
      .from("products")
      .select("id, name, sku")
      .in("id", productIds);

    // Create a Map for fast product lookup
    const productMap = new Map(
      (products || []).map(p => [p.id, p])
    );

    // Calculate churn risk for each product (RPC calls in parallel)
    const churnRisks = await Promise.all(
      analytics.map(async (item) => {
        const { data: riskScore } = await supabase.rpc("calculate_churn_risk", {
          customer_id_param: params.id,
          product_id_param: item.product_id,
        });

        const product = productMap.get(item.product_id);

        return {
          product_id: item.product_id,
          product_name: product?.name || "Unknown Product",
          product_sku: product?.sku || "N/A",
          risk_score: riskScore || 0,
          risk_level: getRiskLevel(riskScore || 0),
          last_purchase_date: item.last_purchase_date,
          avg_frequency_days: item.purchase_frequency_days,
        };
      })
    );

    // Sort by risk score (highest first)
    churnRisks.sort((a, b) => b.risk_score - a.risk_score);

    return NextResponse.json({ churn_risks: churnRisks });
  } catch (error: unknown) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

