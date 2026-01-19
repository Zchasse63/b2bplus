# End-to-End (E2E) Tests

E2E tests verify complete user journeys using Playwright, testing the application as a real user would experience it.

## Prerequisites

1. **Running Development Server**: E2E tests require the dev server to be running
2. **Test Users in Database**: Tests expect specific test users to exist in Supabase
3. **Playwright Browsers**: Install with `npm run playwright:install`

## Running E2E Tests

### Start Dev Server (Required)

E2E tests connect to `http://localhost:3000` by default. Start the server first:

```bash
# Terminal 1: Start dev server
npm run dev
```

### Run Tests

```bash
# Terminal 2: Run E2E tests
npm run test:e2e

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run with UI mode (Playwright inspector)
npm run test:e2e:ui

# Run specific test file
npx playwright test e2e/auth.spec.ts

# Run tests in specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Test Environment Setup

### Option 1: Using Existing Test Users (Recommended)

If your Supabase instance already has test users (from seed data), configure their credentials:

```bash
# .env.local
TEST_USER_EMAIL=test@testmail.app
TEST_USER_PASSWORD=TestPassword123!
TEST_ADMIN_EMAIL=admin@testmail.app
TEST_ADMIN_PASSWORD=AdminPassword123!
```

### Option 2: Global Setup Creates Test Users

If test users don't exist, the global setup (`e2e/setup/global-setup.ts`) will attempt to create them:

- Requires `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in environment
- Creates 2 test users: customer and admin
- Stores authentication state in `.auth/` directory (gitignored)
- Global teardown (`e2e/setup/global-teardown.ts`) cleans up created users

**Note**: If global setup fails to create users (e.g., database errors), tests will fail. Either:
1. Create test users manually in Supabase dashboard
2. Fix database connection/permissions issues
3. Skip E2E tests until environment is properly configured

## Test Structure

```
e2e/
├── README.md                    # This file
├── auth.spec.ts                 # Authentication flow tests
├── chat.spec.ts                 # AI chatbot interaction tests
├── navigation.spec.ts           # Page navigation tests
├── setup/
│   ├── global-setup.ts          # Creates test users before tests
│   └── global-teardown.ts       # Cleans up test users after tests
├── fixtures/
│   └── auth.ts                  # Authentication fixtures (login helpers)
└── page-objects/
    ├── ChatbotWidget.ts         # Chatbot widget page object
    └── AICompanionPanel.ts      # AI companion panel page object
```

## Test Coverage

### auth.spec.ts
- ✅ User signup flow
- ✅ User login flow
- ✅ Logout flow
- ✅ Session expiry handling
- ✅ Password reset flow (partial)

### chat.spec.ts
- ✅ Customer AI companion interaction
- ✅ Public chatbot interaction
- ✅ Chatbot conversation history persistence
- ✅ Lead capture from chatbot
- ✅ Streaming AI responses

### navigation.spec.ts
- ✅ Public page navigation (/, /products, /about)
- ✅ Authenticated page navigation (/dashboard, /orders, /cart)
- ✅ Admin page navigation (/admin/customers, /admin/analytics)
- ✅ Role-based access control (customer cannot access /admin)
- ✅ 404 page handling
- ✅ Protected route redirects for unauthenticated users

## Debugging Failed Tests

### View Test Results

After test run:
```bash
npx playwright show-report
```

### Run with Debugging

```bash
# Playwright inspector
npx playwright test --debug

# Run in headed mode (see browser)
npm run test:e2e:headed

# Slow down test execution
npx playwright test --headed --slow-mo=1000
```

### Common Failures

**"Server is not running"**
- Start dev server: `npm run dev`
- Wait for server to fully start (check http://localhost:3000)

**"Failed to create test users: Database error"**
- Check Supabase connection (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
- Verify Supabase instance is running
- Check database RLS policies allow user creation

**"Login failed: invalid credentials"**
- Verify TEST_USER_EMAIL and TEST_USER_PASSWORD match actual test users in database
- Check test users exist in Supabase Auth

**"Test timeout"**
- Increase timeout in playwright.config.ts
- Check network connection (dev server responding)
- Verify AI routes are properly mocked (to avoid API costs and delays)

### Screenshots and Videos

Failed tests automatically save:
- Screenshots: `test-results/*/test-failed-*.png`
- Videos: `test-results/*/video.webm` (if enabled in playwright.config.ts)
- Traces: `test-results/*/trace.zip` (open with `npx playwright show-trace`)

## Writing E2E Tests

### Example: Basic Page Navigation Test

```typescript
import { test, expect } from '@playwright/test';

test('should navigate to products page', async ({ page }) => {
  await page.goto('/');
  await page.click('a:has-text("Products")');

  await expect(page).toHaveURL('/products');
  await expect(page.locator('h1')).toContainText('Products');
});
```

### Example: Authenticated Test

```typescript
import { test, expect } from './fixtures/auth';

test('should view orders when authenticated', async ({ authenticatedPage }) => {
  // authenticatedPage is already logged in as regular user
  await authenticatedPage.goto('/orders');

  await expect(authenticatedPage.locator('h1')).toContainText('Orders');
  // Page should show order history
});
```

### Example: Admin Test

```typescript
import { test, expect } from './fixtures/auth';

test('should access admin analytics', async ({ adminPage }) => {
  // adminPage is already logged in as admin user
  await adminPage.goto('/admin/analytics');

  await expect(adminPage.locator('h1')).toContainText('Analytics');
});
```

## Best Practices

1. **Mock AI Responses**: Use route interception to mock AI API calls (avoid costs, faster tests)
2. **Wait for Network Idle**: Use `{ waitUntil: 'networkidle' }` for pages with dynamic content
3. **Use Data-Testid**: Add `data-testid` attributes to components for reliable selectors
4. **Independent Tests**: Each test should be self-contained, not rely on previous tests
5. **Clean Up State**: Use global setup/teardown or fixture cleanup
6. **Handle Flakiness**: Add explicit waits, retry failed tests (configured in playwright.config.ts)

## CI/CD Integration

E2E tests run in CI using:
- Headless mode (no GUI)
- Chromium only (faster)
- Retries on failure (up to 2 retries)
- Video recording on failure

See `playwright.config.ts` for CI configuration.

## Performance

Average test times:
- auth.spec.ts: ~30 seconds (includes login flows)
- chat.spec.ts: ~20 seconds (mocked AI responses)
- navigation.spec.ts: ~15 seconds (simple page loads)

Total E2E suite: ~1-2 minutes

## Troubleshooting

### Tests pass locally but fail in CI

- Check CI environment variables (TEST_USER_EMAIL, etc.)
- Ensure dev server starts properly in CI
- Verify Supabase instance is accessible from CI
- Check for timing issues (add explicit waits)

### "Element not visible" errors

- Wait for element with `await element.waitFor({ state: 'visible' })`
- Verify element isn't hidden by CSS (display: none, opacity: 0)
- Check if element is in viewport (use `scrollIntoViewIfNeeded()`)

### Tests interfere with each other

- Each test should use isolated context (Playwright does this by default)
- Avoid sharing state between tests
- Clean up test data in global teardown

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Playwright Tests](https://playwright.dev/docs/debug)
