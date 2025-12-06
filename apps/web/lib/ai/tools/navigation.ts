/**
 * Navigation & Context AI Tools
 *
 * Tools for AI-assisted navigation and context awareness.
 * These help the AI understand where the user is and what they're doing.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const navigationTools = {
  // ─────────────────────────────────────────────────────────────────
  // CONTEXT TOOLS
  // ─────────────────────────────────────────────────────────────────

  getCurrentContext: tool({
    description: 'Get current page context and user state',
    parameters: z.object({
      currentPath: z.string().describe('Current URL path'),
      pageData: z.record(z.any()).optional().describe('Current page data if available'),
    }),
    execute: async ({ currentPath, pageData }) => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      // Determine context from path
      let context: {
        section: string;
        subsection?: string;
        resourceId?: string;
        resourceType?: string;
      } = { section: 'unknown' };

      const pathParts = currentPath.split('/').filter(Boolean);

      if (pathParts[0] === 'admin') {
        context.section = 'admin';
        context.subsection = pathParts[1];
        if (pathParts[2]) {
          context.resourceId = pathParts[2];
          context.resourceType = pathParts[1]?.replace(/s$/, ''); // orders -> order
        }
      } else if (pathParts[0] === 'products') {
        context.section = 'products';
        if (pathParts[1]) {
          context.resourceId = pathParts[1];
          context.resourceType = 'product';
        }
      } else if (pathParts[0] === 'orders') {
        context.section = 'orders';
        if (pathParts[1]) {
          context.resourceId = pathParts[1];
          context.resourceType = 'order';
        }
      } else if (pathParts[0] === 'cart') {
        context.section = 'cart';
      } else if (pathParts[0] === 'checkout') {
        context.section = 'checkout';
      } else if (pathParts[0] === 'account' || pathParts[0] === 'profile') {
        context.section = 'account';
        context.subsection = pathParts[1];
      } else if (pathParts.length === 0 || pathParts[0] === 'dashboard') {
        context.section = 'dashboard';
      }

      // Get user context
      const userContext = user ? {
        isAuthenticated: true,
        userId: user.id,
      } : {
        isAuthenticated: false,
      };

      // Get role if authenticated
      let role = null;
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        role = profile?.role;
      }

      return {
        path: currentPath,
        context,
        user: {
          ...userContext,
          role,
        },
        pageData: pageData || null,
        suggestions: getSuggestions(context.section, role),
      };
    },
  }),

  getSuggestedActions: tool({
    description: 'Get AI-suggested actions based on current context',
    parameters: z.object({
      context: z.string().describe('Current context/section'),
      recentActions: z.array(z.string()).optional(),
    }),
    execute: async ({ context, recentActions }) => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return {
          suggestions: [
            { action: 'login', label: 'Sign in to your account' },
            { action: 'register', label: 'Create an account' },
            { action: 'browse', label: 'Browse products' },
          ],
        };
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const isAdmin = profile?.role === 'admin';

      // Context-aware suggestions
      const suggestions = getSuggestions(context, profile?.role, recentActions);

      return { suggestions };
    },
  }),

  // ─────────────────────────────────────────────────────────────────
  // NAVIGATION TOOLS
  // ─────────────────────────────────────────────────────────────────

  getNavigationLinks: tool({
    description: 'Get available navigation links for current user',
    parameters: z.object({}),
    execute: async () => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const publicLinks = [
        { path: '/products', label: 'Products', icon: 'package' },
        { path: '/categories', label: 'Categories', icon: 'grid' },
      ];

      if (!user) {
        return {
          links: [
            ...publicLinks,
            { path: '/login', label: 'Sign In', icon: 'log-in' },
            { path: '/register', label: 'Register', icon: 'user-plus' },
          ],
        };
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const customerLinks = [
        ...publicLinks,
        { path: '/cart', label: 'Cart', icon: 'shopping-cart' },
        { path: '/orders', label: 'Orders', icon: 'file-text' },
        { path: '/account', label: 'Account', icon: 'user' },
      ];

      if (profile?.role === 'admin') {
        return {
          links: [
            ...customerLinks,
            { path: '/admin', label: 'Admin Dashboard', icon: 'layout' },
            { path: '/admin/orders', label: 'Manage Orders', icon: 'clipboard' },
            { path: '/admin/products', label: 'Manage Products', icon: 'package' },
            { path: '/admin/customers', label: 'Customers', icon: 'users' },
            { path: '/admin/analytics', label: 'Analytics', icon: 'bar-chart' },
            { path: '/admin/campaigns', label: 'Campaigns', icon: 'send' },
          ],
        };
      }

      return { links: customerLinks };
    },
  }),

  search: tool({
    description: 'Global search across products, orders, and customers',
    parameters: z.object({
      query: z.string(),
      types: z.array(z.enum(['products', 'orders', 'customers'])).optional(),
      limit: z.number().default(10),
    }),
    execute: async ({ query, types, limit }) => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const isAdmin = profile?.role === 'admin';
      const searchTypes = types || ['products', 'orders'];
      const results: Record<string, any[]> = {};

      // Search products
      if (searchTypes.includes('products')) {
        const { data: products } = await supabase
          .from('products')
          .select('id, name, sku, base_price')
          .or(`name.ilike.%${query}%,sku.ilike.%${query}%,description.ilike.%${query}%`)
          .eq('is_active', true)
          .limit(limit);

        results.products = products?.map(p => ({
          type: 'product',
          id: p.id,
          title: p.name,
          subtitle: p.sku,
          meta: `$${p.base_price}`,
          path: `/products/${p.id}`,
        })) || [];
      }

      // Search orders
      if (searchTypes.includes('orders')) {
        let orderQuery = supabase
          .from('orders')
          .select('id, order_number, total, status, created_at')
          .or(`order_number.ilike.%${query}%`)
          .limit(limit);

        if (!isAdmin) {
          orderQuery = orderQuery.eq('user_id', user.id);
        }

        const { data: orders } = await orderQuery;

        results.orders = orders?.map(o => ({
          type: 'order',
          id: o.id,
          title: o.order_number,
          subtitle: o.status,
          meta: `$${o.total}`,
          path: isAdmin ? `/admin/orders/${o.id}` : `/orders/${o.id}`,
        })) || [];
      }

      // Search customers (admin only)
      if (isAdmin && searchTypes.includes('customers')) {
        const { data: customers } = await supabase
          .from('profiles')
          .select('id, full_name, email, company')
          .eq('role', 'customer')
          .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,company.ilike.%${query}%`)
          .limit(limit);

        results.customers = customers?.map(c => ({
          type: 'customer',
          id: c.id,
          title: c.full_name || c.email,
          subtitle: c.company,
          path: `/admin/customers/${c.id}`,
        })) || [];
      }

      const totalResults = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);

      return {
        query,
        results,
        totalResults,
      };
    },
  }),

  // ─────────────────────────────────────────────────────────────────
  // HELP TOOLS
  // ─────────────────────────────────────────────────────────────────

  getHelp: tool({
    description: 'Get help and documentation for a topic',
    parameters: z.object({
      topic: z.string().describe('Topic to get help on'),
    }),
    execute: async ({ topic }) => {
      // This would ideally integrate with a knowledge base
      // For now, return structured help topics
      const helpTopics: Record<string, any> = {
        orders: {
          title: 'Managing Orders',
          content: 'You can view your orders, track shipments, and reorder previous purchases.',
          actions: [
            { label: 'View Orders', path: '/orders' },
            { label: 'Track Shipment', action: 'trackOrder' },
          ],
        },
        products: {
          title: 'Finding Products',
          content: 'Search by name, SKU, or category. Use filters to narrow results.',
          actions: [
            { label: 'Browse Products', path: '/products' },
            { label: 'View Categories', path: '/categories' },
          ],
        },
        cart: {
          title: 'Shopping Cart',
          content: 'Add products, update quantities, and apply promo codes.',
          actions: [
            { label: 'View Cart', path: '/cart' },
            { label: 'Checkout', path: '/checkout' },
          ],
        },
        account: {
          title: 'Account Settings',
          content: 'Manage your profile, addresses, and notification preferences.',
          actions: [
            { label: 'Edit Profile', path: '/account' },
            { label: 'Manage Addresses', path: '/account/addresses' },
          ],
        },
        pricing: {
          title: 'Pricing & Quotes',
          content: 'View your customer-specific pricing and request quotes for bulk orders.',
          actions: [
            { label: 'Request Quote', action: 'requestQuote' },
          ],
        },
      };

      const normalizedTopic = topic.toLowerCase();
      const matchedTopic = Object.keys(helpTopics).find(
        key => normalizedTopic.includes(key) || key.includes(normalizedTopic)
      );

      if (matchedTopic) {
        return helpTopics[matchedTopic];
      }

      return {
        title: 'Help',
        content: `I can help you with orders, products, cart, account settings, and pricing. What would you like to know?`,
        suggestedTopics: Object.keys(helpTopics),
      };
    },
  }),

  reportIssue: tool({
    description: 'Report an issue or problem',
    parameters: z.object({
      type: z.enum(['bug', 'feedback', 'question', 'complaint']),
      description: z.string(),
      context: z.object({
        page: z.string().optional(),
        orderId: z.string().optional(),
        productId: z.string().optional(),
      }).optional(),
    }),
    execute: async ({ type, description, context }) => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const { data: ticket, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user?.id,
          type,
          description,
          context,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw new Error(`Failed to create ticket: ${error.message}`);

      return {
        success: true,
        ticketId: ticket.id,
        message: 'Thank you for your feedback. A support representative will review your issue shortly.',
      };
    },
  }),
};

// Helper function to generate context-aware suggestions
function getSuggestions(
  section: string,
  role?: string | null,
  recentActions?: string[]
): Array<{ action: string; label: string; priority?: number }> {
  const isAdmin = role === 'admin';

  const suggestions: Array<{ action: string; label: string; priority?: number }> = [];

  switch (section) {
    case 'dashboard':
      suggestions.push(
        { action: 'searchProducts', label: 'Search for products', priority: 1 },
        { action: 'viewOrders', label: 'View recent orders', priority: 2 },
        { action: 'viewCart', label: 'Check your cart', priority: 3 }
      );
      if (isAdmin) {
        suggestions.push(
          { action: 'viewAnalytics', label: 'View sales analytics', priority: 1 },
          { action: 'viewPendingOrders', label: 'Check pending orders', priority: 2 }
        );
      }
      break;

    case 'products':
      suggestions.push(
        { action: 'addToCart', label: 'Add to cart', priority: 1 },
        { action: 'compareProducts', label: 'Compare products', priority: 2 },
        { action: 'requestQuote', label: 'Request quote', priority: 3 }
      );
      if (isAdmin) {
        suggestions.push(
          { action: 'editProduct', label: 'Edit product', priority: 1 },
          { action: 'adjustInventory', label: 'Adjust inventory', priority: 2 }
        );
      }
      break;

    case 'cart':
      suggestions.push(
        { action: 'checkout', label: 'Proceed to checkout', priority: 1 },
        { action: 'applyPromo', label: 'Apply promo code', priority: 2 },
        { action: 'saveQuote', label: 'Save as quote', priority: 3 }
      );
      break;

    case 'orders':
      suggestions.push(
        { action: 'trackOrder', label: 'Track shipment', priority: 1 },
        { action: 'reorder', label: 'Reorder items', priority: 2 },
        { action: 'downloadInvoice', label: 'Download invoice', priority: 3 }
      );
      if (isAdmin) {
        suggestions.push(
          { action: 'updateStatus', label: 'Update order status', priority: 1 },
          { action: 'createShipment', label: 'Create shipment', priority: 2 }
        );
      }
      break;

    case 'admin':
      suggestions.push(
        { action: 'viewDashboard', label: 'View dashboard', priority: 1 },
        { action: 'processOrders', label: 'Process orders', priority: 2 },
        { action: 'viewReports', label: 'Generate reports', priority: 3 }
      );
      break;

    default:
      suggestions.push(
        { action: 'searchProducts', label: 'Search products', priority: 1 },
        { action: 'getHelp', label: 'Get help', priority: 2 }
      );
  }

  return suggestions.sort((a, b) => (a.priority || 99) - (b.priority || 99));
}

export type NavigationTools = typeof navigationTools;
