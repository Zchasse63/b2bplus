'use client';

import { useMemo } from 'react';
import { Card, Badge } from '@/components/b2b';
import { FiTrendingUp, FiTrendingDown, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';

interface Forecast {
  id: string;
  product_id: string;
  predicted_quantity: number;
  confidence_level: number;
  product: {
    id: string;
    name: string;
    stock_quantity: number;
  };
}

interface InventoryRecommendationsProps {
  forecasts: Forecast[];
}

interface Recommendation {
  product_id: string;
  product_name: string;
  current_stock: number;
  predicted_demand: number;
  recommendation: 'stock_up' | 'reduce' | 'maintain';
  urgency: 'high' | 'medium' | 'low';
  quantity_needed: number;
  confidence: number;
}

export function InventoryRecommendations({ forecasts }: InventoryRecommendationsProps) {
  // Generate recommendations by aggregating forecasts per product
  const recommendations = useMemo(() => {
    const productMap = new Map<
      string,
      {
        product_id: string;
        product_name: string;
        current_stock: number;
        total_predicted: number;
        avg_confidence: number;
        count: number;
      }
    >();

    forecasts.forEach((forecast) => {
      const productId = forecast.product_id;
      if (!productMap.has(productId)) {
        productMap.set(productId, {
          product_id: productId,
          product_name: forecast.product.name,
          current_stock: forecast.product.stock_quantity || 0,
          total_predicted: 0,
          avg_confidence: 0,
          count: 0,
        });
      }

      const entry = productMap.get(productId)!;
      entry.total_predicted += forecast.predicted_quantity || 0;
      entry.avg_confidence += forecast.confidence_level || 0;
      entry.count++;
    });

    const recs: Recommendation[] = [];

    productMap.forEach((data) => {
      const avgConfidence = data.count > 0 ? data.avg_confidence / data.count : 0;
      const predictedDemand = Math.round(data.total_predicted);
      const currentStock = data.current_stock;
      const stockRatio = currentStock / (predictedDemand || 1);

      let recommendation: 'stock_up' | 'reduce' | 'maintain';
      let urgency: 'high' | 'medium' | 'low';
      let quantityNeeded: number;

      if (stockRatio < 0.5) {
        // Less than 50% of predicted demand
        recommendation = 'stock_up';
        urgency = 'high';
        quantityNeeded = predictedDemand - currentStock;
      } else if (stockRatio < 0.8) {
        // 50-80% of predicted demand
        recommendation = 'stock_up';
        urgency = 'medium';
        quantityNeeded = predictedDemand - currentStock;
      } else if (stockRatio > 2) {
        // More than 200% of predicted demand
        recommendation = 'reduce';
        urgency = 'medium';
        quantityNeeded = currentStock - predictedDemand;
      } else if (stockRatio > 1.5) {
        // 150-200% of predicted demand
        recommendation = 'reduce';
        urgency = 'low';
        quantityNeeded = currentStock - predictedDemand;
      } else {
        // 80-150% of predicted demand - good range
        recommendation = 'maintain';
        urgency = 'low';
        quantityNeeded = 0;
      }

      recs.push({
        product_id: data.product_id,
        product_name: data.product_name,
        current_stock: currentStock,
        predicted_demand: predictedDemand,
        recommendation,
        urgency,
        quantity_needed: Math.abs(Math.round(quantityNeeded)),
        confidence: avgConfidence,
      });
    });

    // Sort by urgency (high first) and then by quantity needed
    return recs.sort((a, b) => {
      const urgencyOrder = { high: 0, medium: 1, low: 2 };
      if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      }
      return b.quantity_needed - a.quantity_needed;
    });
  }, [forecasts]);

  const stockUpRecs = recommendations.filter((r) => r.recommendation === 'stock_up');
  const reduceRecs = recommendations.filter((r) => r.recommendation === 'reduce');
  const maintainRecs = recommendations.filter((r) => r.recommendation === 'maintain');

  return (
    <Card variant="bordered" padding="lg">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-b2b-dark">Inventory Recommendations</h2>
        <p className="text-sm text-b2b-gray-500 mt-1">
          AI-powered suggestions based on predicted demand
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <FiTrendingUp className="h-5 w-5 text-red-600" />
            <span className="font-medium text-red-900">Stock Up</span>
          </div>
          <div className="text-2xl font-bold text-red-600">{stockUpRecs.length}</div>
          <div className="text-sm text-red-700 mt-1">Products need restocking</div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <FiTrendingDown className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-blue-900">Reduce</span>
          </div>
          <div className="text-2xl font-bold text-blue-600">{reduceRecs.length}</div>
          <div className="text-sm text-blue-700 mt-1">Products overstocked</div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <FiCheckCircle className="h-5 w-5 text-green-600" />
            <span className="font-medium text-green-900">Maintain</span>
          </div>
          <div className="text-2xl font-bold text-green-600">{maintainRecs.length}</div>
          <div className="text-sm text-green-700 mt-1">Products well-stocked</div>
        </div>
      </div>

      {/* Recommendations List */}
      <div className="space-y-3">
        {recommendations.length === 0 ? (
          <div className="text-center py-8 text-b2b-gray-400">
            No recommendations available
          </div>
        ) : (
          <>
            {/* Stock Up Recommendations */}
            {stockUpRecs.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-b2b-gray-700 mb-2 flex items-center gap-2">
                  <FiTrendingUp className="h-4 w-4 text-red-600" />
                  Stock Up Needed
                </h3>
                {stockUpRecs.map((rec) => (
                  <div
                    key={rec.product_id}
                    className="bg-red-50 border-l-4 border-red-500 p-4 mb-2 rounded"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium text-b2b-dark">{rec.product_name}</div>
                        <div className="text-sm text-b2b-gray-600 mt-1">
                          Current: {rec.current_stock} units | Predicted demand: {rec.predicted_demand} units
                        </div>
                        <div className="text-sm font-medium text-red-700 mt-1">
                          Order {rec.quantity_needed} more units
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={rec.urgency === 'high' ? 'error' : 'warning'} size="sm">
                          {rec.urgency === 'high' ? 'Urgent' : 'Medium'}
                        </Badge>
                        <div className="text-xs text-b2b-gray-500 mt-1">
                          {Math.round(rec.confidence * 100)}% confidence
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reduce Recommendations */}
            {reduceRecs.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-b2b-gray-700 mb-2 flex items-center gap-2">
                  <FiTrendingDown className="h-4 w-4 text-blue-600" />
                  Reduce Stock
                </h3>
                {reduceRecs.map((rec) => (
                  <div
                    key={rec.product_id}
                    className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-2 rounded"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium text-b2b-dark">{rec.product_name}</div>
                        <div className="text-sm text-b2b-gray-600 mt-1">
                          Current: {rec.current_stock} units | Predicted demand: {rec.predicted_demand} units
                        </div>
                        <div className="text-sm font-medium text-blue-700 mt-1">
                          {rec.quantity_needed} units excess
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="info" size="sm">
                          {rec.urgency === 'medium' ? 'Review' : 'Monitor'}
                        </Badge>
                        <div className="text-xs text-b2b-gray-500 mt-1">
                          {Math.round(rec.confidence * 100)}% confidence
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

