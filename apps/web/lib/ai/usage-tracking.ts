import { createClient } from '@/lib/supabase/server';

/**
 * AI Usage Tracking
 * Phase 1, Task 2.5: AI Usage Tracking
 * 
 * Tracks AI endpoint usage for monitoring, billing, and analytics.
 * Logs all AI operations to ai_usage_logs table.
 */

/**
 * AI Usage Log Entry
 */
export interface AIUsageLog {
  userId: string;
  organizationId: string;
  endpoint: string;
  operationType: string;
  tokensUsed?: number;
  costUsd?: number;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

/**
 * AI Usage Statistics
 */
export interface AIUsageStats {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  successRate: number;
  topEndpoints: Array<{
    endpoint: string;
    count: number;
    tokens: number;
    cost: number;
  }>;
}

/**
 * Gemini AI Pricing (as of 2024)
 * https://ai.google.dev/pricing
 */
const GEMINI_PRICING = {
  // Gemini 1.5 Flash (default)
  FLASH_INPUT: 0.00015 / 1000, // $0.15 per 1M tokens = $0.00015 per 1K tokens
  FLASH_OUTPUT: 0.0006 / 1000, // $0.60 per 1M tokens = $0.0006 per 1K tokens
  
  // Gemini 1.5 Pro
  PRO_INPUT: 0.00125 / 1000, // $1.25 per 1M tokens
  PRO_OUTPUT: 0.005 / 1000, // $5.00 per 1M tokens
  
  // Embedding model
  EMBEDDING: 0.00001 / 1000, // $0.01 per 1M tokens
} as const;

/**
 * Calculate cost for AI operation
 * 
 * @param tokensUsed - Number of tokens used
 * @param model - AI model used ('flash' | 'pro' | 'embedding')
 * @param isOutput - Whether tokens are output tokens (higher cost)
 * @returns Cost in USD
 */
export function calculateAICost(
  tokensUsed: number,
  model: 'flash' | 'pro' | 'embedding' = 'flash',
  isOutput: boolean = false
): number {
  if (tokensUsed <= 0) return 0;
  
  let pricePerToken: number;
  
  switch (model) {
    case 'pro':
      pricePerToken = isOutput ? GEMINI_PRICING.PRO_OUTPUT : GEMINI_PRICING.PRO_INPUT;
      break;
    case 'embedding':
      pricePerToken = GEMINI_PRICING.EMBEDDING;
      break;
    case 'flash':
    default:
      pricePerToken = isOutput ? GEMINI_PRICING.FLASH_OUTPUT : GEMINI_PRICING.FLASH_INPUT;
      break;
  }
  
  return tokensUsed * pricePerToken;
}

/**
 * Log AI usage to database
 * 
 * @param log - AI usage log entry
 * @returns Promise that resolves when log is saved
 */
export async function logAIUsage(log: AIUsageLog): Promise<void> {
  try {
    const supabase = await createClient();
    
    // Calculate cost if tokens provided
    const costUsd = log.tokensUsed 
      ? calculateAICost(log.tokensUsed, 'flash', false)
      : log.costUsd || 0;
    
    // Insert log entry
    const { error } = await supabase
      .from('ai_usage_logs')
      .insert({
        user_id: log.userId,
        organization_id: log.organizationId,
        endpoint: log.endpoint,
        operation_type: log.operationType,
        tokens_used: log.tokensUsed || 0,
        cost_usd: costUsd,
        success: log.success,
        error_message: log.errorMessage,
        metadata: log.metadata,
      });
    
    if (error) {
      console.error('Failed to log AI usage:', error);
      // Don't throw - logging failure shouldn't break the main operation
    }
  } catch (error) {
    console.error('AI usage logging error:', error);
    // Don't throw - logging failure shouldn't break the main operation
  }
}

/**
 * Log AI usage with automatic error handling
 * Wrapper that never throws, safe to use in production
 * 
 * @param userId - User ID
 * @param organizationId - Organization ID
 * @param endpoint - API endpoint path
 * @param operationType - Type of operation (e.g., 'customer-insights', 'forecast')
 * @param tokensUsed - Number of tokens used
 * @param success - Whether operation succeeded
 * @param errorMessage - Error message if failed
 * @param metadata - Additional metadata
 */
export async function safeLogAIUsage(
  userId: string,
  organizationId: string,
  endpoint: string,
  operationType: string,
  tokensUsed?: number,
  success: boolean = true,
  errorMessage?: string,
  metadata?: Record<string, any>
): Promise<void> {
  await logAIUsage({
    userId,
    organizationId,
    endpoint,
    operationType,
    tokensUsed,
    success,
    errorMessage,
    metadata,
  });
}

/**
 * Get AI usage statistics for an organization
 * 
 * @param organizationId - Organization ID
 * @param startDate - Start date for statistics (default: 30 days ago)
 * @param endDate - End date for statistics (default: now)
 * @returns AI usage statistics
 */
export async function getOrganizationAIUsage(
  organizationId: string,
  startDate?: Date,
  endDate?: Date
): Promise<AIUsageStats> {
  const supabase = await createClient();
  
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const end = endDate || new Date();
  
  // Get all logs for organization in date range
  const { data: logs, error } = await supabase
    .from('ai_usage_logs')
    .select('*')
    .eq('organization_id', organizationId)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());
  
