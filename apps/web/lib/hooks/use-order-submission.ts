/**
 * Order Submission Hook
 * 
 * Handles order submission with automatic approval evaluation.
 * Triggers auto-approval workflow after order creation.
 * 
 * Phase 5: Operational AI - Week 21
 */

'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OrderItem {
  product_id: string;
  quantity: number;
  unit_price: number;
}

interface OrderSubmissionData {
  customer_id: string;
  shipping_method: string;
  payment_method: string;
  items: OrderItem[];
  notes?: string;
}

interface OrderSubmissionResult {
  success: boolean;
  order_id?: string;
  approval_id?: string;
  auto_approved?: boolean;
  message: string;
  error?: string;
}

export function useOrderSubmission() {
  const [submitting, setSubmitting] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  /**
   * Submit an order and trigger auto-approval evaluation
   */
  async function submitOrder(
    orderData: OrderSubmissionData
  ): Promise<OrderSubmissionResult> {
    setSubmitting(true);

    try {
      // Calculate total amount
      const totalAmount = orderData.items.reduce(
        (sum, item) => sum + item.quantity * item.unit_price,
        0
      );

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: orderData.customer_id,
          total_amount: totalAmount,
          shipping_method: orderData.shipping_method,
          payment_method: orderData.payment_method,
          status: 'pending_approval',
          notes: orderData.notes,
        })
        .select()
        .single();

      if (orderError || !order) {
        throw new Error(orderError?.message || 'Failed to create order');
      }

      // Create order items
      const orderItems = orderData.items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        // Rollback order creation
        await supabase.from('orders').delete().eq('id', order.id);
        throw new Error(`Failed to create order items: ${itemsError.message}`);
      }

      // Trigger auto-approval evaluation
      setEvaluating(true);
      const approvalResult = await triggerAutoApproval(order.id);
      setEvaluating(false);

      toast({
        title: approvalResult.auto_approved ? 'Order Auto-Approved!' : 'Order Submitted',
        description: approvalResult.message,
        variant: approvalResult.auto_approved ? 'default' : 'default',
      });

      return {
        success: true,
        order_id: order.id,
        approval_id: approvalResult.approval_id,
        auto_approved: approvalResult.auto_approved,
        message: approvalResult.message,
      };

    } catch (error: any) {
      console.error('Order submission error:', error);
      
      toast({
        title: 'Order Submission Failed',
        description: error.message,
        variant: 'destructive',
      });

      return {
        success: false,
        message: 'Failed to submit order',
        error: error.message,
      };

    } finally {
      setSubmitting(false);
      setEvaluating(false);
    }
  }

  /**
   * Trigger auto-approval evaluation for an order
   */
  async function triggerAutoApproval(orderId: string): Promise<{
    approval_id: string;
    auto_approved: boolean;
    message: string;
  }> {
    try {
      const response = await fetch('/api/admin/orders/auto-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          process: true, // Create approval record and update order
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Auto-approval evaluation failed');
      }

      return {
        approval_id: result.approval?.approval_id || '',
        auto_approved: result.approval?.auto_approved || false,
        message: result.approval?.message || 'Order submitted for review',
      };

    } catch (error: any) {
      console.error('Auto-approval trigger error:', error);
      
      // Don't fail the order submission if auto-approval fails
      // Just mark it for manual review
      return {
        approval_id: '',
        auto_approved: false,
        message: 'Order submitted for manual review',
      };
    }
  }

  /**
   * Check auto-approval eligibility without processing
   */
  async function checkAutoApprovalEligibility(orderId: string): Promise<{
    eligible: boolean;
    reasons: string[];
    risk_score: number;
    recommendation: string;
  }> {
    try {
      const response = await fetch('/api/admin/orders/auto-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          process: false, // Just evaluate, don't process
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Eligibility check failed');
      }

      return {
        eligible: result.evaluation.eligible,
        reasons: result.evaluation.reasons,
        risk_score: result.evaluation.risk_assessment.risk_score,
        recommendation: result.evaluation.recommendation,
      };

    } catch (error: any) {
      console.error('Eligibility check error:', error);
      throw error;
    }
  }

  return {
    submitOrder,
    triggerAutoApproval,
    checkAutoApprovalEligibility,
    submitting,
    evaluating,
  };
}

