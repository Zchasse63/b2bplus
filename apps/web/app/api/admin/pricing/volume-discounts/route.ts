import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET volume discounts for a product
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    let query = supabase
      .from('volume_discounts')
      .select(`
        *,
        product:products(id, name, sku)
      `)
      .order('min_quantity', { ascending: true });

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data: discounts, error } = await query;

    if (error) {
      console.error('Error fetching volume discounts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch discounts' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, discounts });

  } catch (error) {
    console.error('Error in volume-discounts GET API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create volume discount
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
    const {
      productId,
      minQuantity,
      maxQuantity,
      discountPercentage,
      discountAmount,
      isActive,
      effectiveFrom,
      effectiveTo
    } = body;

    if (!productId || !minQuantity) {
      return NextResponse.json(
        { error: 'Product ID and minimum quantity are required' },
        { status: 400 }
      );
    }

    if (!discountPercentage && !discountAmount) {
      return NextResponse.json(
        { error: 'Either discount percentage or discount amount is required' },
        { status: 400 }
      );
    }

    if (discountPercentage && discountAmount) {
      return NextResponse.json(
        { error: 'Cannot specify both discount percentage and amount' },
        { status: 400 }
      );
    }

    const { data: discount, error } = await supabase
      .from('volume_discounts')
      .insert({
        product_id: productId,
        min_quantity: minQuantity,
        max_quantity: maxQuantity || null,
        discount_percentage: discountPercentage || null,
        discount_amount: discountAmount || null,
        is_active: isActive !== undefined ? isActive : true,
        effective_from: effectiveFrom || new Date().toISOString().split('T')[0],
        effective_to: effectiveTo || null
      })
      .select(`
        *,
        product:products(id, name, sku)
      `)
      .single();

    if (error) {
      console.error('Error creating volume discount:', error);
      return NextResponse.json(
        { error: 'Failed to create discount' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, discount });

  } catch (error) {
    console.error('Error in volume-discounts POST API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH update volume discount
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
    const {
      id,
      minQuantity,
      maxQuantity,
      discountPercentage,
      discountAmount,
      isActive,
      effectiveFrom,
      effectiveTo
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Discount ID is required' }, { status: 400 });
    }

    const updates: any = { updated_at: new Date().toISOString() };
    if (minQuantity !== undefined) updates.min_quantity = minQuantity;
    if (maxQuantity !== undefined) updates.max_quantity = maxQuantity;
    if (discountPercentage !== undefined) updates.discount_percentage = discountPercentage;
    if (discountAmount !== undefined) updates.discount_amount = discountAmount;
    if (isActive !== undefined) updates.is_active = isActive;
    if (effectiveFrom !== undefined) updates.effective_from = effectiveFrom;
    if (effectiveTo !== undefined) updates.effective_to = effectiveTo;

    const { data: discount, error } = await supabase
      .from('volume_discounts')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        product:products(id, name, sku)
      `)
      .single();

    if (error) {
      console.error('Error updating volume discount:', error);
      return NextResponse.json(
        { error: 'Failed to update discount' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, discount });

  } catch (error) {
    console.error('Error in volume-discounts PATCH API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE volume discount
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
      return NextResponse.json({ error: 'Discount ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('volume_discounts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting volume discount:', error);
      return NextResponse.json(
        { error: 'Failed to delete discount' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in volume-discounts DELETE API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
