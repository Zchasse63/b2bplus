import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkAdminRole } from '@/lib/middleware/admin';

export async function GET(request: NextRequest) {
  try {
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
      console.error("Error fetching feature flags:", error);
      return NextResponse.json(
        { error: "Failed to fetch feature flags" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      features: features || [],
      is_super_admin: user!.role === "super_admin",
    });
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Check super admin authorization (only super admins can toggle features)
    const { user, error: authError } = await checkAdminRole(true);
    if (authError) return authError;

    const supabase = await createClient();

    // Get request body
    const body = await request.json();
    const { feature_name, enabled } = body;

    if (!feature_name || typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "feature_name and enabled are required" },
        { status: 400 }
      );
    }

    // Update feature flag
    const { error } = await supabase
      .from("feature_flags")
      .update({ enabled })
      .eq("name", feature_name);

    if (error) {
      console.error("Error updating feature flag:", error);
      return NextResponse.json(
        { error: "Failed to update feature flag" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Feature ${feature_name} ${enabled ? "enabled" : "disabled"}`,
    });
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

