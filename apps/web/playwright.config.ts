import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

/**
 * Playwright E2E Test Configuration
 *
 * Tests complete user journeys including:
 * - Customer chatbot interactions
 * - Public chatbot lead capture
 * - Admin opportunity management
 * - Admin pricing approval workflows
 * - AI-powered features with real Gemini API calls
 */

export default defineConfig({
  testDir: path.resolve(__dirname, '../../e2e'),

  // Run tests in files in parallel, but limit workers to avoid overwhelming Supabase auth
  fullyParallel: true,
  workers: 2, // Limit to 2 concurrent workers instead of all

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Reporter to use
  reporter: 'html',

  // Global setup to ensure test users exist
  globalSetup: require.resolve('../../e2e/setup/global-setup.ts'),

  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',
  },

  // Increase timeout for tests that call Gemini AI (can take 60+ seconds)
  timeout: 300 * 1000, // 300 seconds (5 minutes) per test

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Run headless for automated testing
        headless: true,
      },
    },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      PLAYWRIGHT_TEST: 'true',
    },
  },
});

