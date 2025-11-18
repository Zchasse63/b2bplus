import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { validateTransition, getStatusDisplayName } from '@b2b-plus/shared';
import { logger } from '@b2b-plus/shared';
import type { OrderStatus } from '@b2b-plus/shared';

/**
 * PATCH /api/orders/update-status
 * Updates order status with validation and audit trail
 */
export async function POST(request: NextRequest) {
  try {
    const { orderId, newStatus, reason, notes } = await request.json();

    if (!orderId || !newStatus) {
      return NextResponse.json(
        { error: 'Order ID and new status are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch current order
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check permission (owner or admin)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role === 'admin';
    const isOwner = order.created_by === user.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Validate transition
    const validation = validateTransition(
      order.status as OrderStatus,
      newStatus as OrderStatus,
      isAdmin
    );

    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.reason },
        { status: 400 }
      );
    }

    // Check if reason is required
    if (validation.requiresReason && !reason) {
      return NextResponse.json(
        { error: 'Reason is required for this status change' },
        { status: 400 }
      );
    }

    // Update order status
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Failed to update order status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update order status' },
        { status: 500 }
      );
    }

    // Create audit log
    const { error: auditError } = await supabase
      .from('order_status_transitions')
      .insert({
        order_id: orderId,
        from_status: order.status,
        to_status: newStatus,
        changed_by: user.id,
        reason,
        notes,
      });

    if (auditError) {
      console.error('Failed to create audit log:', auditError);
    }

    console.log('[ORDER] Status updated', {
      orderId,
      from: order.status,
      to: newStatus,
      reason,
    });

    return NextResponse.json({
      success: true,
      message: `Order status updated to ${getStatusDisplayName(newStatus as OrderStatus)}`,
      order: {
        id: orderId,
        previousStatus: order.status,
        newStatus,
        updatedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Update order status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
