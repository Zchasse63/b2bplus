import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { randomUUID } from 'crypto';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testTriggerSteps() {
  console.log('Testing each step the trigger would do...\n');

  const uuid = randomUUID().replace(/-/g, '').slice(0, 12);
  const testEmail = `trigger-test-${uuid}@example.com`;
  const testName = `Trigger Test ${uuid}`;

  // Simulate what the trigger does
  const orgName = testName + "'s Organization";
  const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  console.log('Test data:');
  console.log('  Email:', testEmail);
  console.log('  Name:', testName);
  console.log('  Org Name:', orgName);
  console.log('  Slug:', slug);
  console.log();

  // Step 1: Create organization
  console.log('Step 1: INSERT INTO organizations...');
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: orgName,
      slug: slug,
      type: 'restaurant',
    })
    .select()
    .single();

  if (orgError) {
    console.log('  FAILED:', orgError.message);
    console.log('  Code:', orgError.code);
    return;
  }
  console.log('  SUCCESS: Created org', org.id);

  // Step 2: Create a real user first (to have a valid UUID for FK)
  console.log('\nStep 2: Create real auth user...');
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: 'TestPassword123!',
    email_confirm: true,
    user_metadata: {
      full_name: testName,
    },
  });

  // This will fail with the trigger - but if the user exists in auth.users
  // we can test the other parts
  if (authError) {
    console.log('  Auth API error:', authError.message);
    console.log('  Status:', authError.status);

    // Check if user was actually created despite error
    const { data: users } = await supabase.auth.admin.listUsers();
    const existingUser = users?.users?.find(u => u.email === testEmail);

    if (!existingUser) {
      console.log('  User was NOT created - trigger blocked the whole transaction');

      // Cleanup org
      await supabase.from('organizations').delete().eq('id', org.id);
      console.log('  Cleaned up org');
      return;
    }

    console.log('  But user EXISTS in auth.users:', existingUser.id);
  } else {
    console.log('  SUCCESS: User created', authData.user?.id);

    // If this succeeded, the trigger worked!
    console.log('\n*** TRIGGER WORKED! Checking created data... ***');

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();
    console.log('  Profile:', profile ? 'EXISTS' : 'MISSING');

    const { data: member } = await supabase
      .from('organization_members')
      .select('*')
      .eq('user_id', authData.user.id)
      .single();
    console.log('  Member:', member ? 'EXISTS' : 'MISSING');

    // Cleanup
    await supabase.auth.admin.deleteUser(authData.user.id);
    await supabase.from('organizations').delete().eq('id', org.id);
  }
}

testTriggerSteps().catch(console.error);
