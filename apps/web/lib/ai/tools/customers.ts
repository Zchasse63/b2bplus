/**
 * Customer Management AI Tools (Admin Only)
 *
 * Tools for AI-assisted customer relationship management.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const customerTools = {
  // ─────────────────────────────────────────────────────────────────
  // READ TOOLS
  // ─────────────────────────────────────────────────────────────────

  searchCustomers: tool({
    description: 'Search customers by name, email, or company',
    parameters: z.object({
      query: z.string().describe('Search term'),
      segment: z.enum(['all', 'high_value', 'at_risk', 'new']).optional(),
      limit: z.number().default(20),
    }),
    execute: async ({ query, segment, limit }) => {
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

      const { data: customers } = await supabase
        .from('profiles')
        .select('id, full_name, email, company, created_at, phone')
        .eq('role', 'customer')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,company.ilike.%${query}%`)
        .limit(limit);

      return {
        customers: customers || [],
        count: customers?.length || 0,
      };
    },
  }),

  getCustomerDetails: tool({
    description: 'Get detailed customer profile with order history',
    parameters: z.object({
      customerId: z.string(),
    }),
    execute: async ({ customerId }) => {
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

      // Get customer profile
      const { data: customer } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', customerId)
        .single();

      if (!customer) throw new Error('Customer not found');

      // Get customer addresses
      const { data: addresses } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', customerId);

      // Get order summary
      const { data: orders } = await supabase
        .from('orders')
        .select('id, total, status, created_at')
        .eq('user_id', customerId)
        .order('created_at', { ascending: false });

      const completedOrders = orders?.filter(o => o.status === 'completed') || [];
      const totalSpent = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);

      return {
        customer: {
          id: customer.id,
          email: customer.email,
          fullName: customer.full_name,
          company: customer.company,
          phone: customer.phone,
          createdAt: customer.created_at,
        },
        addresses: addresses || [],
        orderSummary: {
          totalOrders: orders?.length || 0,
          completedOrders: completedOrders.length,
          totalSpent: Math.round(totalSpent * 100) / 100,
          avgOrderValue: completedOrders.length > 0
            ? Math.round((totalSpent / completedOrders.length) * 100) / 100
            : 0,
          lastOrderDate: orders?.[0]?.created_at || null,
        },
        recentOrders: orders?.slice(0, 5) || [],
      };
    },
  }),

  getCustomerOrders: tool({
    description: 'Get order history for a specific customer',
    parameters: z.object({
      customerId: z.string(),
      status: z.enum(['all', 'pending', 'processing', 'completed', 'cancelled']).default('all'),
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

      if (profile?.role !== 'admin') {
        throw new Error('Admin access required');
      }

      let query = supabase
        .from('orders')
        .select(`
          *,
          items:order_items(
            id,
            quantity,
            unit_price,
            product:products(id, name, sku)
          )
        `)
        .eq('user_id', customerId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      const { data: orders, error } = await query;

      if (error) throw new Error(`Failed to get orders: ${error.message}`);

      return {
        orders: orders || [],
        count: orders?.length || 0,
      };
    },
  }),

  // ─────────────────────────────────────────────────────────────────
  // WRITE TOOLS
  // ─────────────────────────────────────────────────────────────────

  updateCustomer: tool({
    description: 'Update customer profile information',
    parameters: z.object({
      customerId: z.string(),
      updates: z.object({
        fullName: z.string().optional(),
        company: z.string().optional(),
        phone: z.string().optional(),
      }),
    }),
    execute: async ({ customerId, updates }) => {
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

      const updateData: Record<string, string> = {};
      if (updates.fullName) updateData.full_name = updates.fullName;
      if (updates.company) updateData.company = updates.company;
      if (updates.phone) updateData.phone = updates.phone;

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', customerId);

      if (error) throw new Error(`Failed to update customer: ${error.message}`);

      return { success: true, customerId, updates: updateData };
    },
  }),

  assignPricingTier: tool({
    description: 'Assign a customer to a pricing tier',
    parameters: z.object({
      customerId: z.string(),
      tierId: z.string(),
    }),
    execute: async ({ customerId, tierId }) => {
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

      // Verify tier exists
      const { data: tier } = await supabase
        .from('pricing_tiers')
        .select('id, name')
        .eq('id', tierId)
        .single();

      if (!tier) throw new Error('Pricing tier not found');

      // Upsert customer pricing tier
      const { error } = await supabase
        .from('customer_pricing_tiers')
        .upsert({
          customer_id: customerId,
          tier_id: tierId,
        });

      if (error) throw new Error(`Failed to assign tier: ${error.message}`);

      return {
        success: true,
        customerId,
        tier: tier.name,
      };
    },
  }),

  addCustomerNote: tool({
    description: 'Add a note to customer record',
    parameters: z.object({
      customerId: z.string(),
      note: z.string(),
      category: z.enum(['general', 'support', 'sales', 'billing']).default('general'),
    }),
    execute: async ({ customerId, note, category }) => {
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

      const { data: customerNote, error } = await supabase
        .from('customer_notes')
        .insert({
          customer_id: customerId,
          author_id: user.id,
          note,
          category,
        })
        .select()
        .single();

      if (error) throw new Error(`Failed to add note: ${error.message}`);

      return {
        success: true,
        noteId: customerNote.id,
        customerId,
        category,
      };
    },
  }),

  getCustomerNotes: tool({
    description: 'Get notes for a customer',
    parameters: z.object({
      customerId: z.string(),
      category: z.enum(['all', 'general', 'support', 'sales', 'billing']).default('all'),
    }),
    execute: async ({ customerId, category }) => {
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

      let query = supabase
        .from('customer_notes')
        .select(`
          *,
          author:profiles!author_id(full_name)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (category !== 'all') {
        query = query.eq('category', category);
      }

      const { data: notes, error } = await query;

      if (error) throw new Error(`Failed to get notes: ${error.message}`);

      return {
        notes: notes?.map(n => ({
          id: n.id,
          note: n.note,
          category: n.category,
          author: (n.author as any)?.full_name,
          createdAt: n.created_at,
        })) || [],
      };
    },
  }),

  sendCustomerMessage: tool({
    description: 'Send a message or notification to a customer',
    parameters: z.object({
      customerId: z.string(),
      subject: z.string(),
      message: z.string(),
      channel: z.enum(['email', 'in_app', 'both']).default('both'),
    }),
    execute: async ({ customerId, subject, message, channel }) => {
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

      // Create in-app notification if needed
      if (channel === 'in_app' || channel === 'both') {
        await supabase
          .from('notifications')
          .insert({
            user_id: customerId,
            title: subject,
            message,
            type: 'admin_message',
          });
      }

      // Queue email if needed
      if (channel === 'email' || channel === 'both') {
        await supabase
          .from('email_queue')
          .insert({
            to_user_id: customerId,
            subject,
            body: message,
            template: 'admin_message',
          });
      }

      return {
        success: true,
        customerId,
        channel,
        subject,
      };
    },
  }),
};

export type CustomerTools = typeof customerTools;
