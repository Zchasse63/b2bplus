import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logging/logger";
import { rateLimit } from '@/lib/middleware/rate-limit';
import { handleError, AuthError, ForbiddenError, DatabaseError } from '@/lib/middleware/error-handler';

const logger = createLogger('inventory-reorder-alerts');

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'admin');
    if (!allowed) return rateLimitResponse!;

    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new AuthError("Authentication required", "unauthorized");
    }

    // Check admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "super_admin"].includes(profile.role)) {
      throw ForbiddenError.insufficientRole("admin or super_admin");
    }

    // Get all inventory items
    const { data: inventory, error: invError } = await supabase
      .from("inventory")
      .select(
        `
        id,
        product_id,
        location_id,
        quantity_on_hand,
        products (
          id,
          name,
          sku
        ),
        inventory_locations (
          id,
          name
        )
      `
      );

    if (invError) {
      logger.error("Error fetching inventory", { error: invError });
      throw DatabaseError.queryFailed("inventory", "select");
    }

    // Check reorder status for each item
    const reorderAlerts = await Promise.all(
      (inventory || []).map(async (item) => {
        const { data: needsReorder } = await supabase.rpc(
          "check_reorder_needed",
          {
            p_product_id: item.product_id,
            p_location_id: item.location_id,
          }
        );

        if (needsReorder) {
          return {
            product_id: item.product_id,
            product_name: (item.products as any)?.name || "Unknown",
            product_sku: (item.products as any)?.sku || "N/A",
            location_id: item.location_id,
            location_name: (item.inventory_locations as any)?.name || "Unknown",
            current_quantity: item.quantity_on_hand,
            needs_reorder: true,
          };
        }
        return null;
      })
    );

    // Filter out null values (items that don't need reorder)
    const alerts = reorderAlerts.filter((alert) => alert !== null);

    return NextResponse.json({
      alerts,
      total_alerts: alerts.length,
    });
  } catch (error) {
    return handleError(error);
  }
}
