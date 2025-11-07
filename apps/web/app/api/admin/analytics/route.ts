import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { checkAdminRole } from "@/lib/middleware/admin";
import { logger } from "@/lib/logger";
import { handleAPIError } from "@/lib/error-monitoring";
import { safeAdd, safeDivide, safeParseFloat, safeParseInt } from "@/lib/math-safe";
import { deduplicate } from "@/lib/request-dedup";
import { cache } from "@/lib/cache";

export async function GET(request: Request): Promise<NextResponse> {
  let authCheck: { authorized: boolean; error?: string; status?: number; user?: { id: string } } | undefined;

  try {
    // SECURITY FIX: Use standard admin authorization check
    // Previous code checked organization_members table which was wrong
    authCheck = await checkAdminRole();
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "overview";
    const days = parseInt(searchParams.get("days") || "30");

    // Fetch analytics based on type
    switch (type) {
      case "overview":
        return await getOverviewAnalytics(supabase, days);
      case "sales":
        return await getSalesAnalytics(supabase, days);
      case "customers":
        return await getCustomerAnalytics(supabase);
      case "products":
        return await getProductAnalytics(supabase);
      case "categories":
        return await getCategoryAnalytics(supabase);
      default:
        return NextResponse.json({ error: "Invalid analytics type" }, { status: 400 });
    }
  } catch (error: unknown) {
    logger.error("Analytics error:", error);

    const errorResponse = handleAPIError(error, {
      operation: 'fetch-analytics',
      userId: authCheck?.user?.id,
    });

    // Production: Generic message, Development: Detailed error
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'An error occurred. Please try again later.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: errorResponse.message, details: errorResponse.details },
      { status: 500 }
    );
  }
}

async function getOverviewAnalytics(supabase: { from: (table: string) => any; auth?: any; rpc?: (fn: string, params?: any) => any }, days: number): Promise<NextResponse> {
  const cacheKey = `analytics:overview:${days}`;

  const result = await deduplicate(
    cacheKey,
    async () => {
      // Check cache first
      const cached = cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      // Get revenue trends
      const { data: revenueTrends, error: trendsError } = await supabase.rpc(
        "get_revenue_trends",
        { days_back: days }
      );

      if (trendsError) throw trendsError;

      // Get order status distribution
      const { data: statusDist, error: statusError } = await supabase
        .from("order_status_distribution")
        .select("*");

      if (statusError) throw statusError;

      // Calculate totals using safe math operations
      const totalRevenue = revenueTrends?.reduce((sum: number, day: any) => safeAdd(sum, safeParseFloat(day.revenue || 0)), 0) || 0;
      const totalOrders = revenueTrends?.reduce((sum: number, day: any) => safeAdd(sum, safeParseInt(day.order_count || 0)), 0) || 0;
      const avgOrderValue = safeDivide(totalRevenue, totalOrders, 0);

      // Get top products (limit 5)
      const { data: topProducts, error: productsError } = await supabase
        .from("top_products")
        .select("*")
        .limit(5);

      if (productsError) throw productsError;

      // Get top customers (limit 5)
      const { data: topCustomers, error: customersError } = await supabase
        .from("top_customers")
        .select("*")
        .limit(5);

      if (customersError) throw customersError;

      const analyticsData = {
        overview: {
          total_revenue: totalRevenue,
          total_orders: totalOrders,
          avg_order_value: avgOrderValue,
          revenue_trends: revenueTrends,
          order_status_distribution: statusDist,
        },
        top_products: topProducts,
        top_customers: topCustomers,
      };

      // Cache for 5 minutes (300 seconds)
      cache.set(cacheKey, analyticsData, 300);
      return analyticsData;
    }
  );

  return NextResponse.json(result);
}

async function getSalesAnalytics(supabase: { from: (table: string) => any; auth?: any; rpc?: (fn: string, params?: any) => any }, days: number): Promise<NextResponse> {
  const cacheKey = `analytics:sales:${days}`;

  const result = await deduplicate(
    cacheKey,
    async () => {
      const cached = cache.get(cacheKey);
      if (cached) return cached;

      // Get revenue trends
      const { data: revenueTrends, error: trendsError } = await supabase.rpc(
        "get_revenue_trends",
        { days_back: days }
      );

      if (trendsError) throw trendsError;

      // Get sales by category
      const { data: categoryPerf, error: categoryError } = await supabase
        .from("category_performance")
        .select("*");

      if (categoryError) throw categoryError;

      const salesData = {
        revenue_trends: revenueTrends,
        category_performance: categoryPerf,
      };

      cache.set(cacheKey, salesData, 300);
      return salesData;
    }
  );

  return NextResponse.json(result);
}

async function getCustomerAnalytics(supabase: { from: (table: string) => any; auth?: any; rpc?: (fn: string, params?: any) => any }): Promise<NextResponse> {
  const cacheKey = `analytics:customers`;

  const result = await deduplicate(
    cacheKey,
    async () => {
      const cached = cache.get(cacheKey);
      if (cached) return cached;

      const { data: topCustomers, error } = await supabase
        .from("top_customers")
        .select("*")
        .limit(20);

      if (error) throw error;

      // Calculate customer metrics using safe math operations
      const totalCustomers = topCustomers?.length || 0;
      const activeCustomers = topCustomers?.filter((c: any) => c.order_count > 0).length || 0;
      const totalSpent = topCustomers?.reduce((sum: number, c: any) => safeAdd(sum, safeParseFloat(c.total_spent || 0)), 0) || 0;
      const totalOrderCount = topCustomers?.reduce((sum: number, c: any) => safeAdd(sum, safeParseInt(c.order_count || 0)), 0) || 0;
      const avgLifetimeValue = safeDivide(totalSpent, totalCustomers, 0);
      const avgOrdersPerCustomer = safeDivide(totalOrderCount, totalCustomers, 0);

      const customerData = {
        metrics: {
          total_customers: totalCustomers,
          active_customers: activeCustomers,
          avg_lifetime_value: avgLifetimeValue,
          avg_orders_per_customer: avgOrdersPerCustomer,
        },
        top_customers: topCustomers,
      };

      cache.set(cacheKey, customerData, 300);
      return customerData;
    }
  );

  return NextResponse.json(result);
}

async function getProductAnalytics(supabase: { from: (table: string) => any; auth?: any; rpc?: (fn: string, params?: any) => any }): Promise<NextResponse> {
  const { data: topProducts, error } = await supabase
    .from("top_products")
    .select("*")
    .limit(20);

  if (error) throw error;

  // Calculate product metrics using safe math operations
  const totalProducts = topProducts?.length || 0;
  const productsWithSales = topProducts?.filter((p: any) => p.order_count > 0).length || 0;
  const totalProductRevenue = topProducts?.reduce((sum: number, p: any) => safeAdd(sum, safeParseFloat(p.total_revenue || 0)), 0) || 0;
  const avgRevenuePerProduct = safeDivide(totalProductRevenue, totalProducts, 0);

  return NextResponse.json({
    metrics: {
      total_products: totalProducts,
      products_with_sales: productsWithSales,
      avg_revenue_per_product: avgRevenuePerProduct,
    },
    top_products: topProducts,
  });
}

async function getCategoryAnalytics(supabase: { from: (table: string) => any; auth?: any; rpc?: (fn: string, params?: any) => any }): Promise<NextResponse> {
  const { data: categoryPerf, error } = await supabase
    .from("category_performance")
    .select("*");

  if (error) throw error;

  return NextResponse.json({
    categories: categoryPerf,
  });
}
