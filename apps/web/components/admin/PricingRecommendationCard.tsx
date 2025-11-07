'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Badge, Input } from '@/components/b2b';
import {
  FiDollarSign,
  FiTrendingUp,
  FiTrendingDown,
  FiAlertTriangle,
  FiCheck,
  FiX,
  FiEdit,
} from 'react-icons/fi';

interface PricingRecommendationCardProps {
  recommendation: {
    id: string;
    product_id: string;
    recommended_price: number;
    current_price: number;
    reasoning: string;
    confidence_score: number;
    expected_impact: any;
    risks: string[];
    status: string;
    product: {
      id: string;
      name: string;
      price: number;
    };
  };
}

const statusLabels: Record<string, string> = {
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  applied: 'Applied',
};

const statusVariants: Record<string, 'warning' | 'success' | 'error' | 'info'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  applied: 'info',
};

export function PricingRecommendationCard({
  recommendation,
}: PricingRecommendationCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [customPrice, setCustomPrice] = useState(recommendation.recommended_price);

  const priceChange = recommendation.recommended_price - recommendation.current_price;
  const priceChangePercent =
    (priceChange / recommendation.current_price) * 100;
  const isIncrease = priceChange > 0;

  const handleAction = async (action: 'approve' | 'reject' | 'modify') => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/pricing/${recommendation.id}/approve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action,
            custom_price: action === 'modify' ? customPrice : undefined,
          }),
        }
      );

      if (response.ok) {
        router.refresh();
      } else {
        console.error('Failed to update pricing recommendation');
      }
    } catch (error) {
      console.error('Error updating pricing recommendation:', error);
    } finally {
      setLoading(false);
      setShowActions(false);
    }
  };

  return (
    <Card variant="bordered" hover>
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-bold text-lg text-b2b-dark">
            {recommendation.product.name}
          </h3>
          <div className="mt-1">
            <Badge variant={statusVariants[recommendation.status] || 'warning'} size="sm">
              {statusLabels[recommendation.status] || recommendation.status}
            </Badge>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-b2b-gray-500">Confidence</div>
          <div className="text-lg font-bold text-b2b-dark">
            {Math.round(recommendation.confidence_score * 100)}%
          </div>
        </div>
      </div>

      {/* Price Change */}
      <div className="bg-b2b-gray-50 rounded-lg p-3 mb-3">
        <div className="flex justify-between items-center mb-2">
          <div>
            <div className="text-xs text-b2b-gray-500">Current Price</div>
            <div className="text-lg font-medium text-b2b-dark">
              ${recommendation.current_price.toFixed(2)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isIncrease ? (
              <FiTrendingUp className="h-5 w-5 text-green-600" />
            ) : (
              <FiTrendingDown className="h-5 w-5 text-red-600" />
            )}
          </div>
          <div className="text-right">
            <div className="text-xs text-b2b-gray-500">Recommended</div>
            <div className="text-lg font-bold text-blue-600">
              ${recommendation.recommended_price.toFixed(2)}
            </div>
          </div>
        </div>
        <div className="text-center">
          <span
            className={`text-sm font-medium ${
              isIncrease ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {isIncrease ? '+' : ''}${priceChange.toFixed(2)} (
            {isIncrease ? '+' : ''}
            {priceChangePercent.toFixed(1)}%)
          </span>
        </div>
      </div>

      {/* Expected Impact */}
      {recommendation.expected_impact && (
        <div className="mb-3 p-2 bg-blue-50 rounded border border-blue-200">
          <div className="text-xs text-blue-700 font-medium mb-1">
            Expected Impact
          </div>
          <div className="text-sm text-blue-900">
            {recommendation.expected_impact.revenue_change >= 0 ? '+' : ''}$
            {Math.round(
              recommendation.expected_impact.revenue_change || 0
            ).toLocaleString()}{' '}
            revenue
          </div>
          {recommendation.expected_impact.volume_change && (
            <div className="text-xs text-blue-700 mt-1">
              {recommendation.expected_impact.volume_change >= 0 ? '+' : ''}
              {Math.round(recommendation.expected_impact.volume_change)}% volume
            </div>
          )}
        </div>
      )}

      {/* AI Reasoning */}
      <div className="mb-3">
        <div className="text-xs text-b2b-gray-500 mb-1">AI Reasoning</div>
        <p className="text-sm text-b2b-gray-700 leading-relaxed">
          {recommendation.reasoning}
        </p>
      </div>

      {/* Risks */}
      {recommendation.risks && recommendation.risks.length > 0 && (
        <div className="mb-3 p-2 bg-yellow-50 rounded border border-yellow-200">
          <div className="flex items-center gap-1 text-xs text-yellow-700 font-medium mb-1">
            <FiAlertTriangle className="h-3 w-3" />
            Potential Risks
          </div>
          <ul className="text-xs text-yellow-800 space-y-1">
            {recommendation.risks.map((risk, index) => (
              <li key={index}>• {risk}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      {recommendation.status === 'pending' && (
        <div className="space-y-2">
          {!showActions ? (
            <Button
              onClick={() => setShowActions(true)}
              variant="secondary"
              fullWidth
              icon={<FiDollarSign className="h-4 w-4" />}
            >
              Review Pricing
            </Button>
          ) : (
            <div className="space-y-2">
              <Button
                onClick={() => handleAction('approve')}
                loading={loading}
                variant="secondary"
                fullWidth
                size="sm"
                icon={<FiCheck className="h-4 w-4" />}
              >
                Approve & Apply
              </Button>

              <div className="flex gap-2">
                <Input
                  type="number"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(parseFloat(e.target.value))}
                  step="0.01"
                  placeholder="Custom price"
                  className="flex-1"
                />
                <Button
                  onClick={() => handleAction('modify')}
                  loading={loading}
                  variant="primary"
                  size="sm"
                  icon={<FiEdit className="h-4 w-4" />}
                />
              </div>

              <Button
                onClick={() => handleAction('reject')}
                loading={loading}
                variant="outline"
                fullWidth
                size="sm"
                icon={<FiX className="h-4 w-4" />}
              >
                Reject
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

      {/* Show status for non-pending recommendations */}
      {recommendation.status !== 'pending' && (
        <div className="text-center py-2 text-sm text-b2b-gray-500">
          {recommendation.status === 'approved' && '✓ Approved'}
          {recommendation.status === 'rejected' && '✗ Rejected'}
          {recommendation.status === 'applied' && '✓ Applied to Product'}
        </div>
      )}
    </Card>
  );
}

