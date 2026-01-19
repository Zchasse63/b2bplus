import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global teardown for Playwright E2E tests
 * Cleans up test users and data
 */
async function globalTeardown() {
  console.log('🧹 Cleaning up E2E test environment...');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('⚠️  Missing Supabase credentials, skipping cleanup');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Load test users from file
  const authDir = path.join(process.cwd(), '.auth');
  const testUsersFile = path.join(authDir, 'test-users.json');

  if (!fs.existsSync(testUsersFile)) {
    console.log('No test users file found, skipping cleanup');
    return;
  }

  try {
    const testUsers = JSON.parse(fs.readFileSync(testUsersFile, 'utf-8'));

    for (const user of testUsers) {
      try {
        // Delete organization members
        await supabase
          .from('organization_members')
          .delete()
          .eq('user_id', user.id);

        // Delete organization
        if (user.organizationId) {
          await supabase
            .from('organizations')
            .delete()
            .eq('id', user.organizationId);
        }

        // Delete user via Admin API
        await supabase.auth.admin.deleteUser(user.id);

        console.log(`✅ Cleaned up ${user.role} user: ${user.email}`);
      } catch (error) {
        console.error(`Error cleaning up user ${user.email}:`, error);
      }
    }

    // Remove test users file
    fs.unlinkSync(testUsersFile);
    console.log('✅ Removed test users file');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }

  console.log('✅ E2E teardown complete\n');
}

export default globalTeardown;
