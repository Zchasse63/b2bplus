import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logging/logger";
import { checkAdminRole } from "@/lib/middleware/admin";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { handleError, DatabaseError } from "@/lib/middleware/error-handler";

const logger = createLogger('admin-customers-analytics');

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, "admin");
    if (!allowed) return rateLimitResponse!;

    // Check admin authorization
    const { user, error: authError } = await checkAdminRole();
    if (authError) return authError;

    const supabase = await createClient();

    // Fetch all organizations (customers)
    const { data: organizations, error: orgError } = await supabase
      .from("organizations")
      .select("id, name, email");

    if (orgError) {
      logger.error("Error fetching organizations", { error: orgError });
      throw DatabaseError.queryFailed('organizations', 'fetch');
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
  } catch (error) {
    return handleError(error);
  }
}
