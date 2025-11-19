/**
 * Email Webhook Authentication
 * 
 * Verifies that inbound email webhooks are from authorized sources.
 * Supports multiple authentication methods:
 * - Bearer token in Authorization header
 * - HMAC signature verification
 */

import crypto from 'crypto'

/**
 * Verify email webhook bearer token
 * 
 * @param authHeader - Authorization header value (e.g., "Bearer token123")
 * @param expectedSecret - Expected secret/token from environment
 * @returns true if token is valid, false otherwise
 */
export function verifyEmailWebhookToken(
  authHeader: string | null,
  expectedSecret: string | undefined
): boolean {
  if (!authHeader || !expectedSecret) {
    return false
  }

  try {
    const [scheme, token] = authHeader.split(' ')
    
    if (scheme !== 'Bearer') {
      return false
    }

    // Use constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(expectedSecret)
    )
  } catch (error) {
    return false
  }
}

/**
 * Verify email webhook HMAC signature
 * 
 * @param payload - Raw request body as string
 * @param signature - X-Email-Webhook-Signature header value
 * @param secret - Webhook secret from environment
 * @returns true if signature is valid, false otherwise
 */
export function verifyEmailWebhookSignature(
  payload: string,
  signature: string | undefined,
  secret: string | undefined
): boolean {
  if (!signature || !secret) {
    return false
  }

  try {
    const hash = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(hash)
    )
  } catch (error) {
    return false
  }
}

/**
 * Extract email webhook authentication headers
 */
export function extractEmailWebhookHeaders(request: Request) {
  return {
    authorization: request.headers.get('authorization'),
    signature: request.headers.get('x-email-webhook-signature'),
  }
}

