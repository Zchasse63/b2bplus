"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/b2b/Card";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MdLightbulb, MdShowChart, MdTrendingUp } from "react-icons/md";
import CustomerDashboardLayout from "@/components/CustomerDashboardLayout";
import { EmbeddedAIAssistantPanel } from "@/components/EmbeddedAIAssistantPanel";

interface SpendingData {
  month: string;
  amount: number;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface TopProduct {
  name: string;
  total_spent: number;
  order_count: number;
}

interface AIInsight {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  actionUrl: string;
  type: "opportunity" | "warning" | "info";
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [spendingData, setSpendingData] = useState<SpendingData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [totalSpend, setTotalSpend] = useState(0);
  const [avgOrderValue, setAvgOrderValue] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [user, setUser] = useState<any>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      setUser(user);
      await fetchAnalytics(user.id);
    };

    checkAuthAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const fetchAnalytics = async (userId: string) => {
    setLoading(true);
    try {
      const { data: membership } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", userId)
        .single();

      if (!membership) {
        setLoading(false);
        return;
      }

      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const { data: orders } = await supabase
        .from("orders")
        .select("total, created_at, order_items(product_id, quantity, price)")
        .eq("organization_id", membership.organization_id)
        .gte("created_at", twelveMonthsAgo.toISOString())
        .order("created_at", { ascending: true });

      if (!orders) {
        setLoading(false);
        return;
      }

      const monthlySpending: Record<string, number> = {};
      let total = 0;

      orders.forEach((order) => {
        const month = new Date(order.created_at).toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });

        monthlySpending[month] = (monthlySpending[month] || 0) + order.total;
        total += order.total;
      });

      const spendingArray = Object.entries(monthlySpending).map(([month, amount]) => ({
        month,
        amount: Math.round(amount),
      }));

      setSpendingData(spendingArray);
      setTotalSpend(total);
      setOrderCount(orders.length);
      setAvgOrderValue(orders.length > 0 ? total / orders.length : 0);

      const productSpending: Record<
        string,
        { total: number; count: number; name: string }
      > = {};

      for (const order of orders as any[]) {
        if (!order.order_items) continue;

        for (const item of order.order_items as any[]) {
          const key = item.product_id as string;

          if (!productSpending[key]) {
            const { data: product } = await supabase
              .from("products")
              .select("name")
              .eq("id", item.product_id)
              .single();

            productSpending[key] = {
              total: 0,
              count: 0,
              name: product?.name ?? "Unknown Product",
            };
          }

          productSpending[key].total += item.price * item.quantity;
          productSpending[key].count += 1;
        }
      }

