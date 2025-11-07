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

    // Fetch all organizations (customers)
    const { data: organizations, error: orgError } = await supabase
      .from("organizations")
      .select("id, name, email");

    if (orgError) {
      console.error("Error fetching organizations:", orgError);
      return NextResponse.json(
        { error: "Failed to fetch customers" },
        { status: 500 }
      );
    }

    // Fetch LTV for each customer in parallel
    const customersWithLTV = await Promise.all(
      (organizations || []).map(async (org) => {
        const { data: ltv } = await supabase.rpc("get_customer_ltv", {
          customer_id_param: org.id,
        });

        const { data: orders } = await supabase
          .from("orders")
          .select("total_amount")
          .eq("customer_id", org.id)
          .neq("status", "cancelled");

        const total_orders = orders?.length || 0;
        const avg_order_value =
          total_orders > 0 ? (ltv || 0) / total_orders : 0;

        return {
          id: org.id,
          name: org.name,
          email: org.email,
          ltv: ltv || 0,
          total_orders,
          avg_order_value,
        };
      })
    );

    // Calculate stats
    const stats = {
      total_customers: customersWithLTV.length,
      avg_ltv:
        customersWithLTV.length > 0
          ? customersWithLTV.reduce((sum, c) => sum + c.ltv, 0) /
            customersWithLTV.length
          : 0,
      total_revenue: customersWithLTV.reduce((sum, c) => sum + c.ltv, 0),
    };

    return NextResponse.json({
      customers: customersWithLTV.sort((a, b) => b.ltv - a.ltv),
      stats,
    });
  } catch (error: unknown) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

