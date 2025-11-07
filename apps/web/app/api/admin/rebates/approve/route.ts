import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAdminRole } from '@/lib/middleware/admin';

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Require admin authentication for rebate approval/payment
    const { user, error: authError } = await checkAdminRole();
    if (authError) return authError;

    const { rebateId, action, paymentMethod, paymentReference, notes } = await request.json();

    if (!rebateId || !action) {
      return NextResponse.json(
        { error: 'Rebate ID and action are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const updateData: any = {
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    };

    if (action === 'approve') {
      updateData.status = 'approved';
    } else if (action === 'pay') {
      updateData.status = 'paid';
      updateData.paid_at = new Date().toISOString();
      if (paymentMethod) updateData.payment_method = paymentMethod;
      if (paymentReference) updateData.payment_reference = paymentReference;
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
      console.error('Error updating rebate:', error);
      return NextResponse.json(
        { error: 'Failed to update rebate' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      rebate,
      message: `Rebate ${action}d successfully`,
    });

  } catch (error) {
    console.error('Error in rebate approval:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
