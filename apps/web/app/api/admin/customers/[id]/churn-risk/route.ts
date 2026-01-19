import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { handleError, AuthError, ForbiddenError, DatabaseError } from "@/lib/middleware/error-handler";

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
      throw new AuthError('Authentication required', 'unauthorized');
    }

    // Check admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "super_admin"].includes(profile.role)) {
      throw ForbiddenError.insufficientRole('admin');
    }

    // Apply rate limiting for admin AI operations
    const { allowed, response: rateLimitResponse } = await rateLimit(request, "admin");
    if (!allowed) {
      return rateLimitResponse!;
    }

    // Get customer's purchase analytics
    const { data: analytics, error: analyticsError } = await supabase
      .from("customer_purchase_analytics")
      .select("product_id, last_purchase_date, purchase_frequency_days")
      .eq("customer_id", params.id);

    if (analyticsError) {
      throw DatabaseError.queryFailed('customer_purchase_analytics', 'fetch');
    }

    if (!analytics || analytics.length === 0) {
      return NextResponse.json({ churn_risks: [] });
    }

    // Calculate churn risk for each product
    const churnRisks = await Promise.all(
      analytics.map(async (item) => {
        const { data: riskScore } = await supabase.rpc("calculate_churn_risk", {
          customer_id_param: params.id,
          product_id_param: item.product_id,
        });

        // Get product details
        const { data: product } = await supabase
          .from("products")
          .select("name, sku")
          .eq("id", item.product_id)
          .single();

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
  } catch (error) {
    return handleError(error);
  }
}
