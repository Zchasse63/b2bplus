import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAdminRole } from '@/lib/middleware/admin';

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Require admin authentication for rebate calculations
    const { user, error: authError } = await checkAdminRole();
    if (authError) return authError;

    const { userId, periodStart, periodEnd, rebateType } = await request.json();

    if (!userId || !periodStart || !periodEnd || !rebateType) {
      return NextResponse.json(
        { error: 'User ID, period dates, and rebate type are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Call the calculate_rebate function
    const { data: rebateAmount, error } = await supabase.rpc('calculate_rebate', {
      p_user_id: userId,
      p_period_start: periodStart,
      p_period_end: periodEnd,
      p_rebate_type: rebateType,
    });

    if (error) {
      console.error('Error calculating rebate:', error);
      return NextResponse.json(
        { error: 'Failed to calculate rebate' },
        { status: 500 }
      );
    }

    // Get user and buying group details
    const { data: user } = await supabase
      .from('profiles')
      .select('*, buying_groups(name, monthly_rebate_percentage, annual_rebate_percentage)')
      .eq('id', userId)
      .single();

    // Get total purchases for the period
    const { data: orders } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('user_id', userId)
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd)
      .in('status', ['completed', 'shipped', 'delivered']);

    const totalPurchases = orders?.reduce((sum, order) => sum + parseFloat(order.total_amount), 0) || 0;

    const rebatePercentage = rebateType === 'monthly' 
      ? user?.buying_groups?.monthly_rebate_percentage 
      : user?.buying_groups?.annual_rebate_percentage;

    return NextResponse.json({
      rebateAmount: rebateAmount || 0,
      totalPurchases,
      rebatePercentage,
      rebateType,
      periodStart,
      periodEnd,
      user: {
        name: user?.full_name,
        email: user?.email,
        buyingGroup: user?.buying_groups?.name,
      },
    });

  } catch (error) {
    console.error('Error in rebate calculation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Require admin authentication to view all rebates
    const { user, error: authError } = await checkAdminRole();
    if (authError) return authError;

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
      console.error('Error fetching rebates:', error);
      return NextResponse.json(
        { error: 'Failed to fetch rebates' },
        { status: 500 }
      );
    }

    return NextResponse.json({ rebates });

  } catch (error) {
    console.error('Error in rebates fetch:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
