/**
 * AI Metrics Tracking
 * 
 * Task 4.2: Implement AI usage metrics tracking
 * Task 4.3: Implement business metrics tracking
 * Task 4.4: Implement performance metrics tracking
 */

import { createClient } from '@/lib/supabase/server';

export interface AIUsageMetric {
  organizationId: string;
  userId?: string;
  metricType: 'chatbot' | 'opportunity_detection' | 'pricing_optimization' | 'invoice_processing';
  operation: string;
  modelName: 'gemini-2.5-flash' | 'gemini-2.5-pro';
  tokensUsed?: number;
  responseTimeMs: number;
  cacheHit?: boolean;
  success?: boolean;
  errorMessage?: string;
  customerId?: string;
  productId?: string;
  orderId?: string;
  metadata?: Record<string, any>;
}

export interface BusinessMetric {
  organizationId: string;
  metricType: 'opportunity_pursued' | 'pricing_approved' | 'lead_captured' | 'forecast_accuracy';
  metricValue: number;
  metricUnit?: 'count' | 'dollars' | 'percentage';
  customerId?: string;
  productId?: string;
  opportunityId?: string;
  pricingSuggestionId?: string;
  metadata?: Record<string, any>;
  periodStart?: Date;
  periodEnd?: Date;
}

export interface PerformanceMetric {
  organizationId: string;
  metricName: 'avg_response_time' | 'cache_hit_rate' | 'error_rate' | 'throughput';
  metricValue: number;
  metricUnit?: 'ms' | 'percentage' | 'requests_per_minute';
  aggregationPeriod: 'hourly' | 'daily' | 'weekly' | 'monthly';
  periodStart: Date;
  periodEnd: Date;
  metadata?: Record<string, any>;
}

/**
 * Record AI usage metric
 */
export async function recordAIUsage(metric: AIUsageMetric): Promise<void> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase.from('ai_usage_metrics').insert({
      organization_id: metric.organizationId,
      user_id: metric.userId,
      metric_type: metric.metricType,
      operation: metric.operation,
      model_name: metric.modelName,
      tokens_used: metric.tokensUsed,
      response_time_ms: metric.responseTimeMs,
      cache_hit: metric.cacheHit || false,
      success: metric.success !== false,
      error_message: metric.errorMessage,
      customer_id: metric.customerId,
      product_id: metric.productId,
      order_id: metric.orderId,
      metadata: metric.metadata || {},
    });

    if (error) {
      console.error('[Metrics] Failed to record AI usage:', error);
    }
  } catch (error) {
    console.error('[Metrics] Error recording AI usage:', error);
  }
}

/**
 * Record business metric
 */
export async function recordBusinessMetric(metric: BusinessMetric): Promise<void> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase.from('ai_business_metrics').insert({
      organization_id: metric.organizationId,
      metric_type: metric.metricType,
      metric_value: metric.metricValue,
      metric_unit: metric.metricUnit,
      customer_id: metric.customerId,
      product_id: metric.productId,
      opportunity_id: metric.opportunityId,
      pricing_suggestion_id: metric.pricingSuggestionId,
      metadata: metric.metadata || {},
      period_start: metric.periodStart,
      period_end: metric.periodEnd,
    });

    if (error) {
      console.error('[Metrics] Failed to record business metric:', error);
    }
  } catch (error) {
    console.error('[Metrics] Error recording business metric:', error);
  }
}

/**
 * Record performance metric
 */
export async function recordPerformanceMetric(metric: PerformanceMetric): Promise<void> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase.from('ai_performance_metrics').insert({
      organization_id: metric.organizationId,
      metric_name: metric.metricName,
      metric_value: metric.metricValue,
      metric_unit: metric.metricUnit,
      aggregation_period: metric.aggregationPeriod,
      period_start: metric.periodStart,
      period_end: metric.periodEnd,
      metadata: metric.metadata || {},
    });

    if (error) {
      console.error('[Metrics] Failed to record performance metric:', error);
    }
  } catch (error) {
    console.error('[Metrics] Error recording performance metric:', error);
  }
}

/**
 * Get AI usage statistics
 */
export async function getAIUsageStats(
  organizationId: string,
  startDate?: Date,
  endDate?: Date
): Promise<any[]> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase.rpc('get_ai_usage_stats', {
      p_organization_id: organizationId,
      p_start_date: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      p_end_date: endDate || new Date(),
    });

    if (error) {
      console.error('[Metrics] Failed to get AI usage stats:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[Metrics] Error getting AI usage stats:', error);
    return [];
  }
}

/**
 * Wrapper to track AI operations with metrics
 */
