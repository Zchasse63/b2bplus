/**
 * Playwright E2E Tests - Core User Flows
 * 
 * Tests for key user journeys:
 * - Lead capture to account creation
 * - Browse to cart to checkout
 * - Invoice generation
 * - AI campaign flows
 */

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

test.describe('Core User Flows', () => {
  test('Lead capture to account creation', async ({ page }) => {
    // Navigate to lead capture page
    await page.goto(`${BASE_URL}/leads/capture`)
    
    // Fill lead form
    const email = `test-${Date.now()}@example.com`
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="company"]', 'Test Company')
    await page.fill('input[name="name"]', 'Test User')
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Verify success message
    await expect(page.locator('text=Thank you')).toBeVisible()
  })

  test('Browse to cart to checkout', async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password')
    await page.click('button[type="submit"]')
    
    // Wait for redirect to dashboard
    await page.waitForURL(`${BASE_URL}/dashboard`)
    
    // Navigate to products
    await page.goto(`${BASE_URL}/products`)
    
    // Add product to cart
    await page.click('button:has-text("Add to Cart")')
    
    // Verify cart updated
    const cartCount = await page.locator('[data-testid="cart-count"]')
    await expect(cartCount).toContainText('1')
    
    // Go to cart
    await page.goto(`${BASE_URL}/cart`)
    
    // Proceed to checkout
    await page.click('button:has-text("Checkout")')
    
    // Verify checkout page
    await expect(page).toHaveURL(/.*checkout/)
  })

  test('Invoice generation', async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password')
    await page.click('button[type="submit"]')
    
    // Navigate to orders
    await page.goto(`${BASE_URL}/orders`)
    
    // Click on first order
    await page.click('a[data-testid="order-link"]:first-child')
    
    // Verify order details
    await expect(page.locator('text=Order Details')).toBeVisible()
    
    // Download invoice
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Download Invoice")')
    const download = await downloadPromise
    
    // Verify invoice file
    expect(download.suggestedFilename()).toContain('invoice')
  })

  test('AI campaign flow', async ({ page }) => {
    // Login as admin
    await page.goto(`${BASE_URL}/admin/login`)
    await page.fill('input[type="email"]', 'admin@example.com')
    await page.fill('input[type="password"]', 'password')
    await page.click('button[type="submit"]')
    
    // Navigate to campaigns
    await page.goto(`${BASE_URL}/admin/campaigns`)
    
    // Create new campaign
    await page.click('button:has-text("New Campaign")')
    
    // Fill campaign details
    await page.fill('input[name="name"]', 'Test Campaign')
    await page.fill('textarea[name="description"]', 'Test campaign description')
    
    // Select recipients
    await page.click('button:has-text("Select Recipients")')
    await page.click('input[type="checkbox"]:first-child')
    
    // Send campaign
    await page.click('button:has-text("Send Campaign")')
    
    // Verify success
    await expect(page.locator('text=Campaign sent')).toBeVisible()
  })

  test('Chatbot interaction', async ({ page }) => {
    // Navigate to chatbot
    await page.goto(`${BASE_URL}/chatbot`)
    
    // Start conversation
    await page.fill('input[placeholder="Type your message"]', 'Hello')
    await page.press('input[placeholder="Type your message"]', 'Enter')
    
    // Wait for response
    await page.waitForSelector('[data-testid="chatbot-response"]')
    
    // Verify response appears
    const response = await page.locator('[data-testid="chatbot-response"]')
    await expect(response).toBeVisible()
  })
})

