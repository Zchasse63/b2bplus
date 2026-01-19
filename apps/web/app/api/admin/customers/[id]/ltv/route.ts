import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkAdminRole } from "@/lib/middleware/admin";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { handleError, DatabaseError } from "@/lib/middleware/error-handler";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, "admin");
    if (!allowed) return rateLimitResponse!;

    // Check admin authorization
    const { user, error: authError } = await checkAdminRole();
    if (authError) return authError;

    const supabase = await createClient();

    // Call database function to get customer LTV
    const { data, error } = await supabase.rpc("get_customer_ltv", {
      customer_id_param: params.id,
    });

    if (error) {
      throw DatabaseError.queryFailed('customer_ltv', 'fetch');
    }

    return NextResponse.json({ ltv: data });
  } catch (error) {
    return handleError(error);
  }
}
