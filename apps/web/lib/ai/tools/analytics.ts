/**
 * Analytics AI Tools (Admin Only)
 *
 * Tools for AI-assisted business analytics and insights.
 * Uses Grok 4.1 Fast Reasoning for complex analysis.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { generateStructuredObject } from '../providers/unified';
import {
  revenueMetricsSchema,
  customerInsightsSchema,
  executiveSummarySchema,
} from '../schemas/analytics';

export const analyticsTools = {
  // ─────────────────────────────────────────────────────────────────
  // REVENUE & SALES ANALYTICS
  // ─────────────────────────────────────────────────────────────────

  getRevenueMetrics: tool({
    description: 'Get revenue metrics for a time period',
    parameters: z.object({
      startDate: z.string().describe('ISO date'),
      endDate: z.string().describe('ISO date'),
      groupBy: z.enum(['day', 'week', 'month']).default('month'),
    }),
    execute: async ({ startDate, endDate, groupBy }) => {
      const supabase = await createClient();

      // Verify admin access
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

      // Get orders in date range
      const { data: orders } = await supabase
        .from('orders')
        .select('id, created_at, total, status')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .eq('status', 'completed');

      // Get order items for product breakdown
      const orderIds = orders?.map(o => o.id) || [];
      const { data: orderItems } = await supabase
        .from('order_items')
        .select(`
          quantity,
          unit_price,
          product:products(id, name, category_id, category:categories(name))
        `)
        .in('order_id', orderIds);

      // Calculate metrics
      const totalRevenue = orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
      const orderCount = orders?.length || 0;
      const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

      // Group revenue by period
      const revenueByPeriod: Record<string, number> = {};
      orders?.forEach(order => {
        const date = new Date(order.created_at);
        let key: string;
        if (groupBy === 'day') {
          key = date.toISOString().split('T')[0];
        } else if (groupBy === 'week') {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
        } else {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }
        revenueByPeriod[key] = (revenueByPeriod[key] || 0) + (order.total || 0);
      });

      // Top products by revenue
      const productRevenue: Record<string, { name: string; revenue: number; units: number }> = {};
      orderItems?.forEach(item => {
        const product = item.product as any;
        if (product?.id) {
          if (!productRevenue[product.id]) {
            productRevenue[product.id] = { name: product.name, revenue: 0, units: 0 };
          }
          productRevenue[product.id].revenue += item.quantity * item.unit_price;
          productRevenue[product.id].units += item.quantity;
        }
      });

      const topProducts = Object.entries(productRevenue)
        .map(([id, data]) => ({ productId: id, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Category breakdown
      const categoryRevenue: Record<string, number> = {};
      orderItems?.forEach(item => {
        const product = item.product as any;
        const categoryName = product?.category?.name || 'Uncategorized';
        categoryRevenue[categoryName] = (categoryRevenue[categoryName] || 0) + item.quantity * item.unit_price;
      });

      return {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        orderCount,
        avgOrderValue: Math.round(avgOrderValue * 100) / 100,
        revenueByPeriod,
        topProducts,
        categoryBreakdown: categoryRevenue,
        period: { startDate, endDate, groupBy },
      };
    },
  }),

  getSalesTrends: tool({
    description: 'Analyze sales trends and patterns',
    parameters: z.object({
      months: z.number().default(6).describe('Number of months to analyze'),
    }),
    execute: async ({ months }) => {
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

      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const { data: orders } = await supabase
        .from('orders')
        .select('created_at, total, status')
        .gte('created_at', startDate.toISOString())
        .eq('status', 'completed');

      // Group by month
      const monthlyData: Record<string, { revenue: number; orders: number }> = {};
      orders?.forEach(order => {
        const month = order.created_at.substring(0, 7);
        if (!monthlyData[month]) {
          monthlyData[month] = { revenue: 0, orders: 0 };
        }
        monthlyData[month].revenue += order.total || 0;
        monthlyData[month].orders += 1;
      });

      // Calculate trends
      const sortedMonths = Object.keys(monthlyData).sort();
      const trends = sortedMonths.map((month, index) => {
        const current = monthlyData[month];
        const previous = index > 0 ? monthlyData[sortedMonths[index - 1]] : null;
        const revenueGrowth = previous
          ? ((current.revenue - previous.revenue) / previous.revenue) * 100
          : 0;

        return {
          month,
          revenue: Math.round(current.revenue * 100) / 100,
          orders: current.orders,
          revenueGrowth: Math.round(revenueGrowth * 10) / 10,
        };
      });

      // Calculate overall trend
      const firstMonth = monthlyData[sortedMonths[0]];
      const lastMonth = monthlyData[sortedMonths[sortedMonths.length - 1]];
      const overallGrowth = firstMonth && lastMonth
        ? ((lastMonth.revenue - firstMonth.revenue) / firstMonth.revenue) * 100
        : 0;

      return {
        trends,
        overallGrowth: Math.round(overallGrowth * 10) / 10,
        averageMonthlyRevenue: Math.round(
          (trends.reduce((sum, t) => sum + t.revenue, 0) / trends.length) * 100
        ) / 100,
        averageMonthlyOrders: Math.round(
          trends.reduce((sum, t) => sum + t.orders, 0) / trends.length
        ),
      };
    },
  }),

  // ─────────────────────────────────────────────────────────────────
  // CUSTOMER ANALYTICS
  // ─────────────────────────────────────────────────────────────────

  getCustomerInsights: tool({
    description: 'Get AI-powered customer insights and patterns',
    parameters: z.object({
      customerId: z.string().optional(),
      segment: z.enum(['all', 'high_value', 'at_risk', 'new', 'churned']).default('all'),
    }),
    execute: async ({ customerId, segment }) => {
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

      // Build customer query
      let customerQuery = supabase
        .from('profiles')
        .select('id, full_name, email, company, created_at')
        .eq('role', 'customer');

      if (customerId) {
        customerQuery = customerQuery.eq('id', customerId);
      }

      const { data: customers } = await customerQuery.limit(100);

      if (!customers?.length) {
        return { customers: [], summary: 'No customers found' };
      }

      // Get order data for each customer
      const customerIds = customers.map(c => c.id);
      const { data: orders } = await supabase
        .from('orders')
        .select('user_id, total, created_at, status')
        .in('user_id', customerIds);

      // Calculate customer metrics
      const customerMetrics = customers.map(customer => {
        const customerOrders = orders?.filter(o => o.user_id === customer.id) || [];
        const completedOrders = customerOrders.filter(o => o.status === 'completed');
        const totalSpent = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        const orderCount = completedOrders.length;
        const lastOrderDate = customerOrders.length > 0
          ? new Date(Math.max(...customerOrders.map(o => new Date(o.created_at).getTime())))
          : null;
        const daysSinceLastOrder = lastOrderDate
          ? Math.floor((Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
          : null;

        // Customer lifetime (days since signup)
        const customerAge = Math.floor(
          (Date.now() - new Date(customer.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        // Determine segment
        let customerSegment: string;
        if (customerAge <= 30 && orderCount <= 1) {
          customerSegment = 'new';
        } else if (daysSinceLastOrder && daysSinceLastOrder > 90) {
          customerSegment = orderCount >= 3 ? 'churned' : 'at_risk';
        } else if (totalSpent >= 10000 || orderCount >= 10) {
          customerSegment = 'high_value';
        } else {
          customerSegment = 'regular';
        }

        return {
          id: customer.id,
          name: customer.full_name,
          email: customer.email,
          company: customer.company,
          totalSpent: Math.round(totalSpent * 100) / 100,
          orderCount,
          avgOrderValue: orderCount > 0 ? Math.round((totalSpent / orderCount) * 100) / 100 : 0,
          daysSinceLastOrder,
          customerAge,
          segment: customerSegment,
        };
      });

      // Filter by segment
      let filteredCustomers = customerMetrics;
      if (segment !== 'all') {
        filteredCustomers = customerMetrics.filter(c => c.segment === segment);
      }

      // Sort by value
      filteredCustomers.sort((a, b) => b.totalSpent - a.totalSpent);

      // Summary stats
      const summary = {
        totalCustomers: filteredCustomers.length,
        totalRevenue: Math.round(filteredCustomers.reduce((sum, c) => sum + c.totalSpent, 0) * 100) / 100,
        avgLifetimeValue: Math.round(
          (filteredCustomers.reduce((sum, c) => sum + c.totalSpent, 0) / filteredCustomers.length) * 100
        ) / 100,
        segmentBreakdown: {
          high_value: customerMetrics.filter(c => c.segment === 'high_value').length,
          regular: customerMetrics.filter(c => c.segment === 'regular').length,
          new: customerMetrics.filter(c => c.segment === 'new').length,
          at_risk: customerMetrics.filter(c => c.segment === 'at_risk').length,
          churned: customerMetrics.filter(c => c.segment === 'churned').length,
        },
      };

      return {
        customers: filteredCustomers.slice(0, 50),
        summary,
      };
    },
  }),

  predictChurnRisk: tool({
    description: 'Predict which customers are at risk of churning',
    parameters: z.object({
      limit: z.number().default(20),
    }),
    execute: async ({ limit }) => {
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

      // Get customers with order history
      const { data: customers } = await supabase
        .from('profiles')
        .select('id, full_name, email, company')
        .eq('role', 'customer');

      const { data: orders } = await supabase
        .from('orders')
        .select('user_id, total, created_at, status')
        .eq('status', 'completed');

      // Calculate churn risk score
      const atRiskCustomers = customers?.map(customer => {
        const customerOrders = orders?.filter(o => o.user_id === customer.id) || [];
        if (customerOrders.length === 0) return null;

        const orderDates = customerOrders.map(o => new Date(o.created_at).getTime()).sort();
        const lastOrderDate = new Date(Math.max(...orderDates));
        const daysSinceLastOrder = Math.floor((Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));

        // Calculate average order frequency
        let avgDaysBetweenOrders = 30;
        if (orderDates.length > 1) {
          const intervals = [];
          for (let i = 1; i < orderDates.length; i++) {
            intervals.push((orderDates[i] - orderDates[i - 1]) / (1000 * 60 * 60 * 24));
          }
          avgDaysBetweenOrders = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        }

        // Risk score: higher = more at risk
        const frequencyRatio = daysSinceLastOrder / avgDaysBetweenOrders;
        const riskScore = Math.min(100, Math.round(frequencyRatio * 30));

        const totalSpent = customerOrders.reduce((sum, o) => sum + (o.total || 0), 0);

        return {
          customerId: customer.id,
          name: customer.full_name,
          email: customer.email,
          company: customer.company,
          riskScore,
          daysSinceLastOrder,
          avgDaysBetweenOrders: Math.round(avgDaysBetweenOrders),
          totalOrders: customerOrders.length,
          totalSpent: Math.round(totalSpent * 100) / 100,
          riskLevel: riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'low',
        };
      }).filter(c => c !== null && c.riskScore >= 30);

      // Sort by risk score
      atRiskCustomers?.sort((a, b) => (b?.riskScore || 0) - (a?.riskScore || 0));

      return {
        atRiskCustomers: atRiskCustomers?.slice(0, limit) || [],
        summary: {
          highRisk: atRiskCustomers?.filter(c => c?.riskLevel === 'high').length || 0,
          mediumRisk: atRiskCustomers?.filter(c => c?.riskLevel === 'medium').length || 0,
          potentialRevenueLoss: Math.round(
            (atRiskCustomers?.reduce((sum, c) => sum + (c?.totalSpent || 0), 0) || 0) * 100
          ) / 100,
        },
      };
    },
  }),

  // ─────────────────────────────────────────────────────────────────
  // PRODUCT ANALYTICS
  // ─────────────────────────────────────────────────────────────────

  getProductPerformance: tool({
    description: 'Analyze product performance metrics',
    parameters: z.object({
      productId: z.string().optional(),
      categoryId: z.string().optional(),
      sortBy: z.enum(['revenue', 'units', 'margin']).default('revenue'),
      limit: z.number().default(20),
    }),
    execute: async ({ productId, categoryId, sortBy, limit }) => {
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

      // Get completed orders from last 90 days
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);

      const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .gte('created_at', startDate.toISOString())
        .eq('status', 'completed');

      const orderIds = orders?.map(o => o.id) || [];

      // Get order items
      let itemQuery = supabase
        .from('order_items')
        .select(`
          quantity,
          unit_price,
          product:products(id, name, sku, base_price, category_id)
        `)
        .in('order_id', orderIds);

      const { data: orderItems } = await itemQuery;

      // Aggregate by product
      const productStats: Record<string, {
        productId: string;
        name: string;
        sku: string;
        categoryId: string;
        revenue: number;
        units: number;
        orders: number;
        avgPrice: number;
        basePrice: number;
      }> = {};

      orderItems?.forEach(item => {
        const product = item.product as any;
        if (!product?.id) return;
        if (productId && product.id !== productId) return;
        if (categoryId && product.category_id !== categoryId) return;

        if (!productStats[product.id]) {
          productStats[product.id] = {
            productId: product.id,
            name: product.name,
            sku: product.sku,
            categoryId: product.category_id,
            revenue: 0,
            units: 0,
            orders: 0,
            avgPrice: 0,
            basePrice: product.base_price || 0,
          };
        }

        productStats[product.id].revenue += item.quantity * item.unit_price;
        productStats[product.id].units += item.quantity;
        productStats[product.id].orders += 1;
      });

      // Calculate averages and sort
      const products = Object.values(productStats).map(p => ({
        ...p,
        revenue: Math.round(p.revenue * 100) / 100,
        avgPrice: p.units > 0 ? Math.round((p.revenue / p.units) * 100) / 100 : 0,
        estimatedMargin: p.basePrice > 0
          ? Math.round(((p.avgPrice || p.revenue / p.units) - p.basePrice) / p.basePrice * 100)
          : null,
      }));

      products.sort((a, b) => {
        if (sortBy === 'revenue') return b.revenue - a.revenue;
        if (sortBy === 'units') return b.units - a.units;
        return (b.estimatedMargin || 0) - (a.estimatedMargin || 0);
      });

      return {
        products: products.slice(0, limit),
        summary: {
          totalProducts: products.length,
          totalRevenue: Math.round(products.reduce((sum, p) => sum + p.revenue, 0) * 100) / 100,
          totalUnits: products.reduce((sum, p) => sum + p.units, 0),
        },
      };
    },
  }),

  getInventoryAlerts: tool({
    description: 'Get low stock and inventory alerts',
    parameters: z.object({
      threshold: z.number().default(10).describe('Alert threshold for low stock'),
    }),
    execute: async ({ threshold }) => {
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

      // Get low stock products
      const { data: lowStock } = await supabase
        .from('products')
        .select('id, name, sku, inventory_count, is_active')
        .lte('inventory_count', threshold)
        .eq('is_active', true)
        .order('inventory_count', { ascending: true });

      // Get out of stock products
      const { data: outOfStock } = await supabase
        .from('products')
        .select('id, name, sku, inventory_count')
        .eq('inventory_count', 0)
        .eq('is_active', true);

      return {
        lowStock: lowStock?.map(p => ({
          productId: p.id,
          name: p.name,
          sku: p.sku,
          currentStock: p.inventory_count,
          status: p.inventory_count === 0 ? 'out_of_stock' : 'low_stock',
        })) || [],
        outOfStockCount: outOfStock?.length || 0,
        lowStockCount: (lowStock?.length || 0) - (outOfStock?.length || 0),
        threshold,
      };
    },
  }),

  // ─────────────────────────────────────────────────────────────────
  // EXECUTIVE DASHBOARD
  // ─────────────────────────────────────────────────────────────────

  getExecutiveSummary: tool({
    description: 'Get AI-generated executive summary of business performance',
    parameters: z.object({
      period: z.enum(['week', 'month', 'quarter']).default('month'),
    }),
    execute: async ({ period }) => {
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

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      if (period === 'week') {
        startDate.setDate(endDate.getDate() - 7);
      } else if (period === 'month') {
        startDate.setMonth(endDate.getMonth() - 1);
      } else {
        startDate.setMonth(endDate.getMonth() - 3);
      }

      // Previous period for comparison
      const prevEndDate = new Date(startDate);
      const prevStartDate = new Date(startDate);
      if (period === 'week') {
        prevStartDate.setDate(prevStartDate.getDate() - 7);
      } else if (period === 'month') {
        prevStartDate.setMonth(prevStartDate.getMonth() - 1);
      } else {
        prevStartDate.setMonth(prevStartDate.getMonth() - 3);
      }

      // Get current period orders
      const { data: currentOrders } = await supabase
        .from('orders')
        .select('total, status')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .eq('status', 'completed');

      // Get previous period orders
      const { data: prevOrders } = await supabase
        .from('orders')
        .select('total')
        .gte('created_at', prevStartDate.toISOString())
        .lte('created_at', prevEndDate.toISOString())
        .eq('status', 'completed');

      // Get new customers
      const { data: newCustomers } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'customer')
        .gte('created_at', startDate.toISOString());

      const currentRevenue = currentOrders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
      const prevRevenue = prevOrders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
      const revenueChange = prevRevenue > 0
        ? ((currentRevenue - prevRevenue) / prevRevenue) * 100
        : 0;

      return {
        period,
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
        },
        metrics: {
          revenue: Math.round(currentRevenue * 100) / 100,
          revenueChange: Math.round(revenueChange * 10) / 10,
          orders: currentOrders?.length || 0,
          newCustomers: newCustomers?.length || 0,
          avgOrderValue: currentOrders?.length
            ? Math.round((currentRevenue / currentOrders.length) * 100) / 100
            : 0,
        },
        comparison: {
          previousRevenue: Math.round(prevRevenue * 100) / 100,
          previousOrders: prevOrders?.length || 0,
        },
        trend: revenueChange > 5 ? 'up' : revenueChange < -5 ? 'down' : 'stable',
      };
    },
  }),
};

export type AnalyticsTools = typeof analyticsTools;