export async function trackAIOperation<T>(
  operation: {
    organizationId: string;
    userId?: string;
    metricType: AIUsageMetric['metricType'];
    operationName: string;
    modelName: AIUsageMetric['modelName'];
    customerId?: string;
    productId?: string;
    orderId?: string;
  },
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  let success = true;
  let errorMessage: string | undefined;
  let result: T;

  try {
    result = await fn();
    return result;
  } catch (error: any) {
    success = false;
    errorMessage = error.message;
    throw error;
  } finally {
    const responseTimeMs = Date.now() - startTime;

    // Record metric asynchronously (don't block)
    recordAIUsage({
      organizationId: operation.organizationId,
      userId: operation.userId,
      metricType: operation.metricType,
      operation: operation.operationName,
      modelName: operation.modelName,
      responseTimeMs,
      success,
      errorMessage,
      customerId: operation.customerId,
      productId: operation.productId,
      orderId: operation.orderId,
    }).catch(err => {
      console.error('[Metrics] Failed to record metric:', err);
    });
  }
}

/**
 * Track opportunity pursuit
 */
export async function trackOpportunityPursued(
  organizationId: string,
  opportunityId: string,
  customerId: string,
  estimatedValue: number
): Promise<void> {
  await recordBusinessMetric({
    organizationId,
    metricType: 'opportunity_pursued',
    metricValue: estimatedValue,
    metricUnit: 'dollars',
    customerId,
    opportunityId,
  });
}

/**
 * Track pricing approval
 */
export async function trackPricingApproved(
  organizationId: string,
  pricingSuggestionId: string,
  customerId: string,
  productId: string,
  revenueImpact: number
): Promise<void> {
  await recordBusinessMetric({
    organizationId,
    metricType: 'pricing_approved',
    metricValue: revenueImpact,
    metricUnit: 'dollars',
    customerId,
    productId,
    pricingSuggestionId,
  });
}

/**
 * Track lead capture
 */
export async function trackLeadCaptured(
  organizationId: string,
  leadQualityScore: number
): Promise<void> {
  await recordBusinessMetric({
    organizationId,
    metricType: 'lead_captured',
    metricValue: leadQualityScore,
    metricUnit: 'count',
  });
}

/**
 * Calculate and record performance metrics
 */
export async function calculatePerformanceMetrics(
  organizationId: string,
  period: 'hourly' | 'daily' | 'weekly' | 'monthly'
): Promise<void> {
  const supabase = await createClient();
  
  // Calculate period boundaries
  const now = new Date();
  let periodStart: Date;
  
  switch (period) {
    case 'hourly':
      periodStart = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case 'daily':
      periodStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'weekly':
      periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'monthly':
      periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
  }

  // Get usage metrics for period
  const { data: metrics } = await supabase
    .from('ai_usage_metrics')
    .select('*')
    .eq('organization_id', organizationId)
    .gte('created_at', periodStart.toISOString())
    .lte('created_at', now.toISOString());

  if (!metrics || metrics.length === 0) return;

  // Calculate average response time
  const avgResponseTime = metrics.reduce((sum, m) => sum + m.response_time_ms, 0) / metrics.length;
  await recordPerformanceMetric({
    organizationId,
    metricName: 'avg_response_time',
    metricValue: avgResponseTime,
    metricUnit: 'ms',
    aggregationPeriod: period,
    periodStart,
    periodEnd: now,
  });

  // Calculate cache hit rate
  const cacheHits = metrics.filter(m => m.cache_hit).length;
  const cacheHitRate = (cacheHits / metrics.length) * 100;
  await recordPerformanceMetric({
    organizationId,
    metricName: 'cache_hit_rate',
    metricValue: cacheHitRate,
    metricUnit: 'percentage',
    aggregationPeriod: period,
    periodStart,
    periodEnd: now,
  });

  // Calculate error rate
  const errors = metrics.filter(m => !m.success).length;
  const errorRate = (errors / metrics.length) * 100;
  await recordPerformanceMetric({
    organizationId,
    metricName: 'error_rate',
    metricValue: errorRate,
    metricUnit: 'percentage',
    aggregationPeriod: period,
    periodStart,
    periodEnd: now,
  });

  // Calculate throughput
  const durationMinutes = (now.getTime() - periodStart.getTime()) / (60 * 1000);
  const throughput = metrics.length / durationMinutes;
  await recordPerformanceMetric({
    organizationId,
    metricName: 'throughput',
    metricValue: throughput,
    metricUnit: 'requests_per_minute',
    aggregationPeriod: period,
    periodStart,
    periodEnd: now,
  });
}

