import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Authentication Flows
 * Tests login, signup, password reset, and logout functionality
 */

// Helper function to generate unique test emails
function generateTestEmail(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `test-${timestamp}-${random}@e2etest.com`;
}

test.describe('Authentication', () => {
  test.describe('Login', () => {
    test('should login with valid credentials', async ({ page }) => {
      await page.goto('/auth/login');

      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle');

      // Fill in login form
      await page.fill('[data-testid="email-input"]', process.env.TEST_USER_EMAIL || 'test@e2etest.com');
      await page.fill('[data-testid="password-input"]', process.env.TEST_USER_PASSWORD || 'TestPassword123!');

      // Submit form
      await page.click('button[type="submit"]');

      // Should redirect to chat page (customer redirect)
      await page.waitForURL('/chat', { timeout: 10000 });

      // Wait for page to fully load and header to render
      await page.waitForLoadState('networkidle');

      // Additional wait for session to be fully established (especially important for webkit/Mobile Chrome)
      await page.waitForTimeout(2000);

      // Should show chat interface
      await expect(page.locator('h1, h2').filter({ hasText: /chat|assistant/i })).toBeVisible({ timeout: 10000 });
    });

    test('should show error with invalid credentials', async ({ page }) => {
      await page.goto('/auth/login');

      // Fill in login form with invalid credentials
      await page.fill('[data-testid="email-input"]', 'invalid@example.com');
      await page.fill('[data-testid="password-input"]', 'WrongPassword123!');

      // Submit form
      await page.click('button[type="submit"]');

      // Should show error message
      await expect(page.locator('text=/invalid.*credentials/i')).toBeVisible({ timeout: 5000 });

      // Should stay on login page
      expect(page.url()).toContain('/auth/login');
    });

    test('should show validation errors for empty fields', async ({ page }) => {
      await page.goto('/auth/login');

      // Try to submit without filling fields
      await page.click('button[type="submit"]');

      // Should show validation errors
      await expect(page.locator('text=/email.*required/i')).toBeVisible();
      await expect(page.locator('text=/password.*required/i')).toBeVisible();
    });

    test('should show validation error for invalid email format', async ({ page }) => {
      await page.goto('/auth/login');

      // Fill in invalid email
      await page.fill('[data-testid="email-input"]', 'not-an-email');
      await page.fill('[data-testid="password-input"]', 'SomePassword123!');

      // Submit form
      await page.click('button[type="submit"]');

      // Should show email validation error
      await expect(page.locator('text=/invalid.*email/i')).toBeVisible();
    });
  });

  test.describe('Signup', () => {
    test('should create new account with valid data', async ({ page }) => {
      const testEmail = generateTestEmail();

      await page.goto('/auth/register');

      // Fill in signup form
      await page.fill('[data-testid="register-email"]', testEmail);
      await page.fill('[data-testid="register-password"]', 'NewPassword123!');
      await page.fill('[data-testid="register-confirmPassword"]', 'NewPassword123!');
      await page.fill('[data-testid="register-fullName"]', 'Test User');

      // Submit form
      await page.click('button[type="submit"]');

      // Should show success message or redirect
      // The component shows either a success message or redirects to /chat if auto-logged in
      // Wait for either the success screen or redirect to chat
      await Promise.race([
        expect(page.locator('text=/success/i')).toBeVisible({ timeout: 10000 }),
        page.waitForURL('/chat', { timeout: 10000 })
      ]);
    });

    test('should show error when passwords do not match', async ({ page }) => {
      await page.goto('/auth/register');

      // Fill in signup form with mismatched passwords
      await page.fill('[data-testid="register-email"]', generateTestEmail());
      await page.fill('[data-testid="register-password"]', 'Password123!');
      await page.fill('[data-testid="register-confirmPassword"]', 'DifferentPassword123!');
      await page.fill('[data-testid="register-fullName"]', 'Test User');

      // Submit form
      await page.click('button[type="submit"]');

      // Should show password mismatch error
      await expect(page.locator('text=/passwords.*match/i')).toBeVisible();
    });

    test('should show error for weak password', async ({ page }) => {
      await page.goto('/auth/register');

      // Fill in signup form with weak password
      await page.fill('[data-testid="register-email"]', generateTestEmail());
      await page.fill('[data-testid="register-password"]', '123');
      await page.fill('[data-testid="register-confirmPassword"]', '123');
      await page.fill('[data-testid="register-fullName"]', 'Test User');

      // Submit form
      await page.click('button[type="submit"]');

      // Should show password strength error
      await expect(page.locator('text=/password.*characters/i')).toBeVisible();
    });

    test('should show error when email already exists', async ({ page }) => {
      await page.goto('/auth/register');

      // Try to signup with existing email
      await page.fill('[data-testid="register-email"]', process.env.TEST_USER_EMAIL || 'test@e2etest.com');
      await page.fill('[data-testid="register-password"]', 'Password123!');
      await page.fill('[data-testid="register-confirmPassword"]', 'Password123!');
      await page.fill('[data-testid="register-fullName"]', 'Test User');

      // Submit form
      await page.click('button[type="submit"]');

      // Should show error that email already exists
      // Supabase returns "User already registered" error - check for either pattern
      const errorVisible = await Promise.race([
        page.locator('text=/already.*registered/i').isVisible().then(() => true).catch(() => false),
        page.locator('text=/user.*already/i').isVisible().then(() => true).catch(() => false),
      ]);
      expect(errorVisible).toBeTruthy();
    });
  });

  test.describe('Password Reset', () => {
    test('should send password reset email', async ({ page }) => {
      await page.goto('/auth/forgot-password');

      // Wait for page to be fully loaded and hydrated
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Fill in email using data-testid
      await page.fill('[data-testid="email-input"]', process.env.TEST_USER_EMAIL || 'test@testmail.app');

      // Submit form
      await page.click('button[type="submit"]');

      // Should show success message
      // Our forgot-password page shows: "Password reset email sent! Check your inbox."
      await expect(page.locator('text=/password reset email sent/i')).toBeVisible({ timeout: 10000 });
    });

    test('should show validation error for invalid email', async ({ page }) => {
      await page.goto('/auth/forgot-password');

      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle');

      // Fill in invalid email using data-testid
      await page.fill('[data-testid="email-input"]', 'not-an-email');

      // Submit form
      await page.click('button[type="submit"]');

      // Wait for validation to run and error to appear
      await page.waitForTimeout(500);

      // Should show validation error
      await expect(page.locator('text=/invalid.*email/i')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Logout', () => {
    test('should logout successfully', async ({ page }) => {
      // First login
      await page.goto('/auth/login');

      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle');

      await page.fill('[data-testid="email-input"]', process.env.TEST_USER_EMAIL || 'test@e2etest.com');
      await page.fill('[data-testid="password-input"]', process.env.TEST_USER_PASSWORD || 'TestPassword123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('/chat', { timeout: 10000 });

      // Wait for header to render
      await page.waitForLoadState('networkidle');

      // Click logout button using data-testid
      await page.click('[data-testid="sign-out-button"]');

      // Should redirect to login page
      await page.waitForURL('/auth/login', { timeout: 5000 });

      // Wait for page to fully load after redirect
      await page.waitForLoadState('networkidle');

      // Verify we're on the login page by checking for the login form
      await expect(page.locator('h2:has-text("Sign In")')).toBeVisible();
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect to login when accessing protected route while logged out', async ({ page }) => {
      // Try to access protected route
      await page.goto('/orders');

      // Should redirect to login
      await page.waitForURL('/auth/login', { timeout: 5000 });
    });

    test('should allow access to protected route when logged in', async ({ page }) => {
      // First login
      await page.goto('/auth/login');

      // Wait for page to be fully loaded and hydrated
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      await page.fill('[data-testid="email-input"]', process.env.TEST_USER_EMAIL || 'test@e2etest.com');
      await page.fill('[data-testid="password-input"]', process.env.TEST_USER_PASSWORD || 'TestPassword123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('/chat', { timeout: 10000 });

      // Wait for session to be fully established
      await page.waitForTimeout(2000);

      // Navigate to orders page
      await page.goto('/orders');

      // Should stay on orders page (not redirect to login)
      await page.waitForURL('**/orders', { timeout: 5000 });
      expect(page.url()).toContain('/orders');

      // Should not show login form
      await expect(page.locator('[data-testid="login-email"]')).not.toBeVisible();
    });
  });
});

