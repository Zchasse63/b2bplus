import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { handleError, AuthError, ForbiddenError, ValidationError, DatabaseError } from '@/lib/middleware/error-handler';

// GET all pricing tiers
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

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      throw ForbiddenError.insufficientRole('admin or super_admin');
    }

    const { data: tiers, error } = await supabase
      .from('pricing_tiers')
      .select('*')
      .order('priority', { ascending: false });

    if (error) {
      throw DatabaseError.queryFailed('pricing_tiers', 'select');
    }

    return NextResponse.json({ success: true, tiers });

  } catch (error) {
    return handleError(error);
  }
}

// POST create new pricing tier
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
    const { name, description, discountPercentage, priority, isActive } = body;

    if (!name || discountPercentage === undefined) {
      throw new ValidationError('Name and discount percentage are required', {
        name: !name ? ['Required'] : [],
        discountPercentage: discountPercentage === undefined ? ['Required'] : [],
      });
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
      throw DatabaseError.queryFailed('pricing_tiers', 'insert');
    }

    return NextResponse.json({ success: true, tier });

  } catch (error) {
    return handleError(error);
  }
}

// PATCH update pricing tier
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
    const { id, name, description, discountPercentage, priority, isActive } = body;

    if (!id) {
      throw new ValidationError('Tier ID is required', { id: ['Required'] });
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
      throw DatabaseError.queryFailed('pricing_tiers', 'update');
    }

    return NextResponse.json({ success: true, tier });

  } catch (error) {
    return handleError(error);
  }
}

// DELETE pricing tier
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
      throw new ValidationError('Tier ID is required', { id: ['Required'] });
    }

    const { error } = await supabase
      .from('pricing_tiers')
      .delete()
      .eq('id', id);

    if (error) {
      throw DatabaseError.queryFailed('pricing_tiers', 'delete');
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    return handleError(error);
  }
}
