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
      console.error("Error fetching inventory:", invError);
      return NextResponse.json(
        { error: "Failed to fetch inventory" },
        { status: 500 }
      );
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
  } catch (error: unknown) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