  if (error || !logs) {
    console.error('Failed to fetch AI usage:', error);
    return {
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      successRate: 0,
      topEndpoints: [],
    };
  }
  
  // Calculate statistics
  const totalRequests = logs.length;
  const totalTokens = logs.reduce((sum, log) => sum + (log.tokens_used || 0), 0);
  const totalCost = logs.reduce((sum, log) => sum + (log.cost_usd || 0), 0);
  const successCount = logs.filter(log => log.success).length;
  const successRate = totalRequests > 0 ? (successCount / totalRequests) * 100 : 0;
  
  // Group by endpoint
  const endpointMap = new Map<string, { count: number; tokens: number; cost: number }>();
  logs.forEach(log => {
    const existing = endpointMap.get(log.endpoint) || { count: 0, tokens: 0, cost: 0 };
    endpointMap.set(log.endpoint, {
      count: existing.count + 1,
      tokens: existing.tokens + (log.tokens_used || 0),
      cost: existing.cost + (log.cost_usd || 0),
    });
  });
  
  // Convert to array and sort by count
  const topEndpoints = Array.from(endpointMap.entries())
    .map(([endpoint, stats]) => ({ endpoint, ...stats }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  return {
    totalRequests,
    totalTokens,
    totalCost,
    successRate,
    topEndpoints,
  };
}

/**
 * Get AI usage statistics for a user
 * 
 * @param userId - User ID
 * @param startDate - Start date for statistics (default: 30 days ago)
 * @param endDate - End date for statistics (default: now)
 * @returns AI usage statistics
 */
export async function getUserAIUsage(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<AIUsageStats> {
  const supabase = await createClient();
  
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate || new Date();
  
  const { data: logs, error } = await supabase
    .from('ai_usage_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());
  
  if (error || !logs) {
    return {
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      successRate: 0,
      topEndpoints: [],
    };
  }
  
  const totalRequests = logs.length;
  const totalTokens = logs.reduce((sum, log) => sum + (log.tokens_used || 0), 0);
  const totalCost = logs.reduce((sum, log) => sum + (log.cost_usd || 0), 0);
  const successCount = logs.filter(log => log.success).length;
  const successRate = totalRequests > 0 ? (successCount / totalRequests) * 100 : 0;
  
  const endpointMap = new Map<string, { count: number; tokens: number; cost: number }>();
  logs.forEach(log => {
    const existing = endpointMap.get(log.endpoint) || { count: 0, tokens: 0, cost: 0 };
    endpointMap.set(log.endpoint, {
      count: existing.count + 1,
      tokens: existing.tokens + (log.tokens_used || 0),
      cost: existing.cost + (log.cost_usd || 0),
    });
  });
  
  const topEndpoints = Array.from(endpointMap.entries())
    .map(([endpoint, stats]) => ({ endpoint, ...stats }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  return {
    totalRequests,
    totalTokens,
    totalCost,
    successRate,
    topEndpoints,
  };
}

/**
 * Check if organization is approaching AI usage limits
 * 
 * @param organizationId - Organization ID
 * @param monthlyLimit - Monthly cost limit in USD (default: $100)
 * @returns Object with usage info and warning flag
 */
export async function checkAIUsageLimits(
  organizationId: string,
  monthlyLimit: number = 100
): Promise<{
  currentCost: number;
  limit: number;
  percentUsed: number;
  isApproachingLimit: boolean;
  isOverLimit: boolean;
}> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  
  const stats = await getOrganizationAIUsage(organizationId, startOfMonth);
  
  const percentUsed = (stats.totalCost / monthlyLimit) * 100;
  
  return {
    currentCost: stats.totalCost,
    limit: monthlyLimit,
    percentUsed,
    isApproachingLimit: percentUsed >= 80,
    isOverLimit: percentUsed >= 100,
  };
}

