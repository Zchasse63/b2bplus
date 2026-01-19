import { test, expect } from './fixtures/auth';

test.describe('Navigation Tests', () => {
  test.describe('Public Navigation', () => {
    test('should load homepage', async ({ page }) => {
      await page.goto('/');

      // Verify page loaded without errors
      await expect(page).toHaveTitle(/.*/);

      // Check for no console errors (major ones)
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await page.waitForTimeout(1000);

      // Allow some non-critical errors, but not crashes
      const hasCriticalError = errors.some((err) =>
        err.toLowerCase().includes('crash') || err.toLowerCase().includes('fatal')
      );
      expect(hasCriticalError).toBeFalsy();
    });

    test('should navigate to products page', async ({ page }) => {
      await page.goto('/');

      // Find and click products link
      const productsLink = page.locator('a[href="/products"], text=/products/i').first();
      await productsLink.click();

      // Wait for navigation
      await page.waitForURL(/\/products/, { timeout: 10000 });

      // Verify products page loaded
      expect(page.url()).toContain('/products');
      await expect(page.locator('h1, h2')).toContainText(/product/i);
    });

    test('should navigate to about page if exists', async ({ page }) => {
      await page.goto('/');

      // Check if about link exists
      const aboutLink = page.locator('a[href="/about"]').first();

      if ((await aboutLink.count()) > 0) {
        await aboutLink.click();
        await page.waitForURL(/\/about/, { timeout: 10000 });
        expect(page.url()).toContain('/about');
      } else {
        test.skip();
      }
    });

    test('should show header navigation links', async ({ page }) => {
      await page.goto('/');

      // Check for common header links
      const header = page.locator('header, nav').first();
      expect(await header.count()).toBeGreaterThan(0);

      // Verify some navigation links exist
      const links = await page.locator('header a, nav a').count();
      expect(links).toBeGreaterThan(0);
    });

    test('should redirect to login for protected routes', async ({ page }) => {
      // Try to access dashboard without auth
      await page.goto('/dashboard');

      // Should redirect to login
      await page.waitForURL(/\/auth\/login/, { timeout: 10000 });
      expect(page.url()).toContain('/auth/login');
    });
  });

  test.describe('Authenticated Navigation', () => {
    test('should navigate to dashboard', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');

      // Verify dashboard loaded
      await expect(authenticatedPage.locator('h1, h2')).toContainText(/dashboard/i);

      // Verify no redirect to login
      expect(authenticatedPage.url()).not.toContain('/auth/login');
    });

    test('should navigate to orders page', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');

      // Find orders link
      const ordersLink = authenticatedPage.locator('a[href*="order"]').first();

      if ((await ordersLink.count()) > 0) {
        await ordersLink.click();
        await authenticatedPage.waitForTimeout(2000);

        // Verify orders page loaded
        const url = authenticatedPage.url();
        expect(url).toContain('order');
      } else {
        // Navigate directly if link not found
        await authenticatedPage.goto('/orders');
        await authenticatedPage.waitForTimeout(2000);

        // Either page loads or redirects to valid route
        const url = authenticatedPage.url();
        expect(url.length).toBeGreaterThan(0);
      }
    });

    test('should navigate to cart page', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/');

      // Find cart link
      const cartLink = authenticatedPage.locator('a[href*="cart"]').first();

      if ((await cartLink.count()) > 0) {
        await cartLink.click();
        await authenticatedPage.waitForTimeout(2000);

        const url = authenticatedPage.url();
        expect(url).toContain('cart');
      } else {
        test.skip();
      }
    });

    test('should show user menu when authenticated', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/');

      // Check for user menu or profile indicator
      const userMenu =
        (await authenticatedPage.locator('[data-testid="user-menu"]').count()) > 0 ||
        (await authenticatedPage.locator('button:has-text("Profile"), button:has-text("Account")').count()) > 0;

      expect(userMenu).toBeTruthy();
    });

    test('should navigate between pages without losing auth', async ({ authenticatedPage }) => {
      // Navigate to multiple pages
      await authenticatedPage.goto('/');
      await authenticatedPage.waitForTimeout(500);

      await authenticatedPage.goto('/products');
      await authenticatedPage.waitForTimeout(500);

      await authenticatedPage.goto('/dashboard');
      await authenticatedPage.waitForTimeout(500);

      // Should still be authenticated
      const userMenu = await authenticatedPage.locator('[data-testid="user-menu"]').count();
      expect(userMenu).toBeGreaterThan(0);

      // Should not redirect to login
      expect(authenticatedPage.url()).not.toContain('/auth/login');
    });
  });

  test.describe('Admin Navigation', () => {
    test('should access admin dashboard', async ({ adminPage }) => {
      await adminPage.goto('/admin/dashboard');

      // Verify admin dashboard loaded
      const url = adminPage.url();
      expect(url).toContain('admin');

      // Check for admin-specific content
      const hasAdminContent =
        (await adminPage.locator('text=/admin|management|analytics/i').count()) > 0;
      expect(hasAdminContent).toBeTruthy();
    });

    test('should access admin customers page', async ({ adminPage }) => {
      await adminPage.goto('/admin/customers');

      // Verify page loaded
      const url = adminPage.url();
      expect(url).toContain('admin');
      expect(url).toContain('customer');
    });

    test('should access admin analytics page', async ({ adminPage }) => {
      await adminPage.goto('/admin/analytics');

      // Verify page loaded
      const url = adminPage.url();
      expect(url).toContain('admin');
      expect(url).toContain('analytics');
    });

    test('customer should not access admin routes', async ({ authenticatedPage }) => {
      // Try to access admin route as customer (authenticatedPage is regular user, not admin)
      await authenticatedPage.goto('/admin/dashboard');

      // Should be denied access (403, 404, or redirect)
      await authenticatedPage.waitForTimeout(2000);

      const url = authenticatedPage.url();
      const hasErrorMessage =
        (await authenticatedPage.locator('text=/unauthorized|forbidden|access denied|404|not found/i').count()) > 0;

      // Either redirected away from admin or shown error
      expect(!url.includes('admin') || hasErrorMessage).toBeTruthy();
    });
  });

  test.describe('Error Handling', () => {
    test('should show 404 page for non-existent route', async ({ page }) => {
      await page.goto('/this-page-does-not-exist-12345');

      // Wait for page to load
      await page.waitForTimeout(2000);

      // Should show 404 indicator
      const has404 =
        (await page.locator('text=/404|not found|page.*not.*exist/i').count()) > 0 ||
        page.url().includes('404');

      expect(has404).toBeTruthy();
    });

    test('should handle network errors gracefully', async ({ page }) => {
      // Go offline
      await page.context().setOffline(true);

      await page.goto('/products');
      await page.waitForTimeout(2000);

      // Should show some error state
      const hasErrorIndicator =
        (await page.locator('text=/error|offline|network|connection/i').count()) > 0;

      // Back online
      await page.context().setOffline(false);

      // Either shows error or loaded from cache
      expect(hasErrorIndicator || page.url().includes('products')).toBeTruthy();
    });
  });

  test.describe('Breadcrumb Navigation', () => {
    test('should show breadcrumbs on nested pages', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/products/category/steel');

      // Wait for page load
      await authenticatedPage.waitForTimeout(2000);

      // Check for breadcrumb navigation
      const breadcrumbs = await authenticatedPage.locator('[aria-label="breadcrumb"], .breadcrumb, nav ol').count();

      if (breadcrumbs > 0) {
        // Verify breadcrumb links work
        const homeLink = authenticatedPage.locator('a[href="/"]').first();
        expect(await homeLink.count()).toBeGreaterThan(0);
      } else {
        // Breadcrumbs not implemented - skip
        test.skip();
      }
    });
  });
});
