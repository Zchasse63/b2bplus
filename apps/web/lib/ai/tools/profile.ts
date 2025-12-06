/**
 * User Profile AI Tools
 *
 * Tools for AI-assisted user profile management.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const profileTools = {
  // ─────────────────────────────────────────────────────────────────
  // READ TOOLS
  // ─────────────────────────────────────────────────────────────────

  getProfile: tool({
    description: 'Get current user profile',
    parameters: z.object({}),
    execute: async () => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw new Error(`Failed to get profile: ${error.message}`);

      return {
        id: profile.id,
        email: user.email,
        fullName: profile.full_name,
        company: profile.company,
        phone: profile.phone,
        role: profile.role,
        createdAt: profile.created_at,
        preferences: profile.preferences,
      };
    },
  }),

  getAddresses: tool({
    description: 'Get user addresses',
    parameters: z.object({
      type: z.enum(['all', 'shipping', 'billing']).default('all'),
    }),
    execute: async ({ type }) => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });

      if (type !== 'all') {
        query = query.eq('type', type);
      }

      const { data: addresses, error } = await query;

      if (error) throw new Error(`Failed to get addresses: ${error.message}`);

      return {
        addresses: addresses?.map(addr => ({
          id: addr.id,
          type: addr.type,
          name: addr.name,
          street1: addr.street1,
          street2: addr.street2,
          city: addr.city,
          state: addr.state,
          zip: addr.zip,
          country: addr.country,
          isDefault: addr.is_default,
        })) || [],
      };
    },
  }),

  getNotificationSettings: tool({
    description: 'Get notification preferences',
    parameters: z.object({}),
    execute: async () => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const { data: settings } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      return {
        settings: settings || {
          orderUpdates: true,
          promotions: true,
          newsletter: false,
          priceAlerts: true,
          backInStock: true,
        },
      };
    },
  }),

  getPaymentMethods: tool({
    description: 'Get saved payment methods',
    parameters: z.object({}),
    execute: async () => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const { data: methods } = await supabase
        .from('payment_methods')
        .select('id, type, last_four, expiry_month, expiry_year, is_default, brand')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });

      return {
        paymentMethods: methods?.map(m => ({
          id: m.id,
          type: m.type,
          brand: m.brand,
          lastFour: m.last_four,
          expiry: `${m.expiry_month}/${m.expiry_year}`,
          isDefault: m.is_default,
        })) || [],
      };
    },
  }),

  getRecentActivity: tool({
    description: 'Get recent account activity',
    parameters: z.object({
      limit: z.number().default(10),
    }),
    execute: async ({ limit }) => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      // Get recent orders
      const { data: orders } = await supabase
        .from('orders')
        .select('id, order_number, total, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Get recent product views
      const { data: views } = await supabase
        .from('product_views')
        .select('product:products(id, name), viewed_at')
        .eq('user_id', user.id)
        .order('viewed_at', { ascending: false })
        .limit(5);

      // Get recent notifications
      const { data: notifications } = await supabase
        .from('notifications')
        .select('id, title, message, read, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      return {
        recentOrders: orders || [],
        recentViews: views?.map(v => ({
          productId: (v.product as any)?.id,
          productName: (v.product as any)?.name,
          viewedAt: v.viewed_at,
        })) || [],
        recentNotifications: notifications || [],
      };
    },
  }),

  // ─────────────────────────────────────────────────────────────────
  // WRITE TOOLS
  // ─────────────────────────────────────────────────────────────────

  updateProfile: tool({
    description: 'Update user profile information',
    parameters: z.object({
      fullName: z.string().optional(),
      company: z.string().optional(),
      phone: z.string().optional(),
    }),
    execute: async ({ fullName, company, phone }) => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const updates: Record<string, string> = {};
      if (fullName) updates.full_name = fullName;
      if (company) updates.company = company;
      if (phone) updates.phone = phone;

      if (Object.keys(updates).length === 0) {
        throw new Error('No updates provided');
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw new Error(`Failed to update profile: ${error.message}`);

      return { success: true, updates };
    },
  }),

  addAddress: tool({
    description: 'Add a new address',
    parameters: z.object({
      type: z.enum(['shipping', 'billing']),
      name: z.string().describe('Address label, e.g., "Office", "Warehouse"'),
      street1: z.string(),
      street2: z.string().optional(),
      city: z.string(),
      state: z.string(),
      zip: z.string(),
      country: z.string().default('US'),
      isDefault: z.boolean().default(false),
    }),
    execute: async ({ type, name, street1, street2, city, state, zip, country, isDefault }) => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      // If setting as default, unset other defaults of same type
      if (isDefault) {
        await supabase
          .from('addresses')
          .update({ is_default: false })
          .eq('user_id', user.id)
          .eq('type', type);
      }

      const { data: address, error } = await supabase
        .from('addresses')
        .insert({
          user_id: user.id,
          type,
          name,
          street1,
          street2,
          city,
          state,
          zip,
          country,
          is_default: isDefault,
        })
        .select()
        .single();

      if (error) throw new Error(`Failed to add address: ${error.message}`);

      return {
        success: true,
        address: {
          id: address.id,
          name: address.name,
          type: address.type,
          isDefault: address.is_default,
        },
      };
    },
  }),

  updateAddress: tool({
    description: 'Update an existing address',
    parameters: z.object({
      addressId: z.string(),
      updates: z.object({
        name: z.string().optional(),
        street1: z.string().optional(),
        street2: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zip: z.string().optional(),
        isDefault: z.boolean().optional(),
      }),
    }),
    execute: async ({ addressId, updates }) => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      // Verify ownership
      const { data: existing } = await supabase
        .from('addresses')
        .select('id, type')
        .eq('id', addressId)
        .eq('user_id', user.id)
        .single();

      if (!existing) throw new Error('Address not found');

      // Handle default change
      if (updates.isDefault) {
        await supabase
          .from('addresses')
          .update({ is_default: false })
          .eq('user_id', user.id)
          .eq('type', existing.type);
      }

      const dbUpdates: Record<string, any> = {};
      if (updates.name) dbUpdates.name = updates.name;
      if (updates.street1) dbUpdates.street1 = updates.street1;
      if (updates.street2 !== undefined) dbUpdates.street2 = updates.street2;
      if (updates.city) dbUpdates.city = updates.city;
      if (updates.state) dbUpdates.state = updates.state;
      if (updates.zip) dbUpdates.zip = updates.zip;
      if (updates.isDefault !== undefined) dbUpdates.is_default = updates.isDefault;

      const { error } = await supabase
        .from('addresses')
        .update(dbUpdates)
        .eq('id', addressId);

      if (error) throw new Error(`Failed to update address: ${error.message}`);

      return { success: true, addressId, updates: dbUpdates };
    },
  }),

  deleteAddress: tool({
    description: 'Delete an address',
    parameters: z.object({
      addressId: z.string(),
    }),
    execute: async ({ addressId }) => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      // Verify ownership
      const { data: existing } = await supabase
        .from('addresses')
        .select('id')
        .eq('id', addressId)
        .eq('user_id', user.id)
        .single();

      if (!existing) throw new Error('Address not found');

      const { error } = await supabase
        .from('addresses')
        .delete()
        .eq('id', addressId);

      if (error) throw new Error(`Failed to delete address: ${error.message}`);

      return { success: true, addressId };
    },
  }),

  updateNotificationSettings: tool({
    description: 'Update notification preferences',
    parameters: z.object({
      orderUpdates: z.boolean().optional(),
      promotions: z.boolean().optional(),
      newsletter: z.boolean().optional(),
      priceAlerts: z.boolean().optional(),
      backInStock: z.boolean().optional(),
    }),
    execute: async (settings) => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const updates: Record<string, boolean> = {};
      if (settings.orderUpdates !== undefined) updates.order_updates = settings.orderUpdates;
      if (settings.promotions !== undefined) updates.promotions = settings.promotions;
      if (settings.newsletter !== undefined) updates.newsletter = settings.newsletter;
      if (settings.priceAlerts !== undefined) updates.price_alerts = settings.priceAlerts;
      if (settings.backInStock !== undefined) updates.back_in_stock = settings.backInStock;

      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: user.id,
          ...updates,
        });

      if (error) throw new Error(`Failed to update settings: ${error.message}`);

      return { success: true, settings: updates };
    },
  }),

  markNotificationRead: tool({
    description: 'Mark a notification as read',
    parameters: z.object({
      notificationId: z.string().optional(),
      markAll: z.boolean().default(false),
    }),
    execute: async ({ notificationId, markAll }) => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id);

      if (!markAll && notificationId) {
        query = query.eq('id', notificationId);
      }

      const { error } = await query;

      if (error) throw new Error(`Failed to mark notification: ${error.message}`);

      return {
        success: true,
        markedAll: markAll,
      };
    },
  }),
};

export type ProfileTools = typeof profileTools;
