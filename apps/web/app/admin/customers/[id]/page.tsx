'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/b2b/Card';
import { Badge } from '@/components/b2b/Badge';
import { Button } from '@/components/b2b/Button';
import { CustomerAIInsights } from '@/components/CustomerAIInsights';
import { CustomerActivityTimeline } from '@/components/CustomerActivityTimeline';
import {
  MdEmail,
  MdPhone,
  MdLocationOn,
  MdTrendingUp,
  MdTrendingDown,
  MdWarning,
  MdCheckCircle,
  MdEdit,
} from 'react-icons/md';
import { useRouter, useParams } from 'next/navigation';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  created_at: string;
  metadata: any;
}

interface CustomerMetrics {
  total_orders: number;
  total_spent: number;
  avg_order_value: number;
  last_order_date: string | null;
  days_since_last_order: number;
  health_score: number;
  churn_risk: 'low' | 'medium' | 'high';
}

interface Order {
  id: string;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
}

export default function CustomerProfilePage() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [metrics, setMetrics] = useState<CustomerMetrics | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
      } else {
        setUser(user);
        await fetchCustomerData(customerId);
      }
    };
    checkAuth();
  }, [router, supabase.auth, customerId]);

  const fetchCustomerData = async (id: string) => {
    setLoading(true);
    try {
      // Fetch customer details
      const { data: customerData, error: customerError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single();

      if (customerError) throw customerError;

      setCustomer({
        id: customerData.id,
        name: customerData.name,
        email: customerData.email || '',
        phone: customerData.phone || null,
        address: customerData.address || null,
        city: customerData.city || null,
        state: customerData.state || null,
        zip: customerData.zip || null,
        created_at: customerData.created_at,
        metadata: customerData.metadata || {},
      });

      // Fetch orders
      const { data: ordersData } = await supabase
        .from('orders')
        .select('id, order_number, total, status, created_at')
        .eq('organization_id', id)
        .order('created_at', { ascending: false })
        .limit(10);

      setOrders(ordersData || []);

      // Calculate metrics
      if (ordersData && ordersData.length > 0) {
        const totalSpent = ordersData.reduce((sum, order) => sum + order.total, 0);
        const avgOrderValue = totalSpent / ordersData.length;
        const lastOrderDate = ordersData[0].created_at;
        const daysSinceLastOrder = Math.floor(
          (Date.now() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24)
        );

        // Calculate health score (0-100)
        let healthScore = 100;
        if (daysSinceLastOrder > 90) healthScore -= 30;
        else if (daysSinceLastOrder > 60) healthScore -= 20;
        else if (daysSinceLastOrder > 30) healthScore -= 10;

        if (ordersData.length < 5) healthScore -= 20;
        if (avgOrderValue < 100) healthScore -= 10;

        // Determine churn risk
        let churnRisk: 'low' | 'medium' | 'high' = 'low';
        if (daysSinceLastOrder > 90 || healthScore < 50) churnRisk = 'high';
        else if (daysSinceLastOrder > 60 || healthScore < 70) churnRisk = 'medium';

        setMetrics({
          total_orders: ordersData.length,
          total_spent: totalSpent,
          avg_order_value: avgOrderValue,
          last_order_date: lastOrderDate,
          days_since_last_order: daysSinceLastOrder,
          health_score: Math.max(0, healthScore),
          churn_risk: churnRisk,
        });
      } else {
        setMetrics({
          total_orders: 0,
          total_spent: 0,
          avg_order_value: 0,
          last_order_date: null,
          days_since_last_order: 0,
          health_score: 50,
          churn_risk: 'medium',
        });
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user || loading || !customer) {
    return (
      <div className="min-h-screen bg-b2b-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-7xl">
          <p className="text-center text-b2b-gray-500">Loading customer profile...</p>
        </div>
      </div>
    );
  }

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getChurnRiskBadge = (risk: string) => {
    if (risk === 'low') return <Badge variant="success">Low Risk</Badge>;
    if (risk === 'medium') return <Badge variant="warning">Medium Risk</Badge>;
    return <Badge variant="error">High Risk</Badge>;
  };

  return (
    <div className="min-h-screen bg-b2b-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-b2b-dark mb-2">{customer.name}</h1>
            <p className="text-b2b-gray-500">Customer since {new Date(customer.created_at).toLocaleDateString()}</p>
          </div>
          <Button variant="outline" size="md" icon={<MdEdit />}>
            Edit Customer
          </Button>
        </div>

        {/* Health Score & Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-b2b-gray-500">Health Score</p>
              {metrics && metrics.health_score >= 80 ? (
                <MdCheckCircle className="text-green-600 text-xl" />
              ) : (
                <MdWarning className="text-yellow-600 text-xl" />
              )}
            </div>
            <p className={`text-3xl font-bold ${getHealthScoreColor(metrics?.health_score || 0)}`}>
              {metrics?.health_score || 0}
            </p>
            <div className="mt-2">{metrics && getChurnRiskBadge(metrics.churn_risk)}</div>
          </Card>

          <Card className="p-6">
            <p className="text-sm text-b2b-gray-500 mb-2">Total Spent</p>
            <p className="text-3xl font-bold text-b2b-dark">
              ${metrics?.total_spent.toLocaleString() || 0}
            </p>
            <p className="text-xs text-b2b-gray-500 mt-1">
              {metrics?.total_orders || 0} orders
            </p>
          </Card>

          <Card className="p-6">
            <p className="text-sm text-b2b-gray-500 mb-2">Avg Order Value</p>
            <p className="text-3xl font-bold text-b2b-dark">
              ${metrics?.avg_order_value.toFixed(0) || 0}
            </p>
          </Card>

          <Card className="p-6">
            <p className="text-sm text-b2b-gray-500 mb-2">Last Order</p>
            <p className="text-3xl font-bold text-b2b-dark">
              {metrics?.days_since_last_order || 0}d
            </p>
            <p className="text-xs text-b2b-gray-500 mt-1">days ago</p>
          </Card>
        </div>

        {/* Contact Info & Order History */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact Information */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-b2b-dark mb-4">Contact Information</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MdEmail className="text-b2b-blue text-xl mt-1" />
                <div>
                  <p className="text-sm text-b2b-gray-500">Email</p>
                  <p className="text-b2b-dark">{customer.email}</p>
                </div>
              </div>

              {customer.phone && (
                <div className="flex items-start gap-3">
                  <MdPhone className="text-b2b-blue text-xl mt-1" />
                  <div>
                    <p className="text-sm text-b2b-gray-500">Phone</p>
                    <p className="text-b2b-dark">{customer.phone}</p>
                  </div>
                </div>
              )}

              {customer.address && (
                <div className="flex items-start gap-3">
                  <MdLocationOn className="text-b2b-blue text-xl mt-1" />
                  <div>
                    <p className="text-sm text-b2b-gray-500">Address</p>
                    <p className="text-b2b-dark">{customer.address}</p>
                    {customer.city && customer.state && (
                      <p className="text-b2b-dark">
                        {customer.city}, {customer.state} {customer.zip}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Recent Orders */}
          <Card className="p-6 lg:col-span-2">
            <h2 className="text-xl font-bold text-b2b-dark mb-4">Recent Orders</h2>
            <div className="space-y-3">
              {orders.length > 0 ? (
                orders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 bg-b2b-gray-50 rounded-lg hover:bg-b2b-gray-100 cursor-pointer"
                    onClick={() => router.push(`/admin/orders/${order.id}`)}
                  >
                    <div>
                      <p className="font-medium text-b2b-dark">{order.order_number}</p>
                      <p className="text-sm text-b2b-gray-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-b2b-dark">
                        ${order.total.toFixed(2)}
                      </p>
                      <Badge variant={order.status === 'completed' ? 'success' : 'default'}>
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-b2b-gray-500 py-8">No orders yet</p>
              )}
            </div>
          </Card>
        </div>

        {/* AI Insights & Activity Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <CustomerAIInsights customerId={customerId} orders={orders} metrics={metrics} />
          <CustomerActivityTimeline customerId={customerId} />
        </div>
      </div>
    </div>
  );
}

