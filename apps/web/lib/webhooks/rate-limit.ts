/**
 * Webhook Rate Limiting
 * 
 * Simple in-memory rate limiting for webhook endpoints.
 * For production, consider using Redis or a dedicated rate limiting service.
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store for rate limit tracking
const rateLimitStore = new Map<string, RateLimitEntry>()

/**
 * Check if a request should be rate limited
 * 
 * @param key - Unique identifier (e.g., IP address, webhook source)
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns true if request is allowed, false if rate limited
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute default
): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetTime) {
    // Create new entry or reset existing one
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    })
    return true
  }

  // Check if limit exceeded
  if (entry.count >= maxRequests) {
    return false
  }

  // Increment counter
  entry.count++
  return true
}

/**
 * Get rate limit status for a key
 */
export function getRateLimitStatus(key: string) {
  const entry = rateLimitStore.get(key)
  if (!entry) {
    return { remaining: -1, resetTime: null }
  }

  const now = Date.now()
  if (now > entry.resetTime) {
    return { remaining: -1, resetTime: null }
  }

  return {
    remaining: Math.max(0, 100 - entry.count),
    resetTime: new Date(entry.resetTime),
  }
}

/**
 * Clear rate limit entry (useful for testing)
 */
export function clearRateLimit(key: string) {
  rateLimitStore.delete(key)
}

/**
 * Clear all rate limit entries (useful for testing)
 */
export function clearAllRateLimits() {
  rateLimitStore.clear()
}

/**
 * Extract client IP from request
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return request.headers.get('x-real-ip') || 'unknown'
}

