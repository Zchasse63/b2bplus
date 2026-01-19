import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { randomUUID } from 'crypto';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testManualCreation() {
  console.log('Testing manual user creation (bypassing trigger)...\n');

  const uuid = randomUUID().replace(/-/g, '').slice(0, 8);
  const email = `manual-test-${uuid}@example.com`;

  // Step 1: Try to create organization FIRST (before user)
  console.log('Step 1: Create organization first...');
  const orgSlug = `test-org-${uuid}`;
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: `Test Org ${uuid}`,
      slug: orgSlug,
      type: 'restaurant',
    })
    .select()
    .single();

  if (orgError) {
    console.log('  FAILED:', orgError.message);
    return;
  }
  console.log('  SUCCESS: Created org', org.id);

  // Step 2: Create user via Admin API
  // The trigger will fire and try to create ANOTHER org/profile
  // This might cause conflicts
  console.log('\nStep 2: Create user via Admin API...');
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: 'TestPassword123!',
    email_confirm: true,
    user_metadata: {
      full_name: `Test User ${uuid}`,
    },
  });

  if (authError) {
    console.log('  FAILED:', authError.message);
    console.log('  Status:', authError.status);

    // The trigger is causing this to fail
    // Let's check if we can disable the trigger somehow
    console.log('\n  The trigger is causing failure.');
    console.log('  We need to either:');
    console.log('  1. Fix the trigger in Supabase Dashboard');
    console.log('  2. Or delete the trigger temporarily');

    // Cleanup
    await supabase.from('organizations').delete().eq('id', org.id);
    console.log('\nCleaned up org');
    return;
  }

  console.log('  SUCCESS: Created user', authData.user?.id);

  // Check what the trigger created
  console.log('\nStep 3: Check what trigger created...');
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  const { data: members } = await supabase
    .from('organization_members')
    .select('*, organizations(*)')
    .eq('user_id', authData.user.id);

  console.log('  Profile:', profile ? 'EXISTS' : 'MISSING');
  console.log('  Members:', members?.length || 0);

  if (members && members.length > 0) {
    console.log('  Trigger-created org:', members[0].organizations?.name);
  }

  // Cleanup
  console.log('\nStep 4: Cleanup...');
  await supabase.from('organization_members').delete().eq('user_id', authData.user.id);
  await supabase.from('profiles').delete().eq('id', authData.user.id);
  await supabase.auth.admin.deleteUser(authData.user.id);

  // Delete both orgs (the one we created and the one the trigger created)
  if (members && members.length > 0) {
    await supabase.from('organizations').delete().eq('id', members[0].organization_id);
  }
  await supabase.from('organizations').delete().eq('id', org.id);
  console.log('  Cleanup complete');
}

testManualCreation().catch(console.error);