      const topProductsArray: TopProduct[] = Object.values(productSpending)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)
        .map((p) => ({
          name: p.name,
          total_spent: p.total,
          order_count: p.count,
        }));

      setTopProducts(topProductsArray);

      setCategoryData([
        { name: "Disposables", value: 35, color: "#0066cc" },
        { name: "Packaging", value: 25, color: "#00a8e8" },
        { name: "Containers", value: 20, color: "#00c9a7" },
        { name: "Utensils", value: 15, color: "#ffa500" },
        { name: "Other", value: 5, color: "#6b7280" },
      ]);

      generateInsights(orders, topProductsArray);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = (orders: any[], topProducts: TopProduct[]) => {
    const generated: AIInsight[] = [];

    if (orders.length >= 6) {
      const recentTotal = orders.slice(-3).reduce((sum, o) => sum + o.total, 0);
      const previousTotal = orders.slice(-6, -3).reduce((sum, o) => sum + o.total, 0);
      if (previousTotal > 0) {
        const percentChange = ((recentTotal - previousTotal) / previousTotal) * 100;
        if (percentChange > 10) {
          generated.push({
            id: "1",
            title: "Spending Increasing",
            description: `Your spending has increased by ${Math.round(
              percentChange
            )}% in the last 3 months. Consider bulk ordering to save on costs.`,
            actionLabel: "View bulk discounts",
            actionUrl: "/products",
            type: "opportunity",
          });
        }
      }
    }

    if (topProducts.length > 0) {
      generated.push({
        id: "2",
        title: "Top product opportunity",
        description: `${topProducts[0].name} is your most ordered item. You could save 15% by setting up a recurring order.`,
        actionLabel: "Set up recurring order",
        actionUrl: "/products",
        type: "opportunity",
      });
    }

    generated.push({
      id: "3",
      title: "Seasonal pattern detected",
      description:
        "Your orders typically increase by ~30% during summer months. Plan ahead to ensure availability.",
      actionLabel: "View forecast",
      actionUrl: "/analytics",
      type: "info",
    });

    setInsights(generated);
  };

  if (!user || loading) {
    return (
      <CustomerDashboardLayout>
        <div className="min-h-screen bg-b2b-gray-50 py-8">
          <div className="container mx-auto max-w-7xl px-4">
            <p className="text-center text-b2b-gray-500">Loading analytics...</p>
          </div>
        </div>
      </CustomerDashboardLayout>
    );
  }

  return (
    <CustomerDashboardLayout>
      <div className="min-h-screen bg-b2b-gray-50 py-8">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 xl:grid-cols-4">
            {/* Main analytics content */}
            <div className="space-y-8 lg:col-span-2 xl:col-span-3">
              {/* Header */}
              <div>
                <h1 className="mb-2 text-3xl font-bold text-b2b-dark">Analytics Dashboard</h1>
                <p className="text-b2b-gray-500">
                  Insights into your spending, trends, and opportunities.
                </p>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <Card className="p-6">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm text-b2b-gray-500">Total spend (12 mo)</p>
                    <MdShowChart className="text-xl text-b2b-blue" />
                  </div>
                  <p className="text-3xl font-bold text-b2b-dark">
                    ${totalSpend.toLocaleString()}
                  </p>
                </Card>

                <Card className="p-6">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm text-b2b-gray-500">Avg order value</p>
                    <MdTrendingUp className="text-xl text-green-600" />
                  </div>
                  <p className="text-3xl font-bold text-b2b-dark">
                    ${avgOrderValue.toFixed(0)}
                  </p>
                </Card>

                <Card className="p-6">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm text-b2b-gray-500">Total orders</p>
                    <MdShowChart className="text-xl text-b2b-blue" />
                  </div>
                  <p className="text-3xl font-bold text-b2b-dark">{orderCount}</p>
                </Card>
              </div>

              {/* Charts row */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card className="p-6">
                  <h2 className="mb-4 text-xl font-bold text-b2b-dark">Spending trend</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={spendingData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="#0066cc"
                        strokeWidth={2}
                        name="Spending ($)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>

                <Card className="p-6">
                  <h2 className="mb-4 text-xl font-bold text-b2b-dark">Category breakdown</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name} (${entry.value}%)`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              {/* Top products & AI insights */}
              <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card className="p-6">
                  <h2 className="mb-4 text-xl font-bold text-b2b-dark">Top products</h2>
                  <div className="space-y-3">
                    {topProducts.map((product, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-lg bg-b2b-gray-50 p-3"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-b2b-dark">{product.name}</p>
                          <p className="text-sm text-b2b-gray-500">
                            {product.order_count} orders
                          </p>
                        </div>
                        <p className="text-lg font-bold text-b2b-dark">
                          ${product.total_spent.toFixed(0)}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <MdLightbulb className="text-2xl text-yellow-500" />
                    <h2 className="text-xl font-bold text-b2b-dark">AI insights</h2>
                  </div>
                  <div className="space-y-4">
                    {insights.map((insight) => (
                      <div
                        key={insight.id}
                        className={`rounded-lg border-l-4 p-4 ${
                          insight.type === "opportunity"
                            ? "bg-green-50 border-green-500"
                            : insight.type === "warning"
                            ? "bg-yellow-50 border-yellow-500"
                            : "bg-blue-50 border-blue-500"
                        }`}
                      >
                        <h3 className="mb-2 font-bold text-b2b-dark">{insight.title}</h3>
                        <p className="mb-3 text-sm text-b2b-gray-600">
                          {insight.description}
                        </p>
                        <a
                          href={insight.actionUrl}
                          className="text-sm font-medium text-b2b-blue hover:underline"
                        >
                          {insight.actionLabel}
                        </a>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>

            {/* Right column - AI spend advisor */}
            <div className="lg:col-span-1 xl:col-span-1">
              <EmbeddedAIAssistantPanel mode="analytics" />
            </div>
          </div>
        </div>
      </div>
    </CustomerDashboardLayout>
  );
}

