/**
 * Zod Schemas for Analytics AI Outputs
 *
 * These schemas ensure type-safe structured outputs from AI for analytics.
 */

import { z } from 'zod';

// Customer Insights Schema
export const customerInsightsSchema = z.object({
  summary: z.string().describe('Executive summary of customer insights'),
  churnRisk: z.object({
    score: z.number().min(0).max(100).describe('Churn risk score 0-100'),
    level: z.enum(['low', 'medium', 'high', 'critical']),
    factors: z.array(z.string()).describe('Factors contributing to churn risk'),
    recommendations: z.array(z.string()).describe('Actions to reduce churn risk'),
  }),
  opportunities: z.array(z.object({
    type: z.enum(['upsell', 'cross_sell', 'retention', 'expansion']),
    productId: z.string().optional(),
    productName: z.string(),
    probability: z.number().min(0).max(100),
    estimatedValue: z.number(),
    reasoning: z.string(),
  })),
  purchasePatterns: z.object({
    frequency: z.string().describe('Average purchase frequency'),
    averageOrderValue: z.number(),
    preferredCategories: z.array(z.string()),
    seasonality: z.string().optional(),
  }),
  nextBestActions: z.array(z.object({
    action: z.string(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']),
    expectedOutcome: z.string(),
  })),
});

export type CustomerInsights = z.infer<typeof customerInsightsSchema>;

// Churn Risk Schema
export const churnRiskSchema = z.object({
  customerId: z.string(),
  customerName: z.string(),
  score: z.number().min(0).max(100),
  level: z.enum(['low', 'medium', 'high', 'critical']),
  lastOrderDate: z.string().optional(),
  daysSinceLastOrder: z.number(),
  factors: z.array(z.object({
    factor: z.string(),
    impact: z.enum(['low', 'medium', 'high']),
    description: z.string(),
  })),
  recommendedActions: z.array(z.string()),
});

export type ChurnRisk = z.infer<typeof churnRiskSchema>;

// Revenue Metrics Schema
export const revenueMetricsSchema = z.object({
  period: z.string(),
  totalRevenue: z.number(),
  previousPeriodRevenue: z.number(),
  percentChange: z.number(),
  orderCount: z.number(),
  averageOrderValue: z.number(),
  topCategories: z.array(z.object({
    category: z.string(),
    revenue: z.number(),
    percentOfTotal: z.number(),
  })),
  topProducts: z.array(z.object({
    productId: z.string(),
    productName: z.string(),
    revenue: z.number(),
    unitsSold: z.number(),
  })),
  insights: z.array(z.string()),
});

export type RevenueMetrics = z.infer<typeof revenueMetricsSchema>;

// Reorder Predictions Schema
export const reorderPredictionSchema = z.object({
  customerId: z.string(),
  customerName: z.string(),
  predictions: z.array(z.object({
    productId: z.string(),
    productName: z.string(),
    predictedDate: z.string(),
    confidence: z.number().min(0).max(100),
    lastOrderedQuantity: z.number(),
    suggestedQuantity: z.number(),
    averageIntervalDays: z.number(),
  })),
  nextOrderPrediction: z.object({
    estimatedDate: z.string(),
    confidence: z.number(),
    estimatedValue: z.number(),
  }),
});

export type ReorderPrediction = z.infer<typeof reorderPredictionSchema>;

// Product Performance Schema
export const productPerformanceSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  sku: z.string(),
  metrics: z.object({
    totalRevenue: z.number(),
    unitsSold: z.number(),
    averagePrice: z.number(),
    profitMargin: z.number().optional(),
    returnRate: z.number().optional(),
  }),
  trends: z.object({
    revenueGrowth: z.number(),
    demandTrend: z.enum(['increasing', 'stable', 'decreasing']),
    seasonalPeaks: z.array(z.string()).optional(),
  }),
  recommendations: z.array(z.string()),
});

export type ProductPerformance = z.infer<typeof productPerformanceSchema>;

// Executive Summary Schema
export const executiveSummarySchema = z.object({
  period: z.string(),
  overview: z.string(),
  keyMetrics: z.object({
    totalRevenue: z.number(),
    revenueChange: z.number(),
    totalOrders: z.number(),
    ordersChange: z.number(),
    newCustomers: z.number(),
    customerRetentionRate: z.number(),
    averageOrderValue: z.number(),
  }),
  highlights: z.array(z.object({
    type: z.enum(['success', 'warning', 'opportunity', 'risk']),
    title: z.string(),
    description: z.string(),
    impact: z.string().optional(),
  })),
  recommendations: z.array(z.object({
    priority: z.enum(['high', 'medium', 'low']),
    action: z.string(),
    expectedImpact: z.string(),
    timeline: z.string().optional(),
  })),
  outlook: z.string(),
});

export type ExecutiveSummary = z.infer<typeof executiveSummarySchema>;
