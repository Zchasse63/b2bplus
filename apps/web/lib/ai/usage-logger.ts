/**
 * AI Usage Logging
 * Tracks and logs all AI API calls for billing and analytics
 */

import { createClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/logging/logger';
import type { AIMetadata, GeminiResponse, OpenAIResponse } from '@/lib/types/ai';

const logger = createLogger('ai-usage-logger');

export interface AIUsageLog {
  user_id?: string;
  organization_id?: string;
  model: string;
  endpoint: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost: number;
  duration_ms: number;
  status: 'success' | 'error' | 'rate_limited';
  error_message?: string;
  metadata?: AIMetadata;
}

/**
 * Log AI API usage
 */
export async function logAIUsage(
  usage: AIUsageLog,
  userId?: string,
  organizationId?: string
): Promise<void> {
  try {
    const supabase = createClient();

    const { error } = await supabase.from('ai_usage_logs').insert({
      user_id: userId,
      organization_id: organizationId,
      model: usage.model,
      endpoint: usage.endpoint,
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      total_tokens: usage.total_tokens,
      cost: usage.cost,
      duration_ms: usage.duration_ms,
      status: usage.status,
      error_message: usage.error_message,
      metadata: usage.metadata,
      created_at: new Date().toISOString(),
    });

    if (error) {
      logger.error('Failed to log AI usage', error, {
        model: usage.model,
        endpoint: usage.endpoint,
      });
    } else {
      logger.debug('AI usage logged', {
        model: usage.model,
        endpoint: usage.endpoint,
        tokens: usage.total_tokens,
        cost: usage.cost,
      });
    }
  } catch (error) {
    logger.error('Error logging AI usage', error, {
      model: usage.model,
      endpoint: usage.endpoint,
    });
  }
}

/**
 * Calculate cost based on model and tokens
 */
export function calculateAICost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  // Pricing per 1M tokens (as of 2024)
  const pricing: Record<string, { input: number; output: number }> = {
    'gemini-2.5-pro': { input: 0.075, output: 0.3 },
    'gemini-2.5-flash': { input: 0.0375, output: 0.15 },
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  };

  const modelPricing = pricing[model] || pricing['gpt-3.5-turbo'];

  const inputCost = (inputTokens / 1_000_000) * modelPricing.input;
  const outputCost = (outputTokens / 1_000_000) * modelPricing.output;

  return inputCost + outputCost;
}

/**
 * Log Gemini API usage
 */
export async function logGeminiUsage(
  endpoint: string,
  response: GeminiResponse,
  durationMs: number,
  userId?: string,
  organizationId?: string
): Promise<void> {
  try {
    // Extract token counts from response
    const usageMetadata = response.usageMetadata || {};
    const inputTokens = usageMetadata.promptTokenCount || 0;
    const outputTokens = usageMetadata.candidatesTokenCount || 0;
    const totalTokens = inputTokens + outputTokens;

    const cost = calculateAICost('gemini-2.5-pro', inputTokens, outputTokens);

    await logAIUsage(
      {
        model: 'gemini-2.5-pro',
        endpoint,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens,
        cost,
        duration_ms: durationMs,
        status: 'success',
        metadata: {
          finishReason: response.candidates?.[0]?.finishReason,
        },
      },
      userId,
      organizationId
    );
  } catch (error) {
    logger.error('Error logging Gemini usage', error, { endpoint });
  }
}

/**
 * Log OpenAI API usage
 */
export async function logOpenAIUsage(
  endpoint: string,
  response: OpenAIResponse,
  durationMs: number,
  userId?: string,
  organizationId?: string
): Promise<void> {
  try {
    const usage = response.usage || {};
    const inputTokens = usage.prompt_tokens || 0;
    const outputTokens = usage.completion_tokens || 0;
    const totalTokens = usage.total_tokens || 0;

    const cost = calculateAICost('gpt-4', inputTokens, outputTokens);

    await logAIUsage(
      {
        model: 'gpt-4',
        endpoint,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens,
        cost,
        duration_ms: durationMs,
        status: 'success',
      },
      userId,
      organizationId
    );
  } catch (error) {
    logger.error('Error logging OpenAI usage', error, { endpoint });
  }
}

/**
 * Log AI error
 */
export async function logAIError(
  model: string,
  endpoint: string,
  error: Error,
  durationMs: number,
  userId?: string,
  organizationId?: string
): Promise<void> {
  try {
    await logAIUsage(
      {
        model,
        endpoint,
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
        cost: 0,
        duration_ms: durationMs,
        status: 'error',
        error_message: error.message,
      },
      userId,
      organizationId
    );
  } catch (logError) {
    logger.error('Error logging AI error', logError, { model, endpoint });
  }
}

