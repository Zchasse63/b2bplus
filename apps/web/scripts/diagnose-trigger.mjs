import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { randomUUID } from 'crypto';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function diagnose() {
  console.log('Diagnosing trigger issue...\n');

  // Test 1: Can we create an org with timestamp slug?
  console.log('Test 1: Create org with timestamp slug...');
  const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const testSlug = `test-org-${timestamp}`;

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: 'Test Org',
      slug: testSlug,
      type: 'restaurant',
    })
    .select()
    .single();

  if (orgError) {
    console.log('  FAILED:', orgError.message);
  } else {
    console.log('  SUCCESS: Org created with slug', org.slug);
    await supabase.from('organizations').delete().eq('id', org.id);
  }

  // Test 2: Check if auth.users table has any constraints
  console.log('\nTest 2: Count users in auth system...');
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
  if (usersError) {
    console.log('  Cannot list users:', usersError.message);
  } else {
    console.log('  Total users:', users.users?.length);
    console.log('  Last few emails:', users.users?.slice(-3).map(u => u.email).join(', '));
  }

  // Test 3: Try creating a user with email_confirm: false
  console.log('\nTest 3: Create user with email_confirm: false...');
  const uuid = randomUUID().slice(0, 8);
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: `test-noconfirm-${uuid}@example.com`,
    password: 'TestPassword123!',
    email_confirm: false,  // Try without confirmation
    user_metadata: { full_name: 'Test User' },
  });

  if (authError) {
    console.log('  FAILED:', authError.message);
  } else {
    console.log('  SUCCESS: User created', authData.user?.id);
    await supabase.auth.admin.deleteUser(authData.user.id);
  }

  // Test 4: Try creating user without any metadata
  console.log('\nTest 4: Create user with minimal data...');
  const uuid2 = randomUUID().slice(0, 8);
  const { data: authData2, error: authError2 } = await supabase.auth.admin.createUser({
    email: `test-minimal-${uuid2}@example.com`,
    password: 'TestPassword123!',
  });

  if (authError2) {
    console.log('  FAILED:', authError2.message);
  } else {
    console.log('  SUCCESS: User created', authData2.user?.id);
    await supabase.auth.admin.deleteUser(authData2.user.id);
  }

  // Test 5: Check if there are any database-level errors we can see
  console.log('\nTest 5: Check database health...');
  const { data: healthCheck, error: healthError } = await supabase
    .from('profiles')
    .select('count')
    .limit(1);

  if (healthError) {
    console.log('  Database error:', healthError.message);
  } else {
    console.log('  Database is healthy');
  }

  // Test 6: Try to see if we can sign up via the regular API (not admin)
  console.log('\nTest 6: Try regular signUp API...');
  const uuid3 = randomUUID().slice(0, 8);
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data: signUpData, error: signUpError } = await anonClient.auth.signUp({
    email: `test-signup-${uuid3}@example.com`,
    password: 'TestPassword123!',
    options: {
      data: { full_name: 'Test SignUp User' }
    }
  });

  if (signUpError) {
    console.log('  signUp FAILED:', signUpError.message);
  } else {
    console.log('  signUp result:', signUpData.user ? 'User object returned' : 'No user');
    console.log('  User ID:', signUpData.user?.id || 'N/A');
    console.log('  Confirmation required:', !signUpData.session);

    // Cleanup if user was created
    if (signUpData.user?.id) {
      await supabase.auth.admin.deleteUser(signUpData.user.id);
      console.log('  Cleaned up');
    }
  }
}

diagnose().catch(console.error);
