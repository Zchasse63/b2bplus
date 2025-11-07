/**
 * Rate Limiting Utility
 *
 * Provides token bucket rate limiting using Supabase for persistence
 * This prevents abuse of expensive AI operations and protects API endpoints
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface RateLimitConfig {
  /**
   * Unique identifier for the rate limit bucket
   * Example: 'semantic-search', 'ai-generation', 'api-endpoint'
   */
  key: string;

  /**
   * User or client identifier
   */
  identifier: string;

  /**
   * Maximum number of requests allowed in the time window
   */
  maxRequests: number;

  /**
   * Time window in seconds
   */
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  limit: number;
}

/**
 * Check if a request is within rate limits
 * Uses token bucket algorithm with sliding window
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowSeconds * 1000);
  const bucketKey = `${config.key}:${config.identifier}`;

  // Get or create rate limit entry
  const { data: existingEntry } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('bucket_key', bucketKey)
    .single();

  if (!existingEntry) {
    // First request - create new entry
    await supabase
      .from('rate_limits')
      .insert({
        bucket_key: bucketKey,
        identifier: config.identifier,
        requests_count: 1,
        window_start: now.toISOString(),
        window_end: new Date(now.getTime() + config.windowSeconds * 1000).toISOString(),
      });

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: new Date(now.getTime() + config.windowSeconds * 1000),
      limit: config.maxRequests,
    };
  }

  const windowEnd = new Date(existingEntry.window_end);

  // Check if window has expired
  if (now >= windowEnd) {
    // Reset window
    await supabase
      .from('rate_limits')
      .update({
        requests_count: 1,
        window_start: now.toISOString(),
        window_end: new Date(now.getTime() + config.windowSeconds * 1000).toISOString(),
      })
      .eq('bucket_key', bucketKey);

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: new Date(now.getTime() + config.windowSeconds * 1000),
      limit: config.maxRequests,
    };
  }

  // Window is still active
  const currentCount = existingEntry.requests_count || 0;

  if (currentCount >= config.maxRequests) {
    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetAt: windowEnd,
      limit: config.maxRequests,
    };
  }

  // Increment counter
  await supabase
    .from('rate_limits')
    .update({
      requests_count: currentCount + 1,
    })
    .eq('bucket_key', bucketKey);

  return {
    allowed: true,
    remaining: config.maxRequests - currentCount - 1,
    resetAt: windowEnd,
    limit: config.maxRequests,
  };
}

/**
 * Reset rate limit for a specific key/identifier
 * Useful for testing or manual intervention
 */
export async function resetRateLimit(
  supabase: SupabaseClient,
  key: string,
  identifier: string
): Promise<void> {
  const bucketKey = `${key}:${identifier}`;
  await supabase
    .from('rate_limits')
    .delete()
    .eq('bucket_key', bucketKey);
}

/**
 * Clean up expired rate limit entries
 * Should be run periodically (e.g., daily cron job)
 */
export async function cleanupExpiredRateLimits(
  supabase: SupabaseClient
): Promise<number> {
  const now = new Date();
  const { data } = await supabase
    .from('rate_limits')
    .delete()
    .lt('window_end', now.toISOString())
    .select();

  return data?.length || 0;
}
