import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAdminRole } from '@/lib/middleware/admin';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { validateRequestBody } from '@/lib/middleware/validation';
import { RebateApproveSchema } from '@/lib/validation/schemas';
import { handleError, DatabaseError } from '@/lib/middleware/error-handler';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'admin');
    if (!allowed) return rateLimitResponse!;

    // Check admin authorization
    const { user, error: authError } = await checkAdminRole();
    if (authError) return authError;

    // Validate request body
    const validation = await validateRequestBody(request, RebateApproveSchema);
    if (!validation.valid) return validation.response!;

    const { rebateId, approved, notes } = validation.data!;
    const action = approved ? 'approve' : 'cancel';

    const supabase = await createClient();

    const updateData: Record<string, unknown> = {
      approved_by: user!.id,
      approved_at: new Date().toISOString(),
    };

    if (action === 'approve') {
      updateData.status = 'approved';
    } else if (action === 'cancel') {
      updateData.status = 'cancelled';
    }

    if (notes) {
      updateData.notes = notes;
    }

    const { data: rebate, error } = await supabase
      .from('rebates')
      .update(updateData)
      .eq('id', rebateId)
      .select()
      .single();

    if (error) {
      throw DatabaseError.queryFailed('rebates', 'update');
    }

    return NextResponse.json({
      success: true,
      rebate,
      message: `Rebate ${action}d successfully`,
    });

  } catch (error) {
    return handleError(error);
  }
}
