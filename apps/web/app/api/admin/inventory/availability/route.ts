import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logging/logger";
import { rateLimit } from '@/lib/middleware/rate-limit';
import { handleError, AuthError, ForbiddenError, ValidationError, DatabaseError } from '@/lib/middleware/error-handler';

const logger = createLogger('inventory-availability');

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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get("product_id");
    const locationId = searchParams.get("location_id");

    if (!productId) {
      throw new ValidationError("product_id is required", { product_id: ["Required"] });
    }

    // If location_id is provided, get availability for that location
    if (locationId) {
      const { data, error } = await supabase.rpc("get_product_availability", {
        p_product_id: productId,
        p_location_id: locationId,
      });

      if (error) {
        logger.error("Error fetching product availability", { error, productId, locationId });
        throw DatabaseError.queryFailed("inventory", "get_product_availability");
      }

      return NextResponse.json({ availability: data });
    }

    // Otherwise, get availability across all locations
    const { data: locations, error: locError } = await supabase
      .from("inventory_locations")
      .select("id, name, address");

    if (locError) {
      logger.error("Error fetching locations", { error: locError });
      throw DatabaseError.queryFailed("inventory_locations", "select");
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
  } catch (error) {
    return handleError(error);
  }
}
