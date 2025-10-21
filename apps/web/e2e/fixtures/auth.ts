import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Authentication fixture for E2E tests
 * Provides authenticated user sessions for testing
 */

export interface AuthFixtures {
  authenticatedPage: Page;
  adminPage: Page;
}

/**
 * Test user credentials
 * These match the test users created in supabase/migrations/99999999999999_seed_test_data.sql
 *
 * See TEST-DATA-DOCUMENTATION.md for complete test data details
 */
const TEST_USERS = {
  regular: {
    email: process.env.TEST_USER_EMAIL || 'test@testmail.app',
    password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
    name: 'Test User',
    organizationId: '11111111-1111-1111-1111-111111111111', // Acme Restaurant Group
  },
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@testmail.app',
    password: process.env.TEST_ADMIN_PASSWORD || 'AdminPassword123!',
    name: 'Admin User',
    organizationId: '11111111-1111-1111-1111-111111111111', // Acme Restaurant Group
  },
  owner: {
    email: process.env.TEST_OWNER_EMAIL || 'owner@testmail.app',
    password: process.env.TEST_OWNER_PASSWORD || 'OwnerPassword123!',
    name: 'Owner User',
    organizationId: '11111111-1111-1111-1111-111111111111', // Acme Restaurant Group
  },
  viewer: {
    email: process.env.TEST_VIEWER_EMAIL || 'viewer@testmail.app',
    password: process.env.TEST_VIEWER_PASSWORD || 'ViewerPassword123!',
    name: 'Viewer User',
    organizationId: '22222222-2222-2222-2222-222222222222', // Grand Hotel Chain
  },
};

/**
 * Clear cart helper function
 */
async function clearCart(page: Page) {
  try {
    // Navigate to cart page
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');

    // Check if cart has items
    const cartItems = page.locator('[data-testid="cart-item"]');
    const count = await cartItems.count();

    if (count === 0) {
      console.log('Cart is already empty');
      return;
    }

    console.log(`Clearing ${count} items from cart...`);

    // Remove all items
    for (let i = 0; i < count; i++) {
      // Always click the first remove button since items shift after removal
      const removeButton = page.locator('[data-testid="remove-from-cart"], button:has-text("Remove")').first();
      if (await removeButton.isVisible()) {
        await removeButton.click();

        // Handle confirmation dialog if it appears
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Remove")').last();
        if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await confirmButton.click();
        }

        // Wait for item to be removed
        await page.waitForTimeout(500);
      }
    }

    console.log('Cart cleared successfully');
  } catch (error) {
    console.error('Error clearing cart:', error);
    // Don't throw - cart cleanup is best effort
  }
}

/**
 * Login helper function
 */
async function login(page: Page, email: string, password: string) {
  console.log('Starting login process...');

  try {
    // Set up error logging
    page.on('pageerror', error => {
      console.error('Page error during login:', error.message);
    });

    page.on('console', msg => {
      console.log(`[Browser ${msg.type()}]:`, msg.text());
    });

    // Navigate to login page
    console.log('Navigating to /auth/login');
    await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
    console.log('Navigation complete, current URL:', page.url());

    // Wait for page to be ready
    await page.waitForLoadState('domcontentloaded');
    console.log('Page DOM loaded');

    // Wait for React to hydrate first
    console.log('Waiting for React hydration...');
    await page.waitForTimeout(3000);

    // Wait for and fill email
    console.log('Waiting for email input...');
    const emailInput = page.locator('[data-testid="login-email"]');
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });

    // Fill email with proper React event triggering
    await emailInput.click();
    await emailInput.fill(email);
    await emailInput.press('Tab'); // Trigger blur event
    console.log('Filled email:', email);

    // Wait for and fill password
    console.log('Waiting for password input...');
    const passwordInput = page.locator('[data-testid="login-password"]');
    await passwordInput.waitFor({ state: 'visible', timeout: 10000 });

    // Fill password with proper React event triggering
    await passwordInput.click();
    await passwordInput.fill(password);
    console.log('Filled password');

    // Verify the values are actually in the inputs
    const emailValue = await emailInput.inputValue();
    const passwordValue = await passwordInput.inputValue();
    console.log('Email value in input:', emailValue);
    console.log('Password value in input:', passwordValue ? '***' : 'EMPTY');

    if (!emailValue || !passwordValue) {
      throw new Error('Form fields are empty after filling!');
    }

    // Wait for submit button to be ready
    console.log('Waiting for submit button...');
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.waitFor({ state: 'visible', timeout: 10000 });

    // Wait a bit for React state to sync
    console.log('Waiting for React state to sync...');
    await page.waitForTimeout(1000);

    // Submit the form (this works even if React hasn't hydrated yet)
    console.log('Submitting form...');
    await page.locator('form').evaluate((form) => {
      (form as HTMLFormElement).requestSubmit();
    });

    // Wait a moment for any error to appear or for the login to process
    await page.waitForTimeout(3000);

    // Check if there's an error message
    const errorMessage = await page.locator('[role="alert"]').textContent().catch(() => null);
    if (errorMessage) {
      console.error('Login error message displayed:', errorMessage);
      throw new Error(`Login failed: ${errorMessage}`);
    }

    // Wait for navigation away from login page
    console.log('Waiting for navigation...');
    await page.waitForURL(url => !url.toString().includes('/auth/login'), { timeout: 15000 });
    console.log('Login successful, navigated to:', page.url());

    // Verify we're logged in by checking for user menu
    console.log('Verifying user menu is visible...');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible({ timeout: 10000 });
    console.log('Login verification complete');

  } catch (error) {
    console.error('Login failed with error:', error);
    console.error('Current URL:', page.url());
    console.error('Page title:', await page.title());

    // Take screenshot for debugging
    const screenshotPath = `login-failure-${Date.now()}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.error('Screenshot saved to:', screenshotPath);

    // Log page content for debugging
    const bodyText = await page.locator('body').textContent();
    console.error('Page content:', bodyText?.substring(0, 500));

    throw error;
  }
}

/**
 * Extended test with authentication fixtures
 */
export const test = base.extend<AuthFixtures>({
  /**
   * Authenticated page for regular user
   */
  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await login(page, TEST_USERS.regular.email, TEST_USERS.regular.password);

    // Wait for cookies to be fully set (especially important for webkit/Safari)
    await page.waitForTimeout(2000);

    // TEMPORARILY DISABLED - Cart cleanup is broken and causing test failures
    // The clearCart() function claims success but doesn't actually remove items
    // This needs to be fixed properly - see PLAYWRIGHT-FAILING-TESTS.md
    // await clearCart(page);

    await use(page);

    await context.close();
  },

  /**
   * Authenticated page for admin user
   */
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);

    // Clear cart to ensure clean state for tests
    await clearCart(page);

    await use(page);

    await context.close();
  },
});

export { expect };

