/**
 * Order Auto-Approval API Route
 * 
 * Evaluate and process order auto-approval based on configurable rules
 * and AI risk assessment.
 * 
 * Phase 5: Operational AI - Week 21
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAdminRole } from '@/lib/auth-helpers';
import { evaluateOrderForAutoApproval, processOrderAutoApproval } from '@/lib/ai/order-auto-approval';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/admin/orders/auto-approve
 * 
 * Evaluate an order for auto-approval
 * 
 * Request body:
 * {
 *   order_id: string,
 *   process?: boolean // If true, create approval record and update order
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   evaluation: {
 *     eligible: boolean,
 *     matched_rule: object | null,
 *     risk_assessment: object,
 *     reasons: string[],
 *     recommendation: string
 *   },
 *   approval?: {
 *     approval_id: string,
 *     auto_approved: boolean,
 *     message: string
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authorization
    const authCheck = await checkAdminRole();
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: authCheck.message },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { order_id, process = false } = body;

    if (!order_id) {
      return NextResponse.json(
        { error: 'order_id is required' },
        { status: 400 }
      );
    }

    // Evaluate order for auto-approval
    const evaluation = await evaluateOrderForAutoApproval(order_id);

    // If process=true, create approval record and update order
    if (process) {
      const approval = await processOrderAutoApproval(order_id, authCheck.userId);

      return NextResponse.json({
        success: true,
        evaluation,
        approval,
      });
    }

    // Otherwise, just return evaluation
    return NextResponse.json({
      success: true,
      evaluation,
    });

  } catch (error: any) {
    console.error('Auto-approval error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/orders/auto-approve
 * 
 * Get auto-approval statistics and pending approvals
 * 
 * Query parameters:
 * - from_date: Start date for statistics (YYYY-MM-DD)
 * - to_date: End date for statistics (YYYY-MM-DD)
 * 
 * Response:
 * {
 *   success: true,
 *   statistics: {
 *     total_orders: number,
 *     auto_approved: number,
 *     manually_approved: number,
 *     rejected: number,
 *     pending: number,
 *     auto_approval_rate: number,
 *     avg_approval_time_hours: number
 *   },
 *   pending_approvals: Array<{
 *     id: string,
 *     order_id: string,
 *     total_amount: number,
 *     customer_email: string,
 *     risk_score: number,
 *     created_at: string
 *   }>
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const authCheck = await checkAdminRole();
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: authCheck.message },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const fromDate = searchParams.get('from_date') || 
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const toDate = searchParams.get('to_date') || new Date().toISOString();

    // Get approval statistics
    const { data: stats, error: statsError } = await supabase
      .rpc('get_approval_statistics', {
        p_from_date: fromDate,
        p_to_date: toDate,
      })
      .single();

    if (statsError) {
      console.error('Statistics error:', statsError);
    }

    // Get pending approvals
    const { data: pendingApprovals, error: pendingError } = await supabase
      .from('order_approvals')
      .select(`
        id,
        order_id,
        risk_score,
        requires_manual_review,
        manual_review_reason,
        created_at,
        orders (
          total_amount,
          customers (
            email
          )
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50);

    if (pendingError) {
      console.error('Pending approvals error:', pendingError);
    }

    // Format pending approvals
    const formattedPending = pendingApprovals?.map((approval: any) => ({
      id: approval.id,
      order_id: approval.order_id,
      total_amount: approval.orders?.total_amount || 0,
      customer_email: approval.orders?.customers?.email || 'Unknown',
      risk_score: approval.risk_score,
      requires_manual_review: approval.requires_manual_review,
      manual_review_reason: approval.manual_review_reason,
      created_at: approval.created_at,
    })) || [];

    return NextResponse.json({
      success: true,
      statistics: stats || {
        total_orders: 0,
        auto_approved: 0,
        manually_approved: 0,
        rejected: 0,
        pending: 0,
        auto_approval_rate: 0,
        avg_approval_time_hours: 0,
      },
      pending_approvals: formattedPending,
    });

  } catch (error: any) {
    console.error('Statistics fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/orders/auto-approve
 * 
 * Manually approve or reject an order
 * 
 * Request body:
 * {
 *   approval_id: string,
 *   action: 'approve' | 'reject',
 *   notes?: string
 * }
 */
export async function PATCH(request: NextRequest) {
  try {
    const authCheck = await checkAdminRole();
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: authCheck.message },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    const body = await request.json();
    const { approval_id, action, notes } = body;

    if (!approval_id || !action) {
      return NextResponse.json(
        { error: 'approval_id and action are required' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Get approval record
    const { data: approval, error: fetchError } = await supabase
      .from('order_approvals')
      .select('*, orders(id)')
      .eq('id', approval_id)
      .single();

    if (fetchError || !approval) {
      return NextResponse.json(
        { error: 'Approval not found' },
        { status: 404 }
      );
    }

    // Update approval record
    const updateData: any = {
      status: action === 'approve' ? 'approved' : 'rejected',
      updated_at: new Date().toISOString(),
    };

    if (action === 'approve') {
      updateData.approved_by = authCheck.userId;
      updateData.approved_at = new Date().toISOString();
    } else {
      updateData.rejected_by = authCheck.userId;
      updateData.rejected_at = new Date().toISOString();
      updateData.rejection_reason = notes || 'Manually rejected';
    }

    const { error: updateError } = await supabase
      .from('order_approvals')
      .update(updateData)
      .eq('id', approval_id);

    if (updateError) {
      throw new Error(`Failed to update approval: ${updateError.message}`);
    }

    // Update order status
    const { error: orderError } = await supabase
      .from('orders')
      .update({ status: action === 'approve' ? 'approved' : 'rejected' })
      .eq('id', approval.order_id);

    if (orderError) {
      console.error('Failed to update order status:', orderError);
    }

    // Log admin activity
    await supabase.rpc('log_admin_activity', {
      p_action: action === 'approve' ? 'approve_order' : 'reject_order',
      p_entity_type: 'order',
      p_entity_id: approval.order_id,
      p_details: {
        approval_id,
        notes,
        manual_action: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Order ${action}d successfully`,
      approval_id,
      order_id: approval.order_id,
    });

  } catch (error: any) {
    console.error('Manual approval error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

