import { test as setup, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const CUSTOMER_AUTH_FILE = 'playwright/.auth/customer.json';
const ADMIN_AUTH_FILE = 'playwright/.auth/admin.json';

// Get test credentials from environment or use defaults
const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@testmail.app';
const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'AdminPassword123!';
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@testmail.app';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

/**
 * Setup authentication for customer user
 * This runs once before all tests and saves the auth state
 */
setup('authenticate as customer', async ({ page }) => {
  await page.goto('/auth/login');

  // Wait for page to load
  await page.waitForLoadState('networkidle');

  // Fill in login form with test credentials
  await page.fill('[data-testid="email-input"]', TEST_USER_EMAIL);
  await page.fill('[data-testid="password-input"]', TEST_USER_PASSWORD);
  await page.click('[data-testid="login-button"]');

  // Wait for navigation to complete - customers redirect to /chat
  await page.waitForURL('/chat', { timeout: 15000 });

  // Wait for page to fully load
  await page.waitForLoadState('networkidle');

  // Save signed-in state
  await page.context().storageState({ path: CUSTOMER_AUTH_FILE });
});

/**
 * Setup authentication for admin user
 * This runs once before all tests and saves the auth state
 */
setup('authenticate as admin', async ({ page }) => {
  await page.goto('/auth/login');

  // Wait for page to load
  await page.waitForLoadState('networkidle');

  // Fill in login form with admin credentials
  await page.fill('[data-testid="email-input"]', TEST_ADMIN_EMAIL);
  await page.fill('[data-testid="password-input"]', TEST_ADMIN_PASSWORD);
  await page.click('[data-testid="login-button"]');

  // Wait for navigation to complete - admins redirect to /admin
  await page.waitForURL('/admin', { timeout: 15000 });

  // Wait for page to fully load
  await page.waitForLoadState('networkidle');

  // Save signed-in state
  await page.context().storageState({ path: ADMIN_AUTH_FILE });
});

