/**
 * Order Management AI Tools
 *
 * Tools for AI-assisted order management, search, and operations.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const orderTools = {
  // ─────────────────────────────────────────────────────────────────
  // READ TOOLS
  // ─────────────────────────────────────────────────────────────────

  searchOrders: tool({
    description: 'Search orders by status, date range, customer, or product',
    parameters: z.object({
      query: z.string().optional().describe('Free text search'),
      status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']).optional(),
      dateFrom: z.string().optional().describe('ISO date string'),
      dateTo: z.string().optional().describe('ISO date string'),
      customerId: z.string().optional(),
      productSku: z.string().optional(),
      limit: z.number().default(20),
    }),
    execute: async ({ query, status, dateFrom, dateTo, customerId, productSku, limit }, context) => {
      const supabase = await createClient();

      let queryBuilder = supabase
        .from('orders')
        .select(`
          *,
          user:profiles(id, first_name, last_name, email),
          order_items(*, product:products(id, name, sku))
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status) {
        queryBuilder = queryBuilder.eq('status', status);
      }

      if (dateFrom) {
        queryBuilder = queryBuilder.gte('created_at', dateFrom);
      }

      if (dateTo) {
        queryBuilder = queryBuilder.lte('created_at', dateTo);
      }

      if (customerId) {
        queryBuilder = queryBuilder.eq('user_id', customerId);
      }

      const { data: orders, error } = await queryBuilder;

      if (error) throw new Error(`Failed to search orders: ${error.message}`);

      // Filter by product SKU if specified
      let filteredOrders = orders || [];
      if (productSku) {
        filteredOrders = filteredOrders.filter(order =>
          order.order_items?.some((item: any) => item.product?.sku === productSku)
        );
      }

      return {
        orders: filteredOrders,
        count: filteredOrders.length,
      };
    },
  }),

  getOrderDetails: tool({
    description: 'Get full details of a specific order including items, shipping, and payment',
    parameters: z.object({
      orderId: z.string(),
    }),
    execute: async ({ orderId }) => {
      const supabase = await createClient();

      const { data: order, error } = await supabase
        .from('orders')
        .select(`
          *,
          user:profiles(*),
          order_items(*, product:products(*)),
          shipping_address:addresses(*),
          invoices(*)
        `)
        .eq('id', orderId)
        .single();

      if (error) throw new Error(`Order not found: ${error.message}`);

      return { order };
    },
  }),

  getOrderTimeline: tool({
    description: 'Get the status history and timeline of an order',
    parameters: z.object({
      orderId: z.string(),
    }),
    execute: async ({ orderId }) => {
      const supabase = await createClient();

      const { data: events, error } = await supabase
        .from('order_events')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) {
        // If no events table, return basic timeline from order
        const { data: order } = await supabase
          .from('orders')
          .select('status, created_at, updated_at')
          .eq('id', orderId)
          .single();

        return {
          timeline: [
            { status: 'created', timestamp: order?.created_at, note: 'Order placed' },
            { status: order?.status, timestamp: order?.updated_at, note: 'Current status' },
          ],
        };
      }

      return { timeline: events };
    },
  }),

  getRecentOrders: tool({
    description: 'Get recent orders for current user',
    parameters: z.object({
      limit: z.number().default(10),
    }),
    execute: async ({ limit }, context) => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(count)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw new Error(`Failed to get orders: ${error.message}`);

      return { orders: orders || [] };
    },
  }),

  // ─────────────────────────────────────────────────────────────────
  // WRITE TOOLS
  // ─────────────────────────────────────────────────────────────────

  createOrder: tool({
    description: 'Create a new order from cart items or specific products',
    parameters: z.object({
      items: z.array(z.object({
        productId: z.string(),
        quantity: z.number().positive(),
      })).optional().describe('If not provided, uses current cart'),
      shippingAddressId: z.string().optional(),
      notes: z.string().optional(),
      poNumber: z.string().optional().describe('Customer PO number'),
    }),
    execute: async ({ items, shippingAddressId, notes, poNumber }) => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      // If no items provided, get from cart
      let orderItems = items;
      if (!orderItems) {
        const { data: cartItems } = await supabase
          .from('cart_items')
          .select('product_id, quantity')
          .eq('user_id', user.id);

        orderItems = cartItems?.map(item => ({
          productId: item.product_id,
          quantity: item.quantity,
        })) || [];
      }

      if (orderItems.length === 0) {
        throw new Error('No items to order');
      }

      // Get product prices
      const productIds = orderItems.map(i => i.productId);
      const { data: products } = await supabase
        .from('products')
        .select('id, base_price')
        .in('id', productIds);

      const priceMap = new Map(products?.map(p => [p.id, p.base_price]) || []);

      // Calculate total
      const total = orderItems.reduce((sum, item) => {
        return sum + (item.quantity * (priceMap.get(item.productId) || 0));
      }, 0);

      // Create order
      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          status: 'pending',
          total,
          shipping_address_id: shippingAddressId,
          notes,
          po_number: poNumber,
        })
        .select()
        .single();

      if (error) throw new Error(`Failed to create order: ${error.message}`);

      // Create order items
      const orderItemsData = orderItems.map(item => ({
        order_id: order.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: priceMap.get(item.productId) || 0,
      }));

      await supabase.from('order_items').insert(orderItemsData);

      // Clear cart if we used it
      if (!items) {
        await supabase.from('cart_items').delete().eq('user_id', user.id);
      }

      return {
        orderId: order.id,
        total,
        itemCount: orderItems.length,
        status: 'pending',
      };
    },
  }),

  reorderPrevious: tool({
    description: 'Reorder items from a previous order',
    parameters: z.object({
      orderId: z.string(),
      adjustQuantities: z.record(z.string(), z.number()).optional()
        .describe('Map of productId to new quantity'),
    }),
    execute: async ({ orderId, adjustQuantities }) => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      // Get previous order items
      const { data: orderItems, error } = await supabase
        .from('order_items')
        .select('product_id, quantity, unit_price')
        .eq('order_id', orderId);

      if (error || !orderItems?.length) {
        throw new Error('Order not found or empty');
      }

      // Adjust quantities if specified
      const items = orderItems.map(item => ({
        productId: item.product_id,
        quantity: adjustQuantities?.[item.product_id] ?? item.quantity,
      }));

      // Get current prices
      const productIds = items.map(i => i.productId);
      const { data: products } = await supabase
        .from('products')
        .select('id, base_price')
        .in('id', productIds);

      const priceMap = new Map(products?.map(p => [p.id, p.base_price]) || []);

      const total = items.reduce((sum, item) => {
        return sum + (item.quantity * (priceMap.get(item.productId) || 0));
      }, 0);

      // Create new order
      const { data: order } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          status: 'pending',
          total,
          notes: `Reordered from order ${orderId}`,
        })
        .select()
        .single();

      if (!order) throw new Error('Failed to create reorder');

      const newOrderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: priceMap.get(item.productId) || 0,
      }));

      await supabase.from('order_items').insert(newOrderItems);

      return {
        orderId: order.id,
        total,
        itemCount: items.length,
        status: 'pending',
      };
    },
  }),

  updateOrderStatus: tool({
    description: 'Update the status of an order (admin only)',
    parameters: z.object({
      orderId: z.string(),
      newStatus: z.enum(['confirmed', 'processing', 'shipped', 'delivered', 'cancelled']),
      note: z.string().optional(),
      trackingNumber: z.string().optional(),
    }),
    execute: async ({ orderId, newStatus, note, trackingNumber }, context) => {
      const supabase = await createClient();

      // Check admin role
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
        throw new Error('Admin access required');
      }

      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (trackingNumber) {
        updateData.tracking_number = trackingNumber;
      }

      const { data: order, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw new Error(`Failed to update order: ${error.message}`);

      return {
        orderId,
        newStatus,
        updatedAt: order.updated_at,
      };
    },
  }),

  cancelOrder: tool({
    description: 'Cancel an order (only if not yet shipped)',
    parameters: z.object({
      orderId: z.string(),
      reason: z.string(),
    }),
    execute: async ({ orderId, reason }) => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      // Check order status
      const { data: order } = await supabase
        .from('orders')
        .select('status, user_id')
        .eq('id', orderId)
        .single();

      if (!order) throw new Error('Order not found');

      if (order.user_id !== user.id) {
        throw new Error('Not authorized to cancel this order');
      }

      if (['shipped', 'delivered', 'cancelled'].includes(order.status)) {
        throw new Error(`Cannot cancel order with status: ${order.status}`);
      }

      const { error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          notes: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) throw new Error(`Failed to cancel order: ${error.message}`);

      return {
        orderId,
        status: 'cancelled',
        reason,
      };
    },
  }),

  // ─────────────────────────────────────────────────────────────────
  // BULK TOOLS
  // ─────────────────────────────────────────────────────────────────

  bulkUploadOrders: tool({
    description: 'Upload multiple orders from CSV/SKU list',
    parameters: z.object({
      items: z.array(z.object({
        sku: z.string(),
        quantity: z.number(),
      })),
    }),
    execute: async ({ items }) => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      // Look up products by SKU
      const skus = items.map(i => i.sku);
      const { data: products } = await supabase
        .from('products')
        .select('id, sku, name, base_price')
        .in('sku', skus);

      const productMap = new Map(products?.map(p => [p.sku, p]) || []);

      // Validate all SKUs exist
      const notFound = items.filter(i => !productMap.has(i.sku));
      if (notFound.length > 0) {
        return {
          success: false,
          error: 'Some SKUs not found',
          notFound: notFound.map(i => i.sku),
        };
      }

      // Build cart items
      const cartItems = items.map(item => {
        const product = productMap.get(item.sku)!;
        return {
          user_id: user.id,
          product_id: product.id,
          quantity: item.quantity,
        };
      });

      // Upsert to cart
      const { error } = await supabase
        .from('cart_items')
        .upsert(cartItems, { onConflict: 'user_id,product_id' });

      if (error) throw new Error(`Failed to add items: ${error.message}`);

      return {
        success: true,
        itemsAdded: cartItems.length,
      };
    },
  }),
};

export type OrderTools = typeof orderTools;
