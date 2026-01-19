import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { randomUUID } from 'crypto';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testUniqueUser() {
  const uuid = randomUUID().replace(/-/g, '').slice(0, 12);
  const email = `unique-${uuid}@example.com`;
  const fullName = `Unique User ${uuid}`;

  console.log('Testing user creation with guaranteed unique slug...');
  console.log(`Email: ${email}`);
  console.log(`Full Name: ${fullName}`);

  // Calculate expected slug
  const expectedSlug = fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-s-organization';
  console.log(`Expected slug: ${expectedSlug}\n`);

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: 'TestPassword123!',
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
  });

  if (error) {
    console.log('FAILED:', error.message);
    console.log('Status:', error.status);
    console.log('Full error:', JSON.stringify(error, null, 2));

    // The error is generic - the trigger might be failing silently
    // Let's check if the user was partially created
    console.log('\nChecking if user was partially created...');
    const { data: users } = await supabase.auth.admin.listUsers();
    const partialUser = users?.users?.find(u => u.email === email);
    if (partialUser) {
      console.log('User WAS created in auth.users:', partialUser.id);
      console.log('Trigger failure is preventing the API from returning success');

      // Check what was created
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', partialUser.id)
        .single();
      console.log('Profile exists:', !!profile);

      const { data: member } = await supabase
        .from('organization_members')
        .select('*')
        .eq('user_id', partialUser.id)
        .single();
      console.log('Organization member exists:', !!member);

      // Cleanup
      await supabase.auth.admin.deleteUser(partialUser.id);
      console.log('Cleaned up partial user');
    } else {
      console.log('User was NOT created at all');
    }
  } else {
    console.log('SUCCESS! User created:', data.user?.id);

    // Verify everything was created
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
    console.log('Profile:', profile ? 'EXISTS' : 'MISSING');

    const { data: member } = await supabase
      .from('organization_members')
      .select('*, organizations(*)')
      .eq('user_id', data.user.id)
      .single();
    console.log('Member:', member ? 'EXISTS' : 'MISSING');
    if (member) {
      console.log('Organization:', member.organizations?.name);
    }

    // Cleanup
    if (member?.organization_id) {
      await supabase.from('organization_members').delete().eq('user_id', data.user.id);
      await supabase.from('profiles').delete().eq('id', data.user.id);
      await supabase.from('organizations').delete().eq('id', member.organization_id);
    }
    await supabase.auth.admin.deleteUser(data.user.id);
    console.log('Cleaned up test user');
  }
}

testUniqueUser().catch(console.error);
