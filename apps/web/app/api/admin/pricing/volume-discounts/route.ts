import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { handleError, AuthError, ForbiddenError, ValidationError, DatabaseError } from '@/lib/middleware/error-handler';

// GET volume discounts for a product
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'admin');
    if (!allowed) return rateLimitResponse!;

    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new AuthError('Authentication required', 'unauthorized');
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
      throw DatabaseError.queryFailed('volume_discounts', 'select');
    }

    return NextResponse.json({ success: true, discounts });

  } catch (error) {
    return handleError(error);
  }
}

// POST create volume discount
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'admin');
    if (!allowed) return rateLimitResponse!;

    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new AuthError('Authentication required', 'unauthorized');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      throw ForbiddenError.insufficientRole('admin or super_admin');
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
      throw new ValidationError('Product ID and minimum quantity are required', {
        productId: !productId ? ['Required'] : [],
        minQuantity: !minQuantity ? ['Required'] : [],
      });
    }

    if (!discountPercentage && !discountAmount) {
      throw new ValidationError('Either discount percentage or discount amount is required', {
        discountPercentage: ['Required if discountAmount not provided'],
        discountAmount: ['Required if discountPercentage not provided'],
      });
    }

    if (discountPercentage && discountAmount) {
      throw new ValidationError('Cannot specify both discount percentage and amount', {
        discountPercentage: ['Cannot be combined with discountAmount'],
        discountAmount: ['Cannot be combined with discountPercentage'],
      });
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
      throw DatabaseError.queryFailed('volume_discounts', 'insert');
    }

    return NextResponse.json({ success: true, discount });

  } catch (error) {
    return handleError(error);
  }
}

// PATCH update volume discount
export async function PATCH(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'admin');
    if (!allowed) return rateLimitResponse!;

    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new AuthError('Authentication required', 'unauthorized');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      throw ForbiddenError.insufficientRole('admin or super_admin');
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
      throw new ValidationError('Discount ID is required', { id: ['Required'] });
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
      throw DatabaseError.queryFailed('volume_discounts', 'update');
    }

    return NextResponse.json({ success: true, discount });

  } catch (error) {
    return handleError(error);
  }
}

// DELETE volume discount
export async function DELETE(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'admin');
    if (!allowed) return rateLimitResponse!;

    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new AuthError('Authentication required', 'unauthorized');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      throw ForbiddenError.insufficientRole('admin or super_admin');
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      throw new ValidationError('Discount ID is required', { id: ['Required'] });
    }

    const { error } = await supabase
      .from('volume_discounts')
      .delete()
      .eq('id', id);

    if (error) {
      throw DatabaseError.queryFailed('volume_discounts', 'delete');
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    return handleError(error);
  }
}
