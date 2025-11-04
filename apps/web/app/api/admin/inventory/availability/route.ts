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
    const locationId = searchParams.get("location_id");

    if (!productId) {
      return NextResponse.json(
        { error: "product_id is required" },
        { status: 400 }
      );
    }

    // If location_id is provided, get availability for that location
    if (locationId) {
      const { data, error } = await supabase.rpc("get_product_availability", {
        p_product_id: productId,
        p_location_id: locationId,
      });

      if (error) {
        console.error("Error fetching product availability:", error);
        return NextResponse.json(
          { error: "Failed to fetch availability" },
          { status: 500 }
        );
      }

      return NextResponse.json({ availability: data });
    }

    // Otherwise, get availability across all locations
    const { data: locations, error: locError } = await supabase
      .from("inventory_locations")
      .select("id, name, address");

    if (locError) {
      console.error("Error fetching locations:", locError);
      return NextResponse.json(
        { error: "Failed to fetch locations" },
        { status: 500 }
      );
    }

    // Get availability for each location
    const availabilityByLocation = await Promise.all(
      (locations || []).map(async (location) => {
        const { data: qty } = await supabase.rpc("get_product_availability", {
          p_product_id: productId,
          p_location_id: location.id,
        });

        return {
          location_id: location.id,
          location_name: location.name,
          location_address: location.address,
          quantity: qty || 0,
        };
      })
    );

    return NextResponse.json({ availability: availabilityByLocation });
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

