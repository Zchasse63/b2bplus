/**
 * Invoice & Billing AI Tools
 *
 * Tools for AI-assisted invoice management and billing operations.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const invoiceTools = {
  // ─────────────────────────────────────────────────────────────────
  // READ TOOLS
  // ─────────────────────────────────────────────────────────────────

  getInvoices: tool({
    description: 'Get invoices for a customer or all invoices (admin)',
    parameters: z.object({
      customerId: z.string().optional(),
      status: z.enum(['all', 'draft', 'sent', 'paid', 'overdue', 'cancelled']).default('all'),
      limit: z.number().default(20),
    }),
    execute: async ({ customerId, status, limit }) => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const isAdmin = profile?.role === 'admin';

      let query = supabase
        .from('invoices')
        .select(`
          *,
          customer:profiles!customer_id(id, full_name, company, email),
          order:orders(id, order_number)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      // Non-admins can only see their own invoices
      if (!isAdmin) {
        query = query.eq('customer_id', user.id);
      } else if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      const { data: invoices, error } = await query;

      if (error) throw new Error(`Failed to get invoices: ${error.message}`);

      return {
        invoices: invoices?.map(inv => ({
          id: inv.id,
          invoiceNumber: inv.invoice_number,
          customer: isAdmin ? {
            id: (inv.customer as any)?.id,
            name: (inv.customer as any)?.full_name,
            company: (inv.customer as any)?.company,
          } : undefined,
          orderId: (inv.order as any)?.id,
          orderNumber: (inv.order as any)?.order_number,
          amount: inv.amount,
          status: inv.status,
          dueDate: inv.due_date,
          createdAt: inv.created_at,
          paidAt: inv.paid_at,
        })) || [],
      };
    },
  }),

  getInvoiceDetails: tool({
    description: 'Get detailed invoice with line items',
    parameters: z.object({
      invoiceId: z.string(),
    }),
    execute: async ({ invoiceId }) => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const isAdmin = profile?.role === 'admin';

      const { data: invoice, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:profiles!customer_id(id, full_name, company, email, phone),
          order:orders(id, order_number, shipping_address),
          items:invoice_items(
            id,
            product_id,
            description,
            quantity,
            unit_price,
            extended_price,
            product:products(name, sku)
          )
        `)
        .eq('id', invoiceId)
        .single();

      if (error) throw new Error(`Invoice not found: ${error.message}`);

      // Check authorization
      if (!isAdmin && invoice.customer_id !== user.id) {
        throw new Error('Not authorized to view this invoice');
      }

      return {
        invoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoice_number,
          status: invoice.status,
          createdAt: invoice.created_at,
          dueDate: invoice.due_date,
          paidAt: invoice.paid_at,
          subtotal: invoice.subtotal,
          tax: invoice.tax,
          shipping: invoice.shipping,
          total: invoice.amount,
          notes: invoice.notes,
        },
        customer: {
          id: (invoice.customer as any)?.id,
          name: (invoice.customer as any)?.full_name,
          company: (invoice.customer as any)?.company,
          email: (invoice.customer as any)?.email,
          phone: (invoice.customer as any)?.phone,
        },
        order: invoice.order ? {
          id: (invoice.order as any)?.id,
          orderNumber: (invoice.order as any)?.order_number,
          shippingAddress: (invoice.order as any)?.shipping_address,
        } : null,
        lineItems: invoice.items?.map((item: any) => ({
          id: item.id,
          productId: item.product_id,
          productName: item.product?.name,
          sku: item.product?.sku,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          extendedPrice: item.extended_price,
        })) || [],
      };
    },
  }),

  getOverdueInvoices: tool({
    description: 'Get list of overdue invoices (admin only)',
    parameters: z.object({
      daysOverdue: z.number().default(0),
    }),
    execute: async ({ daysOverdue }) => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        throw new Error('Admin access required');
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOverdue);

      const { data: invoices, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:profiles!customer_id(id, full_name, company, email)
        `)
        .eq('status', 'overdue')
        .lte('due_date', cutoffDate.toISOString())
        .order('due_date', { ascending: true });

      if (error) throw new Error(`Failed to get overdue invoices: ${error.message}`);

      const totalOverdue = invoices?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;

      return {
        invoices: invoices?.map(inv => ({
          id: inv.id,
          invoiceNumber: inv.invoice_number,
          customer: {
            id: (inv.customer as any)?.id,
            name: (inv.customer as any)?.full_name,
            company: (inv.customer as any)?.company,
            email: (inv.customer as any)?.email,
          },
          amount: inv.amount,
          dueDate: inv.due_date,
          daysOverdue: Math.floor(
            (Date.now() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24)
          ),
        })) || [],
        summary: {
          totalOverdue: Math.round(totalOverdue * 100) / 100,
          invoiceCount: invoices?.length || 0,
        },
      };
    },
  }),

  // ─────────────────────────────────────────────────────────────────
  // WRITE TOOLS (Admin Only)
  // ─────────────────────────────────────────────────────────────────

  createInvoice: tool({
    description: 'Create a new invoice from an order',
    parameters: z.object({
      orderId: z.string(),
      dueDate: z.string().describe('ISO date'),
      notes: z.string().optional(),
    }),
    execute: async ({ orderId, dueDate, notes }) => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        throw new Error('Admin access required');
      }

      // Get order details
      const { data: order } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(product_id, quantity, unit_price)
        `)
        .eq('id', orderId)
        .single();

      if (!order) throw new Error('Order not found');

      // Generate invoice number
      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;

      // Create invoice
      const { data: invoice, error } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          customer_id: order.user_id,
          order_id: orderId,
          subtotal: order.subtotal,
          tax: order.tax,
          shipping: order.shipping,
          amount: order.total,
          due_date: dueDate,
          notes,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw new Error(`Failed to create invoice: ${error.message}`);

      // Create invoice items from order items
      const invoiceItems = order.items?.map((item: any) => ({
        invoice_id: invoice.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        extended_price: item.quantity * item.unit_price,
      })) || [];

      if (invoiceItems.length > 0) {
        await supabase.from('invoice_items').insert(invoiceItems);
      }

      return {
        success: true,
        invoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoice_number,
          amount: invoice.amount,
          dueDate: invoice.due_date,
          status: invoice.status,
        },
      };
    },
  }),

  updateInvoiceStatus: tool({
    description: 'Update invoice status',
    parameters: z.object({
      invoiceId: z.string(),
      status: z.enum(['sent', 'paid', 'overdue', 'cancelled']),
      paidAt: z.string().optional().describe('ISO date - required if status is paid'),
    }),
    execute: async ({ invoiceId, status, paidAt }) => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        throw new Error('Admin access required');
      }

      const updates: Record<string, any> = { status };
      if (status === 'paid') {
        updates.paid_at = paidAt || new Date().toISOString();
      }

      const { error } = await supabase
        .from('invoices')
        .update(updates)
        .eq('id', invoiceId);

      if (error) throw new Error(`Failed to update invoice: ${error.message}`);

      return { success: true, invoiceId, newStatus: status };
    },
  }),

  sendInvoice: tool({
    description: 'Send invoice to customer via email',
    parameters: z.object({
      invoiceId: z.string(),
      message: z.string().optional().describe('Custom message to include'),
    }),
    execute: async ({ invoiceId, message }) => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        throw new Error('Admin access required');
      }

      // Get invoice with customer
      const { data: invoice } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:profiles!customer_id(id, full_name, email)
        `)
        .eq('id', invoiceId)
        .single();

      if (!invoice) throw new Error('Invoice not found');

      // Queue email
      await supabase
        .from('email_queue')
        .insert({
          to_user_id: invoice.customer_id,
          subject: `Invoice ${invoice.invoice_number} from B2B Plus`,
          body: message || `Please find attached your invoice ${invoice.invoice_number} for $${invoice.amount}.`,
          template: 'invoice',
          metadata: { invoiceId },
        });

      // Update status to sent
      await supabase
        .from('invoices')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', invoiceId);

      return {
        success: true,
        invoiceId,
        sentTo: (invoice.customer as any)?.email,
      };
    },
  }),

  recordPayment: tool({
    description: 'Record a payment for an invoice',
    parameters: z.object({
      invoiceId: z.string(),
      amount: z.number().positive(),
      paymentMethod: z.enum(['check', 'wire', 'ach', 'credit_card', 'other']),
      reference: z.string().optional().describe('Check number, transaction ID, etc'),
      notes: z.string().optional(),
    }),
    execute: async ({ invoiceId, amount, paymentMethod, reference, notes }) => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        throw new Error('Admin access required');
      }

      // Get invoice
      const { data: invoice } = await supabase
        .from('invoices')
        .select('amount, status')
        .eq('id', invoiceId)
        .single();

      if (!invoice) throw new Error('Invoice not found');

      // Record payment
      const { data: payment, error } = await supabase
        .from('payments')
        .insert({
          invoice_id: invoiceId,
          amount,
          payment_method: paymentMethod,
          reference,
          notes,
          recorded_by: user.id,
        })
        .select()
        .single();

      if (error) throw new Error(`Failed to record payment: ${error.message}`);

      // Update invoice status if fully paid
      if (amount >= invoice.amount) {
        await supabase
          .from('invoices')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
          })
          .eq('id', invoiceId);
      }

      return {
        success: true,
        payment: {
          id: payment.id,
          amount,
          paymentMethod,
          reference,
        },
        invoiceFullyPaid: amount >= invoice.amount,
      };
    },
  }),

  getPaymentHistory: tool({
    description: 'Get payment history for an invoice or customer',
    parameters: z.object({
      invoiceId: z.string().optional(),
      customerId: z.string().optional(),
      limit: z.number().default(20),
    }),
    execute: async ({ invoiceId, customerId, limit }) => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const isAdmin = profile?.role === 'admin';

      let query = supabase
        .from('payments')
        .select(`
          *,
          invoice:invoices(
            id,
            invoice_number,
            customer_id
          ),
          recorded_by_user:profiles!recorded_by(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (invoiceId) {
        query = query.eq('invoice_id', invoiceId);
      }

      const { data: payments, error } = await query;

      if (error) throw new Error(`Failed to get payments: ${error.message}`);

      // Filter by authorization
      const filteredPayments = payments?.filter(p => {
        if (isAdmin) return true;
        return (p.invoice as any)?.customer_id === user.id;
      }) || [];

      return {
        payments: filteredPayments.map(p => ({
          id: p.id,
          invoiceId: p.invoice_id,
          invoiceNumber: (p.invoice as any)?.invoice_number,
          amount: p.amount,
          paymentMethod: p.payment_method,
          reference: p.reference,
          createdAt: p.created_at,
          recordedBy: isAdmin ? (p.recorded_by_user as any)?.full_name : undefined,
        })),
        totalAmount: filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
      };
    },
  }),
};

export type InvoiceTools = typeof invoiceTools;
