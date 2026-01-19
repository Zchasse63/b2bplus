import { chromium, FullConfig } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

/**
 * Global setup for Playwright E2E tests
 * Creates test users and stores auth state
 */
async function globalSetup(config: FullConfig) {
  console.log('🔧 Setting up E2E test environment...');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required environment variables for E2E setup');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Create test users
  const testUsers = [
    {
      email: `test-customer-${randomUUID().slice(0, 8)}@example.com`,
      password: 'TestCustomer123!',
      role: 'customer',
      name: 'Test Customer',
      organizationName: 'Test Customer Org',
    },
    {
      email: `test-admin-${randomUUID().slice(0, 8)}@example.com`,
      password: 'TestAdmin123!',
      role: 'admin',
      name: 'Test Admin',
      organizationName: 'Test Admin Org',
    },
  ];

  const createdUsers = [];

  for (const userData of testUsers) {
    try {
      // Create user via Admin API
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          full_name: userData.name,
        },
      });

      if (authError || !authData.user) {
        console.error(`Failed to create ${userData.role} user:`, authError);
        continue;
      }

      // Create organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: userData.organizationName,
          business_email: userData.email,
          status: 'approved',
        })
        .select()
        .single();

      if (orgError || !orgData) {
        console.error(`Failed to create organization:`, orgError);
        continue;
      }

      // Link user to organization
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: orgData.id,
          user_id: authData.user.id,
          role: userData.role,
        });

      if (memberError) {
        console.error(`Failed to create organization member:`, memberError);
        continue;
      }

      createdUsers.push({
        id: authData.user.id,
        email: userData.email,
        password: userData.password,
        role: userData.role,
        organizationId: orgData.id,
      });

      console.log(`✅ Created ${userData.role} user: ${userData.email}`);
    } catch (error) {
      console.error(`Error creating ${userData.role} user:`, error);
    }
  }

  // Store test user credentials in a file for tests to use
  const authDir = path.join(process.cwd(), '.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(authDir, 'test-users.json'),
    JSON.stringify(createdUsers, null, 2)
  );

  console.log(`✅ Test users created and saved to .auth/test-users.json`);

  // Optionally verify server is running (non-blocking)
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';
  console.log(`🔍 Checking if server is running at ${baseURL}...`);

  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(`${baseURL}/api/health/ready`, { timeout: 5000 });
    const status = await page.textContent('body');
    await browser.close();

    if (status?.includes('ok') || status?.includes('ready')) {
      console.log('✅ Server is ready');
    } else {
      console.warn('⚠️  Server responded but health check unclear');
    }
  } catch (error) {
    console.warn('⚠️  Server check failed - tests may fail if server not running');
    console.warn('   To run E2E tests, start server: npm run dev');
    // Don't throw - allow setup to complete for test listing and validation
  }

  console.log('✅ E2E setup complete\n');
}

export default globalSetup;
