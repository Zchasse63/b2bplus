import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkMigrations() {
  console.log('Checking database state...\n');

  // Check if the trigger exists by trying to see if new users are set up correctly
  // Get a real user from the database
  const { data: users } = await supabase.auth.admin.listUsers({ perPage: 1 });

  if (users?.users?.length > 0) {
    const testUser = users.users[0];
    console.log('Found existing user:', testUser.email);

    // Check if they have a profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', testUser.id)
      .single();

    if (profileError) {
      console.log('Profile lookup error:', profileError.message);
      console.log('\n⚠️  The user does not have a profile!');
      console.log('This suggests the trigger is NOT working or was never applied.');
    } else {
      console.log('User has profile:', profile);
    }

    // Check if they have org membership
    const { data: membership, error: memberError } = await supabase
      .from('organization_members')
      .select('*, organizations(*)')
      .eq('user_id', testUser.id)
      .single();

    if (memberError) {
      console.log('Membership lookup error:', memberError.message);
      console.log('\n⚠️  The user does not have org membership!');
    } else {
      console.log('User has membership:', membership);
    }
  } else {
    console.log('No existing users found');
  }

  // Check schema_migrations table
  console.log('\n\nChecking schema_migrations table...');
  const { data: migrations, error: migError } = await supabase
    .from('schema_migrations')
    .select('*')
    .order('version', { ascending: false })
    .limit(10);

  if (migError) {
    console.log('Cannot access schema_migrations:', migError.message);
    console.log('(This table might not exist or have different name)');
  } else {
    console.log('Recent migrations:', migrations);
  }
}

checkMigrations().catch(console.error);
