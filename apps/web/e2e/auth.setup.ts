import { test as setup, expect } from '@playwright/test';

const CUSTOMER_AUTH_FILE = 'playwright/.auth/customer.json';
const ADMIN_AUTH_FILE = 'playwright/.auth/admin.json';

/**
 * Setup authentication for customer user
 * This runs once before all tests and saves the auth state
 */
setup('authenticate as customer', async ({ page }) => {
  await page.goto('/auth/login');
  
  // Click the Demo Customer button
  await page.click('text=Demo Customer');
  
  // Wait for navigation to complete
  await page.waitForURL('/');
  
  // Verify we're logged in by checking for user-specific content
  await expect(page).toHaveURL('/');
  
  // Save signed-in state
  await page.context().storageState({ path: CUSTOMER_AUTH_FILE });
});

/**
 * Setup authentication for admin user
 * This runs once before all tests and saves the auth state
 */
setup('authenticate as admin', async ({ page }) => {
  await page.goto('/auth/login');
  
  // Click the Demo Admin button
  await page.click('text=Demo Admin');
  
  // Wait for navigation to complete
  await page.waitForURL('/');
  
  // Verify we're logged in
  await expect(page).toHaveURL('/');
  
  // Save signed-in state
  await page.context().storageState({ path: ADMIN_AUTH_FILE });
});

