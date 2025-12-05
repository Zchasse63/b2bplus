/**
 * Product Search & Catalog AI Tools
 *
 * Tools for AI-assisted product search, recommendations, and catalog operations.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const productTools = {
  // ─────────────────────────────────────────────────────────────────
  // SEARCH TOOLS
  // ─────────────────────────────────────────────────────────────────

  searchProducts: tool({
    description: 'Search products by name, SKU, category, or attributes',
    parameters: z.object({
      query: z.string().optional(),
      category: z.string().optional(),
      minPrice: z.number().optional(),
      maxPrice: z.number().optional(),
      inStock: z.boolean().optional(),
      brand: z.string().optional(),
      sortBy: z.enum(['relevance', 'price_asc', 'price_desc', 'name', 'popularity']).default('relevance'),
      limit: z.number().default(20),
    }),
    execute: async ({ query, category, minPrice, maxPrice, inStock, brand, sortBy, limit }) => {
      const supabase = await createClient();

      let queryBuilder = supabase
        .from('products')
        .select('*, category:categories(name)')
        .limit(limit);

      if (query) {
        queryBuilder = queryBuilder.or(`name.ilike.%${query}%,sku.ilike.%${query}%,description.ilike.%${query}%`);
      }

      if (category) {
        queryBuilder = queryBuilder.eq('category_id', category);
      }

      if (minPrice !== undefined) {
        queryBuilder = queryBuilder.gte('base_price', minPrice);
      }

      if (maxPrice !== undefined) {
        queryBuilder = queryBuilder.lte('base_price', maxPrice);
      }

      if (inStock) {
        queryBuilder = queryBuilder.gt('inventory_count', 0);
      }

      if (brand) {
        queryBuilder = queryBuilder.eq('brand', brand);
      }

      // Apply sorting
      switch (sortBy) {
        case 'price_asc':
          queryBuilder = queryBuilder.order('base_price', { ascending: true });
          break;
        case 'price_desc':
          queryBuilder = queryBuilder.order('base_price', { ascending: false });
          break;
        case 'name':
          queryBuilder = queryBuilder.order('name', { ascending: true });
          break;
        default:
          queryBuilder = queryBuilder.order('created_at', { ascending: false });
      }

      const { data: products, error } = await queryBuilder;

      if (error) throw new Error(`Failed to search products: ${error.message}`);

      return {
        products: products || [],
        count: products?.length || 0,
      };
    },
  }),

  getProductDetails: tool({
    description: 'Get complete product information including pricing, inventory, and specs',
    parameters: z.object({
      productId: z.string().optional(),
      sku: z.string().optional(),
    }),
    execute: async ({ productId, sku }) => {
      const supabase = await createClient();

      let queryBuilder = supabase
        .from('products')
        .select(`
          *,
          category:categories(*),
          images:product_images(*),
          specs:product_specs(*)
        `);

      if (productId) {
        queryBuilder = queryBuilder.eq('id', productId);
      } else if (sku) {
        queryBuilder = queryBuilder.eq('sku', sku);
      } else {
        throw new Error('Either productId or sku is required');
      }

      const { data: product, error } = await queryBuilder.single();

      if (error) throw new Error(`Product not found: ${error.message}`);

      return { product };
    },
  }),

  getProductAvailability: tool({
    description: 'Check real-time inventory and availability for a product',
    parameters: z.object({
      productId: z.string(),
      quantity: z.number().optional().default(1),
    }),
    execute: async ({ productId, quantity }) => {
      const supabase = await createClient();

      const { data: product, error } = await supabase
        .from('products')
        .select('id, name, sku, inventory_count, lead_time_days')
        .eq('id', productId)
        .single();

      if (error) throw new Error(`Product not found: ${error.message}`);

      const available = (product.inventory_count ?? 0) >= quantity;
      const inStock = (product.inventory_count ?? 0) > 0;

      return {
        productId,
        sku: product.sku,
        requestedQuantity: quantity,
        availableQuantity: product.inventory_count ?? 0,
        inStock,
        available,
        leadTimeDays: product.lead_time_days || null,
        message: available
          ? 'In stock and available'
          : inStock
            ? `Only ${product.inventory_count} available`
            : `Out of stock. Lead time: ${product.lead_time_days || 'Unknown'} days`,
      };
    },
  }),

  compareProducts: tool({
    description: 'Compare multiple products side-by-side',
    parameters: z.object({
      productIds: z.array(z.string()).min(2).max(5),
    }),
    execute: async ({ productIds }) => {
      const supabase = await createClient();

      const { data: products, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(name),
          specs:product_specs(*)
        `)
        .in('id', productIds);

      if (error) throw new Error(`Failed to get products: ${error.message}`);

      // Build comparison matrix
      const allSpecs = new Set<string>();
      products?.forEach(p => {
        (p.specs as any[])?.forEach(s => allSpecs.add(s.name));
      });

      const comparison = {
        products: products?.map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          price: p.base_price,
          category: (p.category as any)?.name,
          inStock: (p.inventory_count ?? 0) > 0,
        })),
        specs: Array.from(allSpecs).map(specName => ({
          name: specName,
          values: products?.map(p => {
            const spec = (p.specs as any[])?.find(s => s.name === specName);
            return spec?.value || 'N/A';
          }),
        })),
      };

      return comparison;
    },
  }),

  getRelatedProducts: tool({
    description: 'Get related, alternative, or complementary products',
    parameters: z.object({
      productId: z.string(),
      type: z.enum(['similar', 'complementary', 'frequently_bought_together', 'alternatives']),
      limit: z.number().default(5),
    }),
    execute: async ({ productId, type, limit }) => {
      const supabase = await createClient();

      // Get the source product
      const { data: product } = await supabase
        .from('products')
        .select('category_id, brand, base_price')
        .eq('id', productId)
        .single();

      if (!product) throw new Error('Product not found');

      let queryBuilder = supabase
        .from('products')
        .select('*')
        .neq('id', productId)
        .limit(limit);

      switch (type) {
        case 'similar':
          queryBuilder = queryBuilder.eq('category_id', product.category_id);
          break;
        case 'alternatives':
          queryBuilder = queryBuilder
            .eq('category_id', product.category_id)
            .gte('base_price', product.base_price * 0.8)
            .lte('base_price', product.base_price * 1.2);
          break;
        case 'complementary':
          // Get from related products table or same category
          queryBuilder = queryBuilder.neq('category_id', product.category_id);
          break;
        case 'frequently_bought_together':
          // Would query order_items for co-purchased products
          queryBuilder = queryBuilder.eq('category_id', product.category_id);
          break;
      }

      const { data: products, error } = await queryBuilder;

      if (error) throw new Error(`Failed to get related products: ${error.message}`);

      return {
        type,
        products: products || [],
      };
    },
  }),

  // ─────────────────────────────────────────────────────────────────
  // CATEGORY TOOLS
  // ─────────────────────────────────────────────────────────────────

  browseCategories: tool({
    description: 'Browse product category hierarchy',
    parameters: z.object({
      parentCategoryId: z.string().optional().describe('Null for root categories'),
    }),
    execute: async ({ parentCategoryId }) => {
      const supabase = await createClient();

      let queryBuilder = supabase
        .from('categories')
        .select('*, products(count)')
        .order('name');

      if (parentCategoryId) {
        queryBuilder = queryBuilder.eq('parent_id', parentCategoryId);
      } else {
        queryBuilder = queryBuilder.is('parent_id', null);
      }

      const { data: categories, error } = await queryBuilder;

      if (error) throw new Error(`Failed to get categories: ${error.message}`);

      return {
        categories: categories || [],
        parentId: parentCategoryId || null,
      };
    },
  }),

  // ─────────────────────────────────────────────────────────────────
  // PRICING TOOLS
  // ─────────────────────────────────────────────────────────────────

  getCustomerPricing: tool({
    description: 'Get customer-specific pricing for products',
    parameters: z.object({
      productIds: z.array(z.string()),
      quantity: z.number().optional().default(1),
    }),
    execute: async ({ productIds, quantity }) => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      // Get base prices
      const { data: products } = await supabase
        .from('products')
        .select('id, name, sku, base_price')
        .in('id', productIds);

      if (!products) return { pricing: [] };

      // Get customer pricing tier if authenticated
      let tierMultiplier = 1;
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('pricing_tier')
          .eq('id', user.id)
          .single();

        // Apply tier discount
        switch (profile?.pricing_tier) {
          case 'gold': tierMultiplier = 0.9; break;
          case 'platinum': tierMultiplier = 0.85; break;
          case 'enterprise': tierMultiplier = 0.8; break;
        }
      }

      // Apply quantity discounts
      let quantityMultiplier = 1;
      if (quantity >= 100) quantityMultiplier = 0.9;
      else if (quantity >= 50) quantityMultiplier = 0.95;
      else if (quantity >= 25) quantityMultiplier = 0.98;

      const pricing = products.map(p => ({
        productId: p.id,
        sku: p.sku,
        name: p.name,
        basePrice: p.base_price,
        customerPrice: Math.round(p.base_price * tierMultiplier * quantityMultiplier * 100) / 100,
        quantity,
        extendedPrice: Math.round(p.base_price * tierMultiplier * quantityMultiplier * quantity * 100) / 100,
      }));

      return { pricing };
    },
  }),

  requestQuote: tool({
    description: 'Request a custom quote for products',
    parameters: z.object({
      items: z.array(z.object({
        productId: z.string(),
        quantity: z.number(),
      })),
      notes: z.string().optional(),
    }),
    execute: async ({ items, notes }) => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const { data: quote, error } = await supabase
        .from('quotes')
        .insert({
          user_id: user.id,
          status: 'pending',
          notes,
          items: items,
        })
        .select()
        .single();

      if (error) throw new Error(`Failed to create quote: ${error.message}`);

      return {
        quoteId: quote.id,
        status: 'pending',
        message: 'Quote request submitted. You will be contacted within 24 hours.',
      };
    },
  }),
};

export type ProductTools = typeof productTools;
