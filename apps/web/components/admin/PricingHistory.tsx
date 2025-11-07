'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/b2b';
import { FiTrendingUp, FiTrendingDown, FiClock } from 'react-icons/fi';

interface PriceChange {
  id: string;
  old_price: number;
  new_price: number;
  price_change_percent: number;
  change_reason: string;
  created_at: string;
  changed_by_user?: {
    email: string;
  };
}

interface PricingHistoryProps {
  productId: string;
}

export function PricingHistory({ productId }: PricingHistoryProps) {
  const [history, setHistory] = useState<PriceChange[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        const response = await fetch(
          `/api/admin/pricing/history?product_id=${productId}`
        );
        if (response.ok) {
          const data = await response.json();
          setHistory(data.history || []);
        }
      } catch (error) {
        console.error('Error loading pricing history:', error);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [productId]);

  if (loading) {
    return (
      <Card variant="bordered" padding="lg">
        <div className="text-center text-b2b-gray-400">Loading pricing history...</div>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card variant="bordered" padding="lg">
        <h2 className="text-lg font-bold text-b2b-dark mb-4">Pricing History</h2>
        <div className="text-center text-b2b-gray-400 py-8">
          No pricing changes recorded yet
        </div>
      </Card>
    );
  }

  return (
    <Card variant="bordered" padding="lg">
      <h2 className="text-lg font-bold text-b2b-dark mb-4">Pricing History</h2>

      <div className="space-y-4">
        {history.map((change, index) => {
          const isIncrease = change.new_price > change.old_price;
          const priceChange = change.new_price - change.old_price;

          return (
            <div
              key={change.id}
              className="relative pl-8 pb-4 border-l-2 border-b2b-gray-200 last:border-l-0 last:pb-0"
            >
              {/* Timeline dot */}
              <div
                className={`absolute left-0 top-0 -ml-2 w-4 h-4 rounded-full ${
                  isIncrease ? 'bg-green-500' : 'bg-red-500'
                }`}
              />

              {/* Change details */}
              <div className="bg-b2b-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    {isIncrease ? (
                      <FiTrendingUp className="h-5 w-5 text-green-600" />
                    ) : (
                      <FiTrendingDown className="h-5 w-5 text-red-600" />
                    )}
                    <span className="font-medium text-b2b-dark">
                      ${change.old_price.toFixed(2)} → ${change.new_price.toFixed(2)}
                    </span>
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      isIncrease ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {isIncrease ? '+' : ''}${priceChange.toFixed(2)} (
                    {isIncrease ? '+' : ''}
                    {change.price_change_percent.toFixed(1)}%)
                  </span>
                </div>

                <div className="text-sm text-b2b-gray-600 mb-2">
                  {change.change_reason}
                </div>

                <div className="flex items-center gap-4 text-xs text-b2b-gray-500">
                  <div className="flex items-center gap-1">
                    <FiClock className="h-3 w-3" />
                    {new Date(change.created_at).toLocaleString()}
                  </div>
                  {change.changed_by_user && (
                    <div>By: {change.changed_by_user.email}</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

