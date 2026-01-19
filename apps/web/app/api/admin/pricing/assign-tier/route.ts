import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { handleError, AuthError, ForbiddenError, ValidationError, DatabaseError } from '@/lib/middleware/error-handler';

// POST assign customer to pricing tier
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
    const { customerId, tierId, effectiveFrom, effectiveTo } = body;

    if (!customerId || !tierId) {
      throw new ValidationError('Customer ID and Tier ID are required', {
        customerId: !customerId ? ['Required'] : [],
        tierId: !tierId ? ['Required'] : [],
      });
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
      throw DatabaseError.queryFailed('customer_pricing_tiers', 'insert');
    }

    return NextResponse.json({ success: true, assignment });

  } catch (error) {
    return handleError(error);
  }
}

// GET customer tier assignments
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
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      throw new ValidationError('Customer ID is required', { customerId: ['Required'] });
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
      throw DatabaseError.queryFailed('customer_pricing_tiers', 'select');
    }

    return NextResponse.json({ success: true, assignments });

  } catch (error) {
    return handleError(error);
  }
}

// DELETE remove tier assignment
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
    const assignmentId = searchParams.get('id');

    if (!assignmentId) {
      throw new ValidationError('Assignment ID is required', { id: ['Required'] });
    }

    const { error } = await supabase
      .from('customer_pricing_tiers')
      .delete()
      .eq('id', assignmentId);

    if (error) {
      throw DatabaseError.queryFailed('customer_pricing_tiers', 'delete');
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    return handleError(error);
  }
}
