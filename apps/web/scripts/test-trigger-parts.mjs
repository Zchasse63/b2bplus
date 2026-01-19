import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { randomUUID } from 'crypto';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testTriggerParts() {
  console.log('Testing what the trigger does...\n');

  const testId = randomUUID();
  const orgName = 'Test Org ' + testId.slice(0, 8);
  const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  // Test 1: Can we insert into organizations?
  console.log('1. Testing organizations INSERT...');
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
    console.error('   FAILED:', orgError.message);
    console.error('   Code:', orgError.code);
    console.error('   Details:', orgError.details);
    return;
  }
  console.log('   SUCCESS: Created org', org.id);

  // Test 2: Can we insert into organization_members without a real user?
  console.log('\n2. Testing organization_members INSERT with fake user ID...');
  const fakeUserId = randomUUID();
  const { error: memberError } = await supabase
    .from('organization_members')
    .insert({
      organization_id: org.id,
      user_id: fakeUserId,
      role: 'owner',
    });

  if (memberError) {
    console.error('   FAILED:', memberError.message);
    console.error('   Code:', memberError.code);
    // This is expected - foreign key constraint
    console.log('   (This is expected - user does not exist)');
  } else {
    console.log('   SUCCESS: Created member');
  }

  // Test 3: Can we insert into profiles?
  console.log('\n3. Testing profiles INSERT with fake user ID...');
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: fakeUserId,
      email: 'test@example.com',
      current_organization_id: org.id,
    });

  if (profileError) {
    console.error('   FAILED:', profileError.message);
    console.error('   Code:', profileError.code);
    // This is expected - foreign key constraint
    console.log('   (This is expected - user does not exist)');
  } else {
    console.log('   SUCCESS: Created profile');
  }

  // Cleanup
  console.log('\n4. Cleaning up...');
  await supabase.from('organizations').delete().eq('id', org.id);
  console.log('   Done');

  // Test 4: Check if the trigger exists and what it does
  console.log('\n5. Checking trigger function...');
  const { data: funcData, error: funcError } = await supabase.rpc('exec_sql', {
    sql: `SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user'`
  });

  if (funcError) {
    console.log('   Could not query function (expected - exec_sql might be restricted)');
  } else {
    console.log('   Function source:', funcData);
  }
}

testTriggerParts().catch(console.error);
