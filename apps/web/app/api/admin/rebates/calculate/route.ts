import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAdminRole } from '@/lib/middleware/admin';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { validateRequestBody } from '@/lib/middleware/validation';
import { RebateCalculateSchema } from '@/lib/validation/schemas';
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
    const validation = await validateRequestBody(request, RebateCalculateSchema);
    if (!validation.valid) return validation.response!;

    const { customerId, periodStart, periodEnd } = validation.data!;
    const rebateType = 'monthly'; // Default rebate type

    const supabase = await createClient();

    // Call the calculate_rebate function
    const { data: rebateAmount, error } = await supabase.rpc('calculate_rebate', {
      p_user_id: customerId,
      p_period_start: periodStart,
      p_period_end: periodEnd,
      p_rebate_type: rebateType,
    });

    if (error) {
      throw DatabaseError.queryFailed('rebates', 'calculate');
    }

    // Get customer profile and buying group details
    const { data: customerProfile } = await supabase
      .from('profiles')
      .select('*, buying_groups(name, monthly_rebate_percentage, annual_rebate_percentage)')
      .eq('id', customerId)
      .single();

    // Get total purchases for the period
    const { data: orders } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('user_id', customerId)
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd)
      .in('status', ['completed', 'shipped', 'delivered']);

    const totalPurchases = orders?.reduce((sum, order) => sum + parseFloat(order.total_amount), 0) || 0;

    const rebatePercentage = rebateType === 'monthly'
      ? customerProfile?.buying_groups?.monthly_rebate_percentage
      : customerProfile?.buying_groups?.annual_rebate_percentage;

    return NextResponse.json({
      rebateAmount: rebateAmount || 0,
      totalPurchases,
      rebatePercentage,
      rebateType,
      periodStart,
      periodEnd,
      user: {
        name: customerProfile?.full_name,
        email: customerProfile?.email,
        buyingGroup: customerProfile?.buying_groups?.name,
      },
    });

  } catch (error) {
    return handleError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const status = searchParams.get('status') || 'all';

    const supabase = await createClient();

    let query = supabase
      .from('rebates')
      .select('*, buying_groups(name), profiles(full_name, email)')
      .order('period_end', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: rebates, error } = await query;

    if (error) {
      throw DatabaseError.queryFailed('rebates', 'fetch');
    }

    return NextResponse.json({ rebates });

  } catch (error) {
    return handleError(error);
  }
}
