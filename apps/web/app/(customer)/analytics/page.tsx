'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/b2b/Card';
import { Badge } from '@/components/b2b/Badge';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { MdTrendingUp, MdTrendingDown, MdShowChart, MdLightbulb } from 'react-icons/md';
import { useRouter } from 'next/navigation';

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
  type: 'opportunity' | 'warning' | 'info';
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
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
      } else {
        setUser(user);
        await fetchAnalytics(user.id);
      }
    };
    checkAuth();
  }, [router, supabase.auth]);

  const fetchAnalytics = async (userId: string) => {
    setLoading(true);
    try {
      // Get user's organization
      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', userId)
        .single();

      if (!membership) {
        setLoading(false);
        return;
      }

      // Fetch orders for the last 12 months
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const { data: orders } = await supabase
        .from('orders')
        .select('total, created_at, order_items(product_id, quantity, price)')
        .eq('organization_id', membership.organization_id)
        .gte('created_at', twelveMonthsAgo.toISOString())
        .order('created_at', { ascending: true });

      if (orders) {
        // Calculate spending by month
        const monthlySpending: { [key: string]: number } = {};
        let total = 0;

        orders.forEach((order) => {
          const month = new Date(order.created_at).toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric',
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

        // Calculate top products
        const productSpending: { [key: string]: { total: number; count: number; name: string } } = {};

        for (const order of orders) {
          if (order.order_items) {
            for (const item of order.order_items as any[]) {
              const key = item.product_id;
              if (!productSpending[key]) {
                // Fetch product name
                const { data: product } = await supabase
                  .from('products')
                  .select('name')
                  .eq('id', item.product_id)
                  .single();

                productSpending[key] = {
                  total: 0,
                  count: 0,
                  name: product?.name || 'Unknown Product',
                };
              }
              productSpending[key].total += item.price * item.quantity;
              productSpending[key].count += 1;
            }
          }
        }

        const topProductsArray = Object.values(productSpending)
          .sort((a, b) => b.total - a.total)
          .slice(0, 5)
          .map((p) => ({
            name: p.name,
            total_spent: p.total,
            order_count: p.count,
          }));

        setTopProducts(topProductsArray);

        // Mock category data (would come from product categories in real implementation)
        setCategoryData([
          { name: 'Disposables', value: 35, color: '#0066cc' },
          { name: 'Packaging', value: 25, color: '#00a8e8' },
          { name: 'Containers', value: 20, color: '#00c9a7' },
          { name: 'Utensils', value: 15, color: '#ffa500' },
          { name: 'Other', value: 5, color: '#6b7280' },
        ]);

        // Generate AI insights
        generateInsights(orders, topProductsArray);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = (orders: any[], topProducts: TopProduct[]) => {
    const insights: AIInsight[] = [];

    // Spending trend insight
    if (orders.length >= 2) {
      const recentTotal = orders.slice(-3).reduce((sum, o) => sum + o.total, 0);
      const previousTotal = orders.slice(-6, -3).reduce((sum, o) => sum + o.total, 0);
      const percentChange = ((recentTotal - previousTotal) / previousTotal) * 100;

      if (percentChange > 10) {
        insights.push({
          id: '1',
          title: 'Spending Increasing',
          description: `Your spending has increased by ${Math.round(percentChange)}% in the last 3 months. Consider bulk ordering to save on costs.`,
          actionLabel: 'View Bulk Discounts',
          actionUrl: '/products',
          type: 'opportunity',
        });
      }
    }

    // Top product insight
    if (topProducts.length > 0) {
      insights.push({
        id: '2',
        title: 'Top Product Opportunity',
        description: `${topProducts[0].name} is your most ordered item. You could save 15% by setting up a recurring order.`,
        actionLabel: 'Set Up Recurring Order',
        actionUrl: '/products',
        type: 'opportunity',
      });
    }

    // Seasonal pattern insight
    insights.push({
      id: '3',
      title: 'Seasonal Pattern Detected',
      description: 'Your orders typically increase by 30% during summer months. Plan ahead to ensure availability.',
      actionLabel: 'View Forecast',
      actionUrl: '/analytics',
      type: 'info',
    });

    setInsights(insights);
  };

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-b2b-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-7xl">
          <p className="text-center text-b2b-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-b2b-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-b2b-dark mb-2">Analytics Dashboard</h1>
          <p className="text-b2b-gray-500">
            Insights into your spending, trends, and opportunities
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-b2b-gray-500">Total Spend (12mo)</p>
              <MdShowChart className="text-b2b-blue text-xl" />
            </div>
            <p className="text-3xl font-bold text-b2b-dark">
              ${totalSpend.toLocaleString()}
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-b2b-gray-500">Avg Order Value</p>
              <MdTrendingUp className="text-green-600 text-xl" />
            </div>
            <p className="text-3xl font-bold text-b2b-dark">
              ${avgOrderValue.toFixed(0)}
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-b2b-gray-500">Total Orders</p>
              <MdShowChart className="text-b2b-blue text-xl" />
            </div>
            <p className="text-3xl font-bold text-b2b-dark">{orderCount}</p>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Spending Trend */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-b2b-dark mb-4">Spending Trend</h2>
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

          {/* Category Breakdown */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-b2b-dark mb-4">Category Breakdown</h2>
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

        {/* Top Products & AI Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Products */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-b2b-dark mb-4">Top Products</h2>
            <div className="space-y-3">
              {topProducts.map((product, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-b2b-gray-50 rounded-lg"
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

          {/* AI Insights */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <MdLightbulb className="text-yellow-500 text-2xl" />
              <h2 className="text-xl font-bold text-b2b-dark">AI Insights</h2>
            </div>
            <div className="space-y-4">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  className={`p-4 rounded-lg border-l-4 ${
                    insight.type === 'opportunity'
                      ? 'bg-green-50 border-green-500'
                      : insight.type === 'warning'
                      ? 'bg-yellow-50 border-yellow-500'
                      : 'bg-blue-50 border-blue-500'
                  }`}
                >
                  <h3 className="font-bold text-b2b-dark mb-2">{insight.title}</h3>
                  <p className="text-sm text-b2b-gray-600 mb-3">{insight.description}</p>
                  <a
                    href={insight.actionUrl}
                    className="text-sm text-b2b-blue hover:underline font-medium"
                  >
                    {insight.actionLabel} →
                  </a>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

