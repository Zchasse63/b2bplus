import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logging/logger";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { handleError, AuthError, ForbiddenError, ValidationError } from "@/lib/middleware/error-handler";

const logger = createLogger('admin-analytics');

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, "admin");
    if (!allowed) return rateLimitResponse!;

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "overview";
    const days = parseInt(searchParams.get("days") || "30");

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new AuthError("Authentication required", "unauthorized");
    }

    // Check admin role
    const { data: memberData } = await supabase
      .from("organization_members")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!memberData || memberData.role !== "admin") {
      throw ForbiddenError.insufficientRole("admin");
    }

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
        throw new ValidationError("Invalid analytics type", { type: ["Invalid analytics type"] });
    }
  } catch (error) {
    return handleError(error);
  }
}

async function getOverviewAnalytics(supabase: any, days: number) {
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

  // Calculate totals
  const totalRevenue = revenueTrends?.reduce((sum: number, day: any) => sum + parseFloat(day.revenue || 0), 0) || 0;
  const totalOrders = revenueTrends?.reduce((sum: number, day: any) => sum + parseInt(day.order_count || 0), 0) || 0;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

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

  return NextResponse.json({
    overview: {
      total_revenue: totalRevenue,
      total_orders: totalOrders,
      avg_order_value: avgOrderValue,
      revenue_trends: revenueTrends,
      order_status_distribution: statusDist,
    },
    top_products: topProducts,
    top_customers: topCustomers,
  });
}

async function getSalesAnalytics(supabase: any, days: number) {
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

  return NextResponse.json({
    revenue_trends: revenueTrends,
    category_performance: categoryPerf,
  });
}

async function getCustomerAnalytics(supabase: any) {
  const { data: topCustomers, error } = await supabase
    .from("top_customers")
    .select("*")
    .limit(20);

  if (error) throw error;

  // Calculate customer metrics
  const totalCustomers = topCustomers?.length || 0;
  const activeCustomers = topCustomers?.filter((c: any) => c.order_count > 0).length || 0;
  const avgLifetimeValue = topCustomers?.reduce((sum: number, c: any) => sum + parseFloat(c.total_spent || 0), 0) / totalCustomers || 0;
  const avgOrdersPerCustomer = topCustomers?.reduce((sum: number, c: any) => sum + parseInt(c.order_count || 0), 0) / totalCustomers || 0;

  return NextResponse.json({
    metrics: {
      total_customers: totalCustomers,
      active_customers: activeCustomers,
      avg_lifetime_value: avgLifetimeValue,
      avg_orders_per_customer: avgOrdersPerCustomer,
    },
    top_customers: topCustomers,
  });
}

async function getProductAnalytics(supabase: any) {
  const { data: topProducts, error } = await supabase
    .from("top_products")
    .select("*")
    .limit(20);

  if (error) throw error;

  // Calculate product metrics
  const totalProducts = topProducts?.length || 0;
  const productsWithSales = topProducts?.filter((p: any) => p.order_count > 0).length || 0;
  const avgRevenuePerProduct = topProducts?.reduce((sum: number, p: any) => sum + parseFloat(p.total_revenue || 0), 0) / totalProducts || 0;

  return NextResponse.json({
    metrics: {
      total_products: totalProducts,
      products_with_sales: productsWithSales,
      avg_revenue_per_product: avgRevenuePerProduct,
    },
    top_products: topProducts,
  });
}

async function getCategoryAnalytics(supabase: any) {
  const { data: categoryPerf, error } = await supabase
    .from("category_performance")
    .select("*");

  if (error) throw error;

  return NextResponse.json({
    categories: categoryPerf,
  });
}
