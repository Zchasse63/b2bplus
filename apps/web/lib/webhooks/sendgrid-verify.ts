/**
 * SendGrid Webhook Signature Verification
 * 
 * Verifies that webhook requests are genuinely from SendGrid using
 * cryptographic signature verification.
 * 
 * Reference: https://docs.sendgrid.com/for-developers/tracking/signed-webhooks
 */

import crypto from 'crypto'

/**
 * Verify SendGrid webhook signature
 * 
 * @param payload - Raw request body as string
 * @param signature - X-Twilio-Email-Event-Webhook-Signature header value
 * @param timestamp - X-Twilio-Email-Event-Webhook-Timestamp header value
 * @param signingKey - SendGrid webhook signing key from environment
 * @returns true if signature is valid, false otherwise
 */
export function verifySendGridSignature(
  payload: string,
  signature: string | undefined,
  timestamp: string | undefined,
  signingKey: string | undefined
): boolean {
  // Validate inputs
  if (!signature || !timestamp || !signingKey) {
    console.warn('Missing SendGrid webhook signature headers or signing key')
    return false
  }

  try {
    // Construct the signed content: timestamp + payload
    const signedContent = timestamp + payload

    // Create HMAC-SHA256 hash
    const hash = crypto
      .createHmac('sha256', signingKey)
      .update(signedContent)
      .digest('base64')

    // Compare signatures using constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(hash)
    )
  } catch (error) {
    console.error('Error verifying SendGrid signature:', error)
    return false
  }
}

/**
 * Extract SendGrid webhook headers from request
 */
export function extractSendGridHeaders(request: Request) {
  return {
    signature: request.headers.get('x-twilio-email-event-webhook-signature'),
    timestamp: request.headers.get('x-twilio-email-event-webhook-timestamp'),
  }
}

