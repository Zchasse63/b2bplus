import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// POST assign customer to pricing tier
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { customerId, tierId, effectiveFrom, effectiveTo } = body;

    if (!customerId || !tierId) {
      return NextResponse.json(
        { error: 'Customer ID and Tier ID are required' },
        { status: 400 }
      );
    }

    const { data: assignment, error } = await supabase
      .from('customer_pricing_tiers')
      .insert({
        customer_id: customerId,
        tier_id: tierId,
        effective_from: effectiveFrom || new Date().toISOString().split('T')[0],
        effective_to: effectiveTo || null
      })
      .select(`
        *,
        tier:pricing_tiers(*),
        customer:profiles(id, email, full_name)
      `)
      .single();

    if (error) {
      console.error('Error assigning tier:', error);
      return NextResponse.json(
        { error: 'Failed to assign tier' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, assignment });

  } catch (error) {
    console.error('Error in assign-tier API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET customer tier assignments
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    const { data: assignments, error } = await supabase
      .from('customer_pricing_tiers')
      .select(`
        *,
        tier:pricing_tiers(*)
      `)
      .eq('customer_id', customerId)
      .order('effective_from', { ascending: false });

    if (error) {
      console.error('Error fetching tier assignments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch assignments' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, assignments });

  } catch (error) {
    console.error('Error in assign-tier GET API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE remove tier assignment
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('id');

    if (!assignmentId) {
      return NextResponse.json(
        { error: 'Assignment ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('customer_pricing_tiers')
      .delete()
      .eq('id', assignmentId);

    if (error) {
      console.error('Error deleting tier assignment:', error);
      return NextResponse.json(
        { error: 'Failed to delete assignment' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in assign-tier DELETE API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
