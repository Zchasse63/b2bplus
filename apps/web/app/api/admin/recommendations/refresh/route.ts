import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from '@/lib/middleware/rate-limit';
import { handleError, AuthError, ForbiddenError, DatabaseError } from '@/lib/middleware/error-handler';

export async function POST(request: NextRequest) {
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
      throw new AuthError("Unauthorized");
    }

    // Check admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "super_admin"].includes(profile.role)) {
      throw new ForbiddenError("Admin access required");
    }

    // Call refresh function
    const { error } = await supabase.rpc("refresh_product_recommendations");

    if (error) {
      throw DatabaseError.queryFailed("product_recommendations", "refresh");
    }

    return NextResponse.json({
      success: true,
      message: "Product recommendations refreshed successfully",
    });
  } catch (error) {
    return handleError(error);
  }
}
