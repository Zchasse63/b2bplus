'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Badge } from '@/components/b2b';
import { FiTarget, FiTrendingUp, FiX, FiMail, FiCheck } from 'react-icons/fi';

interface OpportunityCardProps {
  opportunity: {
    id: string;
    opportunity_type: string;
    predicted_revenue: number;
    opportunity_score: number;
    reason: string;
    status: string;
    created_at: string;
    customer_id: string;
    product: {
      id: string;
      name: string;
    };
  };
}

const opportunityTypeLabels: Record<string, string> = {
  stopped_buying: 'Stopped Purchase',
  cross_sell: 'Cross-Sell',
  upsell: 'Upsell',
  new_product: 'New Product',
};

const opportunityTypeColors: Record<string, string> = {
  stopped_buying: 'border-red-500',
  cross_sell: 'border-blue-500',
  upsell: 'border-green-500',
  new_product: 'border-purple-500',
};

const statusLabels: Record<string, string> = {
  open: 'New',
  contacted: 'In Progress',
  won: 'Won',
  lost: 'Lost',
  ignored: 'Dismissed',
};

const statusVariants: Record<string, 'info' | 'warning' | 'success' | 'error' | 'default'> = {
  open: 'info',
  contacted: 'warning',
  won: 'success',
  lost: 'error',
  ignored: 'default',
};

export function OpportunityCard({ opportunity }: OpportunityCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const handleAction = async (action: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/opportunities/${opportunity.id}/pursue`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action,
            notes: `${action} opportunity for customer ${opportunity.customer_id}`,
          }),
        }
      );

      if (response.ok) {
        router.refresh();
      } else {
        console.error('Failed to update opportunity');
      }
    } catch (error) {
      console.error('Error updating opportunity:', error);
    } finally {
      setLoading(false);
      setShowActions(false);
    }
  };

  const borderColor =
    opportunityTypeColors[opportunity.opportunity_type] || 'border-gray-500';

  return (
    <Card className={`border-l-4 ${borderColor}`} hover>
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-bold text-lg text-b2b-dark">
            {opportunityTypeLabels[opportunity.opportunity_type] ||
              opportunity.opportunity_type}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-b2b-gray-500">
              Customer: {opportunity.customer_id.substring(0, 8)}...
            </span>
            <Badge variant={statusVariants[opportunity.status] || 'default'} size="sm">
              {statusLabels[opportunity.status] || opportunity.status}
            </Badge>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-green-600">
            ${opportunity.predicted_revenue?.toLocaleString() || '0'}
          </div>
          <div className="text-xs text-b2b-gray-500">potential</div>
        </div>
      </div>

      {/* Product */}
      <div className="mb-3 p-2 bg-b2b-gray-50 rounded">
        <div className="text-xs text-b2b-gray-500">Product</div>
        <div className="text-sm font-medium text-b2b-dark">
          {opportunity.product.name}
        </div>
      </div>

      {/* AI Reasoning */}
      <div className="mb-3">
        <div className="text-xs text-b2b-gray-500 mb-1">AI Insight</div>
        <p className="text-sm text-b2b-gray-700 leading-relaxed">
          {opportunity.reason}
        </p>
      </div>

      {/* Confidence Score */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-b2b-gray-500">Confidence</span>
          <span className="font-medium text-b2b-dark">
            {Math.round((opportunity.opportunity_score || 0) * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{
              width: `${(opportunity.opportunity_score || 0) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Actions */}
      {opportunity.status === 'open' && (
        <div className="space-y-2">
          {!showActions ? (
            <Button
              onClick={() => setShowActions(true)}
              variant="secondary"
              fullWidth
              icon={<FiTarget className="h-4 w-4" />}
            >
              Take Action
            </Button>
          ) : (
            <div className="space-y-2">
              <Button
                onClick={() => handleAction('contact')}
                loading={loading}
                variant="primary"
                fullWidth
                size="sm"
                icon={<FiMail className="h-4 w-4" />}
              >
                Contact Customer
              </Button>
              <Button
                onClick={() => handleAction('mark_pursued')}
                loading={loading}
                variant="secondary"
                fullWidth
                size="sm"
                icon={<FiCheck className="h-4 w-4" />}
              >
                Mark as Pursued
              </Button>
              <Button
                onClick={() => handleAction('dismiss')}
                loading={loading}
                variant="outline"
                fullWidth
                size="sm"
                icon={<FiX className="h-4 w-4" />}
              >
                Dismiss
              </Button>
              <Button
                onClick={() => setShowActions(false)}
                variant="ghost"
                fullWidth
                size="sm"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Show status for non-open opportunities */}
      {opportunity.status !== 'open' && (
        <div className="text-center py-2 text-sm text-b2b-gray-500">
          {opportunity.status === 'won' && '✓ Opportunity Won'}
          {opportunity.status === 'lost' && '✗ Opportunity Lost'}
          {opportunity.status === 'contacted' && '→ In Progress'}
          {opportunity.status === 'ignored' && '− Dismissed'}
        </div>
      )}

      {/* Timestamp */}
      <div className="mt-3 pt-3 border-t border-b2b-gray-100 text-xs text-b2b-gray-400">
        Detected {new Date(opportunity.created_at).toLocaleDateString()}
      </div>
    </Card>
  );
}

