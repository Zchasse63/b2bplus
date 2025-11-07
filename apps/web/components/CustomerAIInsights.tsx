'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/b2b/Card';
import { Badge } from '@/components/b2b/Badge';
import { Button } from '@/components/b2b/Button';
import {
  MdLightbulb,
  MdTrendingUp,
  MdWarning,
  MdAutorenew,
  MdShoppingCart,
} from 'react-icons/md';

interface AIInsight {
  id: string;
  type: 'opportunity' | 'warning' | 'prediction' | 'pattern';
  title: string;
  description: string;
  confidence: number;
  actionLabel?: string;
  actionUrl?: string;
}

interface CustomerAIInsightsProps {
  customerId: string;
  orders: any[];
  metrics: any;
}

export function CustomerAIInsights({ customerId, orders, metrics }: CustomerAIInsightsProps) {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateInsights();
  }, [customerId, orders, metrics]);

  const generateInsights = async () => {
    setLoading(true);
    try {
      const generatedInsights: AIInsight[] = [];

      // Churn risk insight
      if (metrics?.churn_risk === 'high') {
        generatedInsights.push({
          id: '1',
          type: 'warning',
          title: 'High Churn Risk Detected',
          description: `Customer hasn't ordered in ${metrics.days_since_last_order} days. Consider reaching out with a personalized offer.`,
          confidence: 0.85,
          actionLabel: 'Send Offer',
          actionUrl: `/admin/customers/${customerId}/send-offer`,
        });
      }

      // Purchase pattern insight
      if (orders.length >= 3) {
        const avgDaysBetweenOrders = calculateAvgDaysBetweenOrders(orders);
        generatedInsights.push({
          id: '2',
          type: 'pattern',
          title: 'Regular Purchase Pattern',
          description: `Customer orders approximately every ${Math.round(avgDaysBetweenOrders)} days. Next order predicted in ${Math.round(avgDaysBetweenOrders - metrics.days_since_last_order)} days.`,
          confidence: 0.78,
        });
      }

      // Upsell opportunity
      if (metrics?.avg_order_value < 500 && orders.length >= 5) {
        generatedInsights.push({
          id: '3',
          type: 'opportunity',
          title: 'Upsell Opportunity',
          description: `Average order value is $${metrics.avg_order_value.toFixed(0)}. Customer could benefit from bulk discounts on frequently ordered items.`,
          confidence: 0.72,
          actionLabel: 'View Bulk Offers',
          actionUrl: '/products?filter=bulk',
        });
      }

      // Product recommendation
      if (orders.length > 0) {
        generatedInsights.push({
          id: '4',
          type: 'prediction',
          title: 'Product Recommendation',
          description: 'Based on purchase history, customer may be interested in eco-friendly alternatives to current products.',
          confidence: 0.68,
          actionLabel: 'View Eco Products',
          actionUrl: '/products?filter=eco-friendly',
        });
      }

      // Seasonal pattern
      const hasSeasonalPattern = detectSeasonalPattern(orders);
      if (hasSeasonalPattern) {
        generatedInsights.push({
          id: '5',
          type: 'pattern',
          title: 'Seasonal Buying Pattern',
          description: 'Customer shows increased ordering during summer months. Plan inventory accordingly.',
          confidence: 0.81,
        });
      }

      setInsights(generatedInsights);
    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAvgDaysBetweenOrders = (orders: any[]) => {
    if (orders.length < 2) return 0;

    const sortedOrders = [...orders].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    let totalDays = 0;
    for (let i = 1; i < sortedOrders.length; i++) {
      const days =
        (new Date(sortedOrders[i].created_at).getTime() -
          new Date(sortedOrders[i - 1].created_at).getTime()) /
        (1000 * 60 * 60 * 24);
      totalDays += days;
    }

    return totalDays / (sortedOrders.length - 1);
  };

  const detectSeasonalPattern = (orders: any[]) => {
    if (orders.length < 6) return false;

    const monthCounts: { [key: number]: number } = {};
    orders.forEach((order) => {
      const month = new Date(order.created_at).getMonth();
      monthCounts[month] = (monthCounts[month] || 0) + 1;
    });

    const maxCount = Math.max(...Object.values(monthCounts));
    const avgCount = Object.values(monthCounts).reduce((a, b) => a + b, 0) / Object.keys(monthCounts).length;

    return maxCount > avgCount * 1.5;
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity':
        return <MdTrendingUp className="text-green-600 text-2xl" />;
      case 'warning':
        return <MdWarning className="text-yellow-600 text-2xl" />;
      case 'prediction':
        return <MdShoppingCart className="text-blue-600 text-2xl" />;
      case 'pattern':
        return <MdAutorenew className="text-purple-600 text-2xl" />;
      default:
        return <MdLightbulb className="text-yellow-500 text-2xl" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'opportunity':
        return 'border-green-500 bg-green-50';
      case 'warning':
        return 'border-yellow-500 bg-yellow-50';
      case 'prediction':
        return 'border-blue-500 bg-blue-50';
      case 'pattern':
        return 'border-purple-500 bg-purple-50';
      default:
        return 'border-b2b-gray-300 bg-b2b-gray-50';
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-center text-b2b-gray-500">Generating AI insights...</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <MdLightbulb className="text-yellow-500 text-2xl" />
        <h2 className="text-xl font-bold text-b2b-dark">AI Insights</h2>
      </div>

      {insights.length > 0 ? (
        <div className="space-y-4">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className={`p-4 rounded-lg border-l-4 ${getInsightColor(insight.type)}`}
            >
              <div className="flex items-start gap-3">
                {getInsightIcon(insight.type)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-b2b-dark">{insight.title}</h3>
                    <Badge variant="default" className="text-xs">
                      {Math.round(insight.confidence * 100)}% confidence
                    </Badge>
                  </div>
                  <p className="text-sm text-b2b-gray-600 mb-3">{insight.description}</p>
                  {insight.actionLabel && insight.actionUrl && (
                    <a
                      href={insight.actionUrl}
                      className="text-sm text-b2b-blue hover:underline font-medium"
                    >
                      {insight.actionLabel} →
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-b2b-gray-500 py-8">
          Not enough data to generate insights yet
        </p>
      )}
    </Card>
  );
}

