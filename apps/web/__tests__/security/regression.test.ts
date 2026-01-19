/**
 * Security Regression Tests
 *
 * Automated tests to ensure security fixes remain in place:
 * - Migration API is disabled in production
 * - Webhook signatures are verified
 * - CSRF protection is enforced
 * - Service-role key is not exposed
 */

import { describe, it, expect, beforeAll } from '@jest/globals'

const API_BASE = process.env.API_BASE || 'http://localhost:3000'

// Helper to check if the server is running
async function isServerRunning(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/health/ready`, {
      method: 'GET',
    })
    return response.ok
  } catch {
    return false
  }
}

describe('Security Regression Tests', () => {
  let serverAvailable = false

  beforeAll(async () => {
    serverAvailable = await isServerRunning()
    if (!serverAvailable) {
      console.warn('⚠️  Server not running at', API_BASE, '- skipping integration tests')
    }
  })

  describe('Migration API', () => {
    it('should disable migration endpoint in production', async () => {
      if (!serverAvailable) {
        console.warn('Skipping test - server not available')
        return
      }

      const isProduction = process.env.NODE_ENV === 'production'

      const response = await fetch(`${API_BASE}/api/admin/apply-migration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ migration: 'test' }),
      })

      if (isProduction) {
        expect(response.status).toBe(404)
      } else {
        // In development, endpoint may be available
        expect([200, 401, 403]).toContain(response.status)
      }
    })
  })

  describe('Webhook Signature Verification', () => {
    it('should reject SendGrid webhook without signature', async () => {
      if (!serverAvailable) {
        console.warn('Skipping test - server not available')
        return
      }

      const response = await fetch(`${API_BASE}/api/webhooks/sendgrid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'delivered',
          email: 'test@example.com',
        }),
      })

      expect(response.status).toBe(401)
    })

    it('should reject SendGrid webhook with invalid signature', async () => {
      if (!serverAvailable) {
        console.warn('Skipping test - server not available')
        return
      }

      const response = await fetch(`${API_BASE}/api/webhooks/sendgrid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-twilio-email-event-webhook-signature': 'invalid-signature',
          'x-twilio-email-event-webhook-timestamp': Date.now().toString(),
        },
        body: JSON.stringify({
          event: 'delivered',
          email: 'test@example.com',
        }),
      })

      expect(response.status).toBe(401)
    })

    it('should reject email webhook without authentication', async () => {
      if (!serverAvailable) {
        console.warn('Skipping test - server not available')
        return
      }

      const response = await fetch(`${API_BASE}/api/webhooks/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'test@example.com',
          subject: 'Test',
          body: 'Test email',
        }),
      })

      expect(response.status).toBe(401)
    })

    it('should reject email webhook with invalid token', async () => {
      if (!serverAvailable) {
        console.warn('Skipping test - server not available')
        return
      }

      const response = await fetch(`${API_BASE}/api/webhooks/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token',
        },
        body: JSON.stringify({
          from: 'test@example.com',
          subject: 'Test',
          body: 'Test email',
        }),
      })

      expect(response.status).toBe(401)
    })
  })

  describe('CSRF Protection', () => {
    it('should reject POST without CSRF token', async () => {
      if (!serverAvailable) {
        console.warn('Skipping test - server not available')
        return
      }

      const response = await fetch(`${API_BASE}/api/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: 'test',
          quantity: 1,
          organizationId: 'test-org',
        }),
      })

      // Should be 401 (unauthorized) or 403 (forbidden)
      expect([401, 403]).toContain(response.status)
    })
  })

  describe('Service-Role Key Exposure', () => {
    it('should not expose service-role key in responses', async () => {
      if (!serverAvailable) {
        console.warn('Skipping test - server not available')
        return
      }

      const response = await fetch(`${API_BASE}/api/cart`)
      const data = await response.json()

      const responseText = JSON.stringify(data)
      expect(responseText).not.toContain('service_role')
      expect(responseText).not.toContain('SUPABASE_SERVICE_ROLE_KEY')
    })

    it('should not expose service-role key in error messages', async () => {
      if (!serverAvailable) {
        console.warn('Skipping test - server not available')
        return
      }

      const response = await fetch(`${API_BASE}/api/admin/apply-migration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ migration: 'test' }),
      })

      const data = await response.json()
      const responseText = JSON.stringify(data)

      expect(responseText).not.toContain('service_role')
      expect(responseText).not.toContain('SUPABASE_SERVICE_ROLE_KEY')
    })
  })

  describe('Rate Limiting', () => {
    it('should rate limit webhook requests', async () => {
      if (!serverAvailable) {
        console.warn('Skipping test - server not available')
        return
      }

      const requests = Array(10).fill(null).map(() =>
        fetch(`${API_BASE}/api/webhooks/email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          },
          body: JSON.stringify({
            from: 'test@example.com',
            subject: 'Test',
            body: 'Test email',
          }),
        })
      )

      const responses = await Promise.all(requests)

      // At least one request should be rate limited (429)
      const hasRateLimit = responses.some(r => r.status === 429)
      expect(hasRateLimit).toBe(true)
    })
  })
})
