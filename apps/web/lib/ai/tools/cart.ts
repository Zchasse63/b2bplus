/**
 * Cart Management AI Tools
 *
 * Tools for AI-assisted cart operations.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const cartTools = {
  // ─────────────────────────────────────────────────────────────────
  // READ TOOLS
  // ─────────────────────────────────────────────────────────────────

  getCart: tool({
    description: 'Get current cart contents with pricing',
    parameters: z.object({}),
    execute: async () => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const { data: cartItems, error } = await supabase
        .from('cart_items')
        .select(`
          *,
          product:products(id, name, sku, base_price, inventory_count, images:product_images(url))
        `)
        .eq('user_id', user.id);

      if (error) throw new Error(`Failed to get cart: ${error.message}`);

      const items = cartItems?.map(item => ({
        id: item.id,
        productId: item.product_id,
        product: item.product,
        quantity: item.quantity,
        unitPrice: (item.product as any)?.base_price || 0,
        extendedPrice: item.quantity * ((item.product as any)?.base_price || 0),
      })) || [];

      const subtotal = items.reduce((sum, item) => sum + item.extendedPrice, 0);

      return {
        items,
        itemCount: items.length,
        subtotal,
        estimatedTax: Math.round(subtotal * 0.08 * 100) / 100,
        estimatedTotal: Math.round(subtotal * 1.08 * 100) / 100,
      };
    },
  }),

  getCartSummary: tool({
    description: 'Get a quick summary of cart totals',
    parameters: z.object({}),
    execute: async () => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const { data: cartItems } = await supabase
        .from('cart_items')
        .select('quantity, product:products(base_price)')
        .eq('user_id', user.id);

      const itemCount = cartItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;
      const subtotal = cartItems?.reduce((sum, item) => {
        return sum + (item.quantity * ((item.product as any)?.base_price || 0));
      }, 0) || 0;

      return {
        itemCount,
        subtotal,
        estimatedTotal: Math.round(subtotal * 1.08 * 100) / 100,
      };
    },
  }),

  // ─────────────────────────────────────────────────────────────────
  // WRITE TOOLS
  // ─────────────────────────────────────────────────────────────────

  addToCart: tool({
    description: 'Add a product to cart',
    parameters: z.object({
      productId: z.string().optional(),
      sku: z.string().optional(),
      quantity: z.number().positive().default(1),
    }),
    execute: async ({ productId, sku, quantity }) => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      // Get product ID if SKU provided
      let resolvedProductId = productId;
      if (!resolvedProductId && sku) {
        const { data: product } = await supabase
          .from('products')
          .select('id')
          .eq('sku', sku)
          .single();
        resolvedProductId = product?.id;
      }

      if (!resolvedProductId) throw new Error('Product not found');

      // Check if already in cart
      const { data: existingItem } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('product_id', resolvedProductId)
        .single();

      if (existingItem) {
        // Update quantity
        await supabase
          .from('cart_items')
          .update({ quantity: existingItem.quantity + quantity })
          .eq('id', existingItem.id);

        return {
          action: 'updated',
          productId: resolvedProductId,
          newQuantity: existingItem.quantity + quantity,
        };
      } else {
        // Add new item
        await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            product_id: resolvedProductId,
            quantity,
          });

        return {
          action: 'added',
          productId: resolvedProductId,
          quantity,
        };
      }
    },
  }),

  updateCartQuantity: tool({
    description: 'Update quantity of a cart item',
    parameters: z.object({
      cartItemId: z.string().optional(),
      productId: z.string().optional(),
      quantity: z.number().positive(),
    }),
    execute: async ({ cartItemId, productId, quantity }) => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      let queryBuilder = supabase
        .from('cart_items')
        .update({ quantity })
        .eq('user_id', user.id);

      if (cartItemId) {
        queryBuilder = queryBuilder.eq('id', cartItemId);
      } else if (productId) {
        queryBuilder = queryBuilder.eq('product_id', productId);
      } else {
        throw new Error('Either cartItemId or productId is required');
      }

      const { error } = await queryBuilder;

      if (error) throw new Error(`Failed to update quantity: ${error.message}`);

      return {
        action: 'updated',
        newQuantity: quantity,
      };
    },
  }),

  removeFromCart: tool({
    description: 'Remove an item from cart',
    parameters: z.object({
      cartItemId: z.string().optional(),
      productId: z.string().optional(),
    }),
    execute: async ({ cartItemId, productId }) => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      let queryBuilder = supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);

      if (cartItemId) {
        queryBuilder = queryBuilder.eq('id', cartItemId);
      } else if (productId) {
        queryBuilder = queryBuilder.eq('product_id', productId);
      } else {
        throw new Error('Either cartItemId or productId is required');
      }

      const { error } = await queryBuilder;

      if (error) throw new Error(`Failed to remove item: ${error.message}`);

      return { action: 'removed' };
    },
  }),

  clearCart: tool({
    description: 'Clear all items from cart',
    parameters: z.object({
      confirm: z.boolean().describe('Must be true to clear'),
    }),
    execute: async ({ confirm }) => {
      if (!confirm) throw new Error('Confirmation required');

      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);

      if (error) throw new Error(`Failed to clear cart: ${error.message}`);

      return { action: 'cleared' };
    },
  }),

  applyPromoCode: tool({
    description: 'Apply a promotional code to cart',
    parameters: z.object({
      code: z.string(),
    }),
    execute: async ({ code }) => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      // Check if promo code exists and is valid
      const { data: promo } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .single();

      if (!promo) {
        return {
          success: false,
          message: 'Invalid or expired promo code',
        };
      }

      // Check expiration
      if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
        return {
          success: false,
          message: 'This promo code has expired',
        };
      }

      // Apply to user session or cart
      await supabase
        .from('cart_promos')
        .upsert({
          user_id: user.id,
          promo_code_id: promo.id,
        });

      return {
        success: true,
        code: promo.code,
        discount: promo.discount_percent
          ? `${promo.discount_percent}% off`
          : `$${promo.discount_amount} off`,
        message: 'Promo code applied successfully',
      };
    },
  }),

  removePromoCode: tool({
    description: 'Remove applied promotional code',
    parameters: z.object({}),
    execute: async () => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      await supabase
        .from('cart_promos')
        .delete()
        .eq('user_id', user.id);

      return { action: 'removed' };
    },
  }),

  saveCartAsQuote: tool({
    description: 'Save current cart as a quote for later',
    parameters: z.object({
      name: z.string().optional(),
      expiresInDays: z.number().default(30),
    }),
    execute: async ({ name, expiresInDays }) => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      // Get cart items
      const { data: cartItems } = await supabase
        .from('cart_items')
        .select('product_id, quantity, product:products(base_price)')
        .eq('user_id', user.id);

      if (!cartItems?.length) {
        throw new Error('Cart is empty');
      }

      const items = cartItems.map(item => ({
        productId: item.product_id,
        quantity: item.quantity,
        price: (item.product as any)?.base_price || 0,
      }));

      const total = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const { data: quote, error } = await supabase
        .from('saved_quotes')
        .insert({
          user_id: user.id,
          name: name || `Quote ${new Date().toLocaleDateString()}`,
          items,
          total,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw new Error(`Failed to save quote: ${error.message}`);

      return {
        quoteId: quote.id,
        name: quote.name,
        itemCount: items.length,
        total,
        expiresAt: quote.expires_at,
      };
    },
  }),
};

export type CartTools = typeof cartTools;
