import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET all pricing tiers
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: tiers, error } = await supabase
      .from('pricing_tiers')
      .select('*')
      .order('priority', { ascending: false });

    if (error) {
      console.error('Error fetching pricing tiers:', error);
      return NextResponse.json({ error: 'Failed to fetch tiers' }, { status: 500 });
    }

    return NextResponse.json({ success: true, tiers });

  } catch (error) {
    console.error('Error in pricing tiers API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create new pricing tier
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
    const { name, description, discountPercentage, priority, isActive } = body;

    if (!name || discountPercentage === undefined) {
      return NextResponse.json(
        { error: 'Name and discount percentage are required' },
        { status: 400 }
      );
    }

    const { data: tier, error } = await supabase
      .from('pricing_tiers')
      .insert({
        name,
        description,
        discount_percentage: discountPercentage,
        priority: priority || 0,
        is_active: isActive !== undefined ? isActive : true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating pricing tier:', error);
      return NextResponse.json(
        { error: 'Failed to create tier' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, tier });

  } catch (error) {
    console.error('Error in pricing tiers POST API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH update pricing tier
export async function PATCH(request: NextRequest) {
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
    const { id, name, description, discountPercentage, priority, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'Tier ID is required' }, { status: 400 });
    }

    const updates: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (discountPercentage !== undefined) updates.discount_percentage = discountPercentage;
    if (priority !== undefined) updates.priority = priority;
    if (isActive !== undefined) updates.is_active = isActive;

    const { data: tier, error } = await supabase
      .from('pricing_tiers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating pricing tier:', error);
      return NextResponse.json({ error: 'Failed to update tier' }, { status: 500 });
    }

    return NextResponse.json({ success: true, tier });

  } catch (error) {
    console.error('Error in pricing tiers PATCH API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE pricing tier
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Tier ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('pricing_tiers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting pricing tier:', error);
      return NextResponse.json({ error: 'Failed to delete tier' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in pricing tiers DELETE API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
