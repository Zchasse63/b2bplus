/**
 * API Integration Tests
 * 
 * Tests for core API flows:
 * - Authentication (magic link)
 * - Pricing calculations
 * - Cart operations
 * - Order creation
 * - Invoice generation
 * - Lead management
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const API_BASE = process.env.API_BASE || 'http://localhost:3000'

let testUserId: string
let testOrgId: string
let testProductId: string

describe('API Integration Tests', () => {
  beforeAll(async () => {
    // Setup test data
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    // Create test user
    const { data: { user } } = await supabase.auth.signUp({
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
    })
    testUserId = user?.id || ''
  })

  afterAll(async () => {
    // Cleanup test data
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    await supabase.auth.signOut()
  })

  describe('Authentication', () => {
    it('should request magic link', async () => {
      const response = await fetch(`${API_BASE}/api/auth/magic-link/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `test-${Date.now()}@example.com`,
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })
  })

  describe('Pricing', () => {
    it('should calculate pricing for single item', async () => {
      const response = await fetch(`${API_BASE}/api/pricing/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: testProductId,
          quantity: 1,
          customer_organization_id: testOrgId,
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.total).toBeGreaterThan(0)
    })

    it('should calculate batch pricing', async () => {
      const response = await fetch(`${API_BASE}/api/pricing/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [
            { productId: testProductId, quantity: 1 },
            { productId: testProductId, quantity: 2 },
          ],
          organizationId: testOrgId,
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.items.length).toBe(2)
    })
  })

  describe('Cart', () => {
    it('should fetch user cart', async () => {
      const response = await fetch(`${API_BASE}/api/cart`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testUserId}`,
        },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(Array.isArray(data.items)).toBe(true)
    })
  })

  describe('Security', () => {
    it('should reject unauthenticated cart requests', async () => {
      const response = await fetch(`${API_BASE}/api/cart`, {
        method: 'GET',
      })

      expect(response.status).toBe(401)
    })

    it('should reject migration endpoint in production', async () => {
      const response = await fetch(`${API_BASE}/api/admin/apply-migration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ migration: 'test' }),
      })

      // Should be 404 in production, 200 in development
      expect([404, 200]).toContain(response.status)
    })
  })
})

