import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkAdminRole } from '@/lib/middleware/admin';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { handleError, ValidationError, DatabaseError } from '@/lib/middleware/error-handler';

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'admin');
    if (!allowed) return rateLimitResponse!;

    // Check admin authorization
    const { user, error: authError } = await checkAdminRole();
    if (authError) return authError;

    const supabase = await createClient();

    // Get all feature flags
    const { data: features, error } = await supabase
      .from("feature_flags")
      .select("*")
      .order("name");

    if (error) {
      throw DatabaseError.queryFailed('feature_flags', 'fetch');
    }

    return NextResponse.json({
      features: features || [],
      is_super_admin: user!.role === "super_admin",
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'sensitive');
    if (!allowed) return rateLimitResponse!;

    // Check super admin authorization (only super admins can toggle features)
    const { user, error: authError } = await checkAdminRole(true);
    if (authError) return authError;

    const supabase = await createClient();

    // Get request body
    const body = await request.json();
    const { feature_name, enabled } = body;

    if (!feature_name || typeof enabled !== "boolean") {
      throw new ValidationError('feature_name and enabled are required', {
        feature_name: !feature_name ? ['feature_name is required'] : [],
        enabled: typeof enabled !== 'boolean' ? ['enabled must be a boolean'] : [],
      });
    }

    // Update feature flag
    const { error } = await supabase
      .from("feature_flags")
      .update({ enabled })
      .eq("name", feature_name);

    if (error) {
      throw DatabaseError.queryFailed('feature_flags', 'update');
    }

    return NextResponse.json({
      success: true,
      message: `Feature ${feature_name} ${enabled ? "enabled" : "disabled"}`,
    });
  } catch (error) {
    return handleError(error);
  }
}
