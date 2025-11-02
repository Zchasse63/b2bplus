import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { rebateId, action, paymentMethod, paymentReference, notes } = await request.json();

    if (!rebateId || !action) {
      return NextResponse.json(
        { error: 'Rebate ID and action are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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
