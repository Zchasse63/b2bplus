import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectTrigger() {
  console.log('Inspecting database triggers and functions...\n');
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log();

  // Try to call a custom RPC that might give us SQL access
  // First, let's see if we can list triggers using the schema

  // Check if there's a utility function to run SQL
  console.log('1. Attempting to call pg_catalog via RPC...');
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `SELECT tgname, tgrelid::regclass, proname
          FROM pg_trigger t
          JOIN pg_proc p ON t.tgfoid = p.oid
          WHERE tgrelid = 'auth.users'::regclass`
  });

  if (error) {
    console.log('   exec_sql not available:', error.message);
  } else {
    console.log('   Triggers on auth.users:', data);
  }

  // Try another approach - check if there's a health check we can do
  console.log('\n2. Checking database connectivity...');
  const { data: healthData, error: healthError } = await supabase
    .from('organizations')
    .select('count')
    .limit(1);

  if (healthError) {
    console.log('   Database error:', healthError.message);
  } else {
    console.log('   Database is accessible');
  }

  // Check RLS status
  console.log('\n3. Testing service role can bypass RLS...');
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('id, email')
    .limit(1);

  if (profileError) {
    console.log('   Profiles query failed:', profileError.message);
  } else {
    console.log('   Profiles accessible:', profileData?.length >= 0 ? 'YES' : 'NO');
  }

  // Try to identify if the issue is with email domain restrictions
  console.log('\n4. Testing if email domain might be restricted...');
  const testEmails = [
    'test@example.com',
    'test@gmail.com',
    'test@company.com',
  ];

  for (const email of testEmails) {
    // Just check if the email format is valid via auth settings
    // We won't actually create users
    console.log(`   Testing ${email} format... (not creating)`);
  }

  // Check for RLS policies on profiles that might block inserts
  console.log('\n5. Testing profiles INSERT...');
  const testId = '00000000-0000-4000-8000-000000000001'; // Valid v4 UUID format
  const { error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: testId,
      email: 'test-insert@example.com',
      full_name: 'Test Insert',
      current_organization_id: null
    });

  if (insertError) {
    console.log('   INSERT failed:', insertError.message);
    console.log('   Code:', insertError.code);

    if (insertError.code === '23503') {
      console.log('   This is a foreign key violation - profiles.id references auth.users(id)');
      console.log('   The trigger runs AFTER insert so this FK exists');
    }
  } else {
    console.log('   INSERT succeeded (unexpected!)');
    // Cleanup
    await supabase.from('profiles').delete().eq('id', testId);
  }

  // Check organization_members similarly
  console.log('\n6. Checking organization_members table...');
  const { data: members } = await supabase
    .from('organization_members')
    .select('*')
    .limit(1);
  console.log('   Members accessible:', members ? 'YES' : 'NO');

  console.log('\n--- Summary ---');
  console.log('The trigger fires AFTER INSERT on auth.users.');
  console.log('If the trigger raises an exception, the entire transaction rolls back.');
  console.log('This means the user is not created in auth.users either.');
  console.log('\nTo debug further:');
  console.log('1. Check Supabase Dashboard > Database > Triggers');
  console.log('2. Check Database > Functions for handle_new_user');
  console.log('3. Look at Logs > Postgres Logs for errors');
}

inspectTrigger().catch(console.error);
